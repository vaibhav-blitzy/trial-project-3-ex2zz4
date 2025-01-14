/**
 * Test seed file for projects with comprehensive test scenarios
 * Version: 1.0.0
 */

import { Knex } from 'knex'; // v2.4.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ProjectStatus } from '../../shared/interfaces/project.interface';

// Test project data with diverse configurations
const TEST_PROJECTS = [
  {
    id: uuidv4(),
    name: 'Planning Phase Project',
    description: 'Test project in planning phase with basic configuration',
    status: ProjectStatus.PLANNING,
    teamId: uuidv4(),
    ownerId: uuidv4(),
    memberIds: [uuidv4(), uuidv4()],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    settings: {
      isPublic: false,
      allowExternalSharing: false,
      notifications: {
        emailNotifications: true,
        inAppNotifications: true,
        notifyOnTaskUpdates: true,
        notifyOnComments: true,
        notifyOnMemberChanges: true,
        digestFrequency: 'DAILY'
      },
      permissions: {
        allowGuestAccess: false,
        memberInviteRole: 'TEAM_MEMBER',
        taskCreationRole: 'TEAM_MEMBER',
        commentingRole: 'TEAM_MEMBER',
        fileUploadRole: 'TEAM_MEMBER',
        customRoles: {}
      },
      customFields: {
        fields: []
      }
    },
    metadata: {
      category: 'Development',
      tags: ['planning', 'setup'],
      priority: 'HIGH',
      customData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  },
  {
    id: uuidv4(),
    name: 'Active Complex Project',
    description: 'Test project with full feature utilization and complex settings',
    status: ProjectStatus.ACTIVE,
    teamId: uuidv4(),
    ownerId: uuidv4(),
    memberIds: [uuidv4(), uuidv4(), uuidv4(), uuidv4()],
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-12-31'),
    settings: {
      isPublic: true,
      allowExternalSharing: true,
      notifications: {
        emailNotifications: true,
        inAppNotifications: true,
        notifyOnTaskUpdates: true,
        notifyOnComments: true,
        notifyOnMemberChanges: true,
        digestFrequency: 'WEEKLY'
      },
      permissions: {
        allowGuestAccess: true,
        memberInviteRole: 'PROJECT_MANAGER',
        taskCreationRole: 'TEAM_MEMBER',
        commentingRole: 'GUEST',
        fileUploadRole: 'TEAM_MEMBER',
        customRoles: {
          'REVIEWER': ['view_tasks', 'comment', 'approve'],
          'CONTRIBUTOR': ['create_tasks', 'edit_tasks', 'upload_files']
        }
      },
      customFields: {
        fields: [
          {
            id: uuidv4(),
            name: 'Risk Level',
            type: 'ENUM',
            required: true,
            options: ['Low', 'Medium', 'High'],
            defaultValue: 'Low'
          },
          {
            id: uuidv4(),
            name: 'Client ID',
            type: 'TEXT',
            required: true
          }
        ]
      }
    },
    metadata: {
      category: 'Enterprise',
      tags: ['active', 'complex', 'client'],
      priority: 'CRITICAL',
      customData: {
        clientName: 'Enterprise Corp',
        contractId: 'CNT-2024-001'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    }
  },
  {
    id: uuidv4(),
    name: 'Completed Project',
    description: 'Test project with completion metrics and historical data',
    status: ProjectStatus.COMPLETED,
    teamId: uuidv4(),
    ownerId: uuidv4(),
    memberIds: [uuidv4(), uuidv4()],
    startDate: new Date('2023-07-01'),
    endDate: new Date('2023-12-31'),
    settings: {
      isPublic: false,
      allowExternalSharing: false,
      notifications: {
        emailNotifications: false,
        inAppNotifications: true,
        notifyOnTaskUpdates: false,
        notifyOnComments: false,
        notifyOnMemberChanges: false,
        digestFrequency: 'NONE'
      },
      permissions: {
        allowGuestAccess: false,
        memberInviteRole: 'TEAM_MEMBER',
        taskCreationRole: 'PROJECT_MANAGER',
        commentingRole: 'TEAM_MEMBER',
        fileUploadRole: 'PROJECT_MANAGER',
        customRoles: {}
      },
      customFields: {
        fields: [
          {
            id: uuidv4(),
            name: 'Completion Date',
            type: 'DATE',
            required: true
          }
        ]
      }
    },
    metadata: {
      category: 'Internal',
      tags: ['completed', 'archived'],
      priority: 'LOW',
      customData: {
        completionReport: 'PROJ-2023-FINAL',
        archiveDate: new Date('2024-01-15')
      },
      createdAt: new Date('2023-07-01'),
      updatedAt: new Date('2023-12-31'),
      version: 2
    }
  }
];

/**
 * Seeds the database with test project data
 * @param knex - Knex instance
 */
export async function seed(knex: Knex): Promise<void> {
  // Clean existing entries
  await knex('projects').del();

  // Insert test projects within a transaction
  await knex.transaction(async (trx) => {
    try {
      // Insert all test projects
      await trx('projects').insert(TEST_PROJECTS);

      // Verify insertion
      const count = await trx('projects').count('id as count').first();
      if (count?.count !== TEST_PROJECTS.length) {
        throw new Error('Failed to insert all test projects');
      }

    } catch (error) {
      // Rollback on error
      await trx.rollback();
      throw error;
    }
  });
}

export default seed;