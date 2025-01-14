/**
 * Development seed file for populating users table with test data
 * Version: 1.0.0
 * Implements secure password hashing and proper role-based access control
 */

import { Knex } from 'knex'; // v2.4.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import * as argon2 from 'argon2'; // v0.30.3
import { UserRole } from '../../shared/interfaces/auth.interface';
import Logger from '../../shared/utils/logger.util';
import { ErrorCodes } from '../../shared/constants/error-codes';

// Secure Argon2id configuration following best practices
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 4096, // 4 GB
  timeCost: 3, // 3 iterations
  parallelism: 1,
  saltLength: 16
};

// Development seed data with role-based permissions
const SEED_USERS = [
  {
    role: UserRole.ADMIN,
    email: 'admin@taskmaster.dev',
    permissions: ['all'],
    metadata: {
      firstName: 'System',
      lastName: 'Administrator'
    }
  },
  {
    role: UserRole.PROJECT_MANAGER,
    email: 'pm1@taskmaster.dev',
    permissions: ['create', 'read', 'update', 'delete'],
    metadata: {
      firstName: 'Project',
      lastName: 'Manager'
    }
  },
  {
    role: UserRole.TEAM_MEMBER,
    email: 'member1@taskmaster.dev',
    permissions: ['create', 'read', 'update'],
    metadata: {
      firstName: 'Team',
      lastName: 'Member'
    }
  },
  {
    role: UserRole.GUEST,
    email: 'guest1@taskmaster.dev',
    permissions: ['read'],
    metadata: {
      firstName: 'Guest',
      lastName: 'User'
    }
  }
];

// Development password - would be randomly generated in production
const DEFAULT_PASSWORD = 'Dev123!@#';

// Logger instance for seed operations
const logger = Logger.getInstance('UserSeed', {
  enableConsole: true,
  enableFile: true
});

/**
 * Creates a seed user with secure password hashing
 */
async function createSeedUser(
  knex: Knex,
  userData: {
    email: string;
    role: UserRole;
    permissions: string[];
    metadata: Record<string, string>;
  }
): Promise<void> {
  try {
    // Generate secure UUID for user ID
    const userId = uuidv4();

    // Hash password using Argon2id with secure configurations
    const hashedPassword = await argon2.hash(DEFAULT_PASSWORD, ARGON2_CONFIG);

    // Prepare user object with proper typing
    const user = {
      id: userId,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      permissions: JSON.stringify(userData.permissions),
      metadata: JSON.stringify(userData.metadata),
      mfa_enabled: false,
      security_level: userData.role === UserRole.ADMIN ? 3 : 1,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: null
    };

    // Insert user with proper error handling
    await knex('users').insert(user);

    logger.info(`Created seed user: ${userData.email}`, {
      userId,
      role: userData.role
    });
  } catch (error) {
    logger.error('Failed to create seed user', {
      error,
      email: userData.email,
      code: ErrorCodes.DATABASE_CONNECTION_ERROR
    });
    throw error;
  }
}

/**
 * Main seed function for populating users table
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    logger.info('Starting user seed process');

    // Clear existing users in development
    await knex('users').del();
    logger.info('Cleared existing users');

    // Create seed users with proper error handling
    for (const userData of SEED_USERS) {
      await createSeedUser(knex, userData);
    }

    logger.info('User seed process completed successfully');
  } catch (error) {
    logger.error('User seed process failed', {
      error,
      code: ErrorCodes.DATABASE_CONNECTION_ERROR
    });
    throw error;
  }
}

export default seed;