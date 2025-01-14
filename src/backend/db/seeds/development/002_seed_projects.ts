/**
 * Development seed file for populating the projects table with initial test data.
 * Version: 1.0.0
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { faker } from '@faker-js/faker'; // v8.0.0
import { Knex } from 'knex'; // v2.4.0
import { ProjectStatus, IProject, Priority, ProjectSettings, ProjectActivityType } from '../../shared/interfaces/project.interface';
import Logger from '../../shared/utils/logger.util';

// Constants for seed data generation
const SEED_PROJECTS: Array<{
  status: keyof typeof ProjectStatus;
  count: number;
  hasTeam: boolean;
  memberCount: string;
  dateRange: string;
}> = [
  { status: 'PLANNING', count: 2, hasTeam: true, memberCount: '3-5', dateRange: 'future' },
  { status: 'ACTIVE', count: 3, hasTeam: true, memberCount: '4-8', dateRange: 'current' },
  { status: 'ON_HOLD', count: 1, hasTeam: true, memberCount: '2-4', dateRange: 'mixed' },
  { status: 'COMPLETED', count: 2, hasTeam: true, memberCount: '3-6', dateRange: 'past' }
];

const DATE_RANGES = {
  PLANNING: { min: 'now', max: '+6 months' },
  ACTIVE: { min: '-1 month', max: '+3 months' },
  ON_HOLD: { min: '-2 months', max: '+4 months' },
  COMPLETED: { min: '-6 months', max: '-1 month' }
};

const BATCH_SIZE = 5;
const logger = Logger.getInstance('ProjectSeed', { enableConsole: true, enableFile: true });

/**
 * Creates a seed project with realistic data
 */
const createSeedProject = async (
  status: ProjectStatus,
  teamId: string,
  memberIds: string[]
): Promise<IProject> => {
  const dateRange = DATE_RANGES[status];
  const startDate = faker.date.between({ from: dateRange.min, to: dateRange.max });
  const endDate = faker.date.future({ years: 1, refDate: startDate });

  const settings: ProjectSettings = {
    isPublic: faker.datatype.boolean(),
    allowExternalSharing: faker.datatype.boolean(),
    notifications: {
      emailNotifications: true,
      inAppNotifications: true,
      notifyOnTaskUpdates: true,
      notifyOnComments: true,
      notifyOnMemberChanges: true,
      digestFrequency: faker.helpers.arrayElement(['NONE', 'DAILY', 'WEEKLY'])
    },
    permissions: {
      allowGuestAccess: faker.datatype.boolean(),
      memberInviteRole: 'TEAM_MEMBER',
      taskCreationRole: 'TEAM_MEMBER',
      commentingRole: 'TEAM_MEMBER',
      fileUploadRole: 'TEAM_MEMBER',
      customRoles: {}
    },
    customFields: {
      fields: []
    }
  };

  return {
    id: uuidv4(),
    name: `${faker.company.catchPhrase()} Project`,
    description: faker.lorem.paragraph(),
    status,
    teamId,
    ownerId: memberIds[0],
    memberIds: faker.helpers.arrayElements(memberIds, { min: 2, max: 5 }),
    startDate,
    endDate,
    settings,
    metadata: {
      category: faker.helpers.arrayElement(['Development', 'Marketing', 'Design', 'Research']),
      tags: faker.helpers.arrayElements(['urgent', 'high-priority', 'strategic', 'maintenance'], { min: 1, max: 3 }),
      priority: faker.helpers.arrayElement(Object.values(Priority)),
      customData: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Main seed function for populating projects table
 */
export async function seed(knex: Knex): Promise<void> {
  logger.info('Starting project seed data generation');

  try {
    // Clear existing projects
    await knex('projects').del();
    logger.info('Cleared existing project data');

    // Fetch existing teams and members for reference
    const teams = await knex('teams').select('id', 'memberIds');
    if (!teams.length) {
      throw new Error('No teams found for project assignment');
    }

    const projects: IProject[] = [];

    // Generate projects for each status category
    for (const seedConfig of SEED_PROJECTS) {
      for (let i = 0; i < seedConfig.count; i++) {
        const team = faker.helpers.arrayElement(teams);
        const project = await createSeedProject(
          ProjectStatus[seedConfig.status],
          team.id,
          team.memberIds
        );
        projects.push(project);
      }
    }

    // Insert projects in batches
    for (let i = 0; i < projects.length; i += BATCH_SIZE) {
      const batch = projects.slice(i, i + BATCH_SIZE);
      await knex('projects').insert(batch);
      logger.info(`Inserted batch of ${batch.length} projects`);
    }

    // Create project activity records
    const activities = projects.map(project => ({
      id: uuidv4(),
      projectId: project.id,
      userId: project.ownerId,
      type: ProjectActivityType.CREATED,
      details: {
        description: 'Project created',
        affectedUsers: project.memberIds
      },
      changes: {},
      timestamp: project.createdAt
    }));

    await knex('project_activities').insert(activities);
    logger.info(`Created ${activities.length} project activity records`);

    logger.info(`Successfully seeded ${projects.length} projects`);
  } catch (error) {
    logger.error('Failed to seed projects', { error });
    throw error;
  }
}