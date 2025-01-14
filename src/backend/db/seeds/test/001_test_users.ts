import { Knex } from 'knex'; // v2.4.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { User } from '../../services/auth-service/src/models/user.model';
import { UserRole } from '../../shared/interfaces/auth.interface';
import { DatabaseConnection } from '../../shared/utils/database.util';

/**
 * Test users with comprehensive authentication and authorization configurations
 */
const TEST_USERS = [
  // Standard password-based users for each role
  {
    id: uuidv4(),
    email: 'admin@test.com',
    password: 'Admin@123456',
    role: UserRole.ADMIN,
    permissions: ['*'],
    authMethod: 'password',
    mfaEnabled: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: uuidv4(),
    email: 'pm@test.com',
    password: 'Manager@123456',
    role: UserRole.PROJECT_MANAGER,
    permissions: ['create:task', 'read:task', 'update:task', 'delete:task', 'read:project', 'update:project'],
    authMethod: 'password',
    mfaEnabled: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: uuidv4(),
    email: 'member@test.com',
    password: 'Member@123456',
    role: UserRole.TEAM_MEMBER,
    permissions: ['create:task', 'read:task', 'update:task'],
    authMethod: 'password',
    mfaEnabled: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: uuidv4(),
    email: 'guest@test.com',
    password: 'Guest@123456',
    role: UserRole.GUEST,
    permissions: ['read:task'],
    authMethod: 'password',
    mfaEnabled: false,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  // OAuth test user
  {
    id: uuidv4(),
    email: 'oauth@test.com',
    password: null,
    role: UserRole.TEAM_MEMBER,
    permissions: ['create:task', 'read:task', 'update:task'],
    authMethod: 'oauth',
    mfaEnabled: false,
    oauthProvider: 'google',
    oauthId: 'oauth_test_id_123',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  // MFA-enabled user
  {
    id: uuidv4(),
    email: 'mfa@test.com',
    password: 'Mfa@123456',
    role: UserRole.PROJECT_MANAGER,
    permissions: ['create:task', 'read:task', 'update:task', 'delete:task'],
    authMethod: 'password',
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP', // Test TOTP secret
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  // API key user for service authentication
  {
    id: uuidv4(),
    email: 'service@test.com',
    password: null,
    role: UserRole.ADMIN,
    permissions: ['*'],
    authMethod: 'apikey',
    mfaEnabled: false,
    apiKey: 'test_api_key_xyz_123',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }
];

/**
 * Seeds the database with test users covering all authentication methods and roles
 */
export async function seed(knex: Knex): Promise<void> {
  try {
    // Begin transaction for atomic operation
    const trx = await knex.transaction();

    try {
      // Clear existing test users
      await trx('users').del();

      // Create User instances and hash passwords where applicable
      const userInstances = await Promise.all(
        TEST_USERS.map(async (userData) => {
          if (userData.authMethod === 'password') {
            const user = new User(userData);
            await user.hashPassword();
            return {
              ...userData,
              password: user.password
            };
          }
          return userData;
        })
      );

      // Insert test users
      await trx('users').insert(userInstances);

      // Commit transaction
      await trx.commit();
    } catch (error) {
      // Rollback on error
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error seeding test users:', error);
    throw error;
  }
}

export default { seed };