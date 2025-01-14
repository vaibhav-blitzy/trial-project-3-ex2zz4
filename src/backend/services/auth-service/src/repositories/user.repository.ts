import { Repository, EntityRepository, QueryRunner } from 'typeorm'; // v0.3.x
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import winston from 'winston'; // v3.8.x

import { User } from '../models/user.model';
import { IAuthUser, UserRole } from '../../../shared/interfaces/auth.interface';
import { DatabaseConnection } from '../../../shared/utils/database.util';
import { ErrorCodes } from '../../../shared/constants/error-codes';

// Encryption constants
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || randomBytes(32);
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || randomBytes(16);
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_RESET = new Map<string, number>();

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    private readonly dbConnection: DatabaseConnection;
    private readonly logger: winston.Logger;
    private readonly cipher: { key: Buffer; iv: Buffer };

    constructor(dbConnection: DatabaseConnection, logger: winston.Logger) {
        super();
        this.dbConnection = dbConnection;
        this.logger = logger;
        this.cipher = {
            key: Buffer.from(ENCRYPTION_KEY),
            iv: Buffer.from(ENCRYPTION_IV)
        };
    }

    /**
     * Find user by email with rate limiting and security checks
     */
    public async findByEmail(email: string): Promise<User | null> {
        try {
            // Check rate limiting
            if (this.isRateLimited(email)) {
                this.logger.warn('Rate limit exceeded for email', {
                    email: this.maskEmail(email),
                    code: ErrorCodes.INVALID_CREDENTIALS
                });
                return null;
            }

            const user = await this.findOne({
                where: { email: email.toLowerCase() },
                select: ['id', 'email', 'password', 'role', 'mfaEnabled', 'mfaSecret', 'failedLoginAttempts', 'lastLoginAt']
            });

            if (user?.mfaSecret) {
                user.mfaSecret = await this.decryptSensitiveData(user.mfaSecret);
            }

            this.logger.info('User lookup completed', {
                userId: user?.id,
                found: !!user
            });

            return user;
        } catch (error) {
            this.logger.error('Error finding user by email', {
                error,
                code: ErrorCodes.DATABASE_CONNECTION_ERROR
            });
            throw error;
        }
    }

    /**
     * Find user by ID with role-based access control
     */
    public async findById(id: string, requestingUserRole: UserRole): Promise<User | null> {
        try {
            // Validate access permissions
            if (!this.canAccessUserData(requestingUserRole)) {
                this.logger.warn('Unauthorized user data access attempt', {
                    requestingRole: requestingUserRole,
                    targetUserId: id,
                    code: ErrorCodes.INSUFFICIENT_PERMISSIONS
                });
                return null;
            }

            const user = await this.findOne({
                where: { id },
                select: ['id', 'email', 'role', 'mfaEnabled', 'lastLoginAt']
            });

            this.logger.info('User retrieved by ID', {
                userId: id,
                found: !!user
            });

            return user;
        } catch (error) {
            this.logger.error('Error finding user by ID', {
                error,
                userId: id,
                code: ErrorCodes.DATABASE_CONNECTION_ERROR
            });
            throw error;
        }
    }

    /**
     * Create new user with security measures
     */
    public async create(userData: Partial<User>): Promise<User> {
        const queryRunner = await this.dbConnection.getConnection().createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = new User(userData);

            // Encrypt sensitive data if MFA is enabled
            if (user.mfaEnabled && user.mfaSecret) {
                user.mfaSecret = await this.encryptSensitiveData(user.mfaSecret);
            }

            const savedUser = await queryRunner.manager.save(User, user);
            await queryRunner.commitTransaction();

            this.logger.info('New user created', {
                userId: savedUser.id,
                role: savedUser.role
            });

            return savedUser;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Error creating user', {
                error,
                code: ErrorCodes.DATABASE_CONNECTION_ERROR
            });
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Update MFA settings with encryption
     */
    public async updateMFAStatus(id: string, enabled: boolean, secret?: string): Promise<User> {
        const queryRunner = await this.dbConnection.getConnection().createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = await this.findOne({ where: { id } });
            if (!user) {
                throw new Error('User not found');
            }

            user.mfaEnabled = enabled;
            if (secret) {
                user.mfaSecret = await this.encryptSensitiveData(secret);
            }

            const updatedUser = await queryRunner.manager.save(User, user);
            await queryRunner.commitTransaction();

            this.logger.info('MFA status updated', {
                userId: id,
                enabled
            });

            return updatedUser;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Error updating MFA status', {
                error,
                userId: id,
                code: ErrorCodes.DATABASE_CONNECTION_ERROR
            });
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Update last login timestamp with audit logging
     */
    public async updateLastLogin(id: string): Promise<void> {
        try {
            await this.update(id, {
                lastLoginAt: new Date(),
                failedLoginAttempts: 0
            });

            this.logger.info('Last login timestamp updated', {
                userId: id,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Error updating last login', {
                error,
                userId: id,
                code: ErrorCodes.DATABASE_CONNECTION_ERROR
            });
            throw error;
        }
    }

    /**
     * Encrypt sensitive data using AES-256-GCM
     */
    private async encryptSensitiveData(data: string): Promise<string> {
        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.cipher.key, this.cipher.iv);
        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return `${encrypted.toString('hex')}:${authTag.toString('hex')}`;
    }

    /**
     * Decrypt sensitive data using AES-256-GCM
     */
    private async decryptSensitiveData(encryptedData: string): Promise<string> {
        const [encrypted, authTag] = encryptedData.split(':');
        const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.cipher.key, this.cipher.iv);
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        return Buffer.concat([
            decipher.update(Buffer.from(encrypted, 'hex')),
            decipher.final()
        ]).toString('utf8');
    }

    /**
     * Check rate limiting status
     */
    private isRateLimited(email: string): boolean {
        const now = Date.now();
        const lastAttempt = RATE_LIMIT_RESET.get(email) || 0;

        if (now - lastAttempt < RATE_LIMIT_WINDOW) {
            return true;
        }

        RATE_LIMIT_RESET.set(email, now);
        return false;
    }

    /**
     * Validate role-based access permissions
     */
    private canAccessUserData(role: UserRole): boolean {
        return [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(role);
    }

    /**
     * Mask email for logging
     */
    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        return `${local[0]}***@${domain}`;
    }
}