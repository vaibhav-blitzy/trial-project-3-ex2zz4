import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate, Index } from 'typeorm'; // v0.3.x
import { hash, compare } from 'argon2'; // v0.30.x
import { IsEmail, Length, IsBoolean, IsDate, ValidateNested } from 'class-validator'; // v0.14.x
import { authenticator } from 'otplib'; // v12.x
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { IAuthUser, UserRole } from '../../../shared/interfaces/auth.interface';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || randomBytes(32);
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || randomBytes(16);
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @IsEmail()
    email: string;

    @Column({ select: false })
    @Length(12, 128)
    password: string;

    @Column({ 
        type: 'enum',
        enum: UserRole
    })
    role: UserRole;

    @Column('simple-array')
    permissions: string[];

    @Column()
    @IsBoolean()
    mfaEnabled: boolean;

    @Column({ nullable: true, select: false })
    mfaSecret: string;

    @Column({ default: 0 })
    failedLoginAttempts: number;

    @Column()
    @IsDate()
    lastLoginAt: Date;

    @Column()
    @IsDate()
    passwordChangedAt: Date;

    @Column()
    @IsDate()
    createdAt: Date;

    @Column()
    @IsDate()
    updatedAt: Date;

    constructor(userData?: Partial<User>) {
        if (userData) {
            Object.assign(this, userData);
        }
        this.role = userData?.role || UserRole.GUEST;
        this.permissions = userData?.permissions || [];
        this.mfaEnabled = userData?.mfaEnabled || false;
        this.failedLoginAttempts = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.lastLoginAt = new Date();
        this.passwordChangedAt = new Date();
    }

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.password) {
            this.password = await hash(this.password, {
                type: 2, // Argon2id
                memoryCost: 65536, // 64MB
                timeCost: 3,
                parallelism: 4
            });
            this.passwordChangedAt = new Date();
        }
    }

    async comparePassword(password: string): Promise<boolean> {
        try {
            const isValid = await compare(password, this.password);
            if (!isValid) {
                this.failedLoginAttempts += 1;
            } else {
                this.failedLoginAttempts = 0;
                this.lastLoginAt = new Date();
            }
            return isValid;
        } catch (error) {
            return false;
        }
    }

    async generateMfaSecret(): Promise<string> {
        const secret = authenticator.generateSecret();
        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
        const encrypted = Buffer.concat([
            cipher.update(secret, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        this.mfaSecret = `${encrypted.toString('hex')}:${authTag.toString('hex')}`;
        return secret;
    }

    async verifyMfaToken(token: string): Promise<boolean> {
        try {
            const [encrypted, authTag] = this.mfaSecret.split(':');
            const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, ENCRYPTION_IV);
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encrypted, 'hex')),
                decipher.final()
            ]).toString('utf8');

            return authenticator.verify({
                token,
                secret: decrypted
            });
        } catch (error) {
            return false;
        }
    }

    toAuthUser(): IAuthUser {
        return {
            id: this.id,
            email: this.email,
            role: this.role,
            permissions: this.permissions,
            mfaEnabled: this.mfaEnabled,
            lastLoginAt: this.lastLoginAt
        };
    }
}