/**
 * Project Service
 * Handles all project-related operations with real-time updates support
 * @version 1.0.0
 */

import { io, Socket } from 'socket.io-client'; // ^4.5.0
import { debounce } from 'lodash'; // ^4.17.21
import { ApiService } from './api.service';
import { IProject } from '../interfaces/project.interface';
import { API_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, PaginatedResponse } from '../types/api.types';
import { Priority, Status } from '../types/common.types';

/**
 * Interface for project update event data
 */
interface ProjectUpdateEvent {
    projectId: string;
    changes: Partial<IProject>;
    timestamp: string;
}

/**
 * Project service class for managing project operations
 */
export class ProjectService {
    private readonly socket: Socket;
    private readonly projectCache: Map<string, IProject>;
    private readonly updateDebounceTime = 500;

    constructor(private readonly apiService: ApiService) {
        this.socket = io(`${process.env.REACT_APP_WS_URL}/projects`, {
            transports: ['websocket'],
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.projectCache = new Map();
        this.setupSocketListeners();
    }

    /**
     * Retrieves all projects with pagination support
     * @param page Page number
     * @param limit Items per page
     * @returns Promise resolving to paginated project list
     */
    public async getAllProjects(
        page: number = 1,
        limit: number = 10
    ): Promise<ApiResponse<PaginatedResponse<IProject>>> {
        const response = await this.apiService.get<PaginatedResponse<IProject>>(
            API_ENDPOINTS.PROJECTS.GET_ALL,
            { page, limit }
        );

        if (response.success) {
            response.data.items.forEach(project => {
                this.projectCache.set(project.id, project);
            });
        }

        return response;
    }

    /**
     * Creates a new project
     * @param project Project data
     * @returns Promise resolving to created project
     */
    public async createProject(project: Omit<IProject, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ApiResponse<IProject>> {
        const response = await this.apiService.post<IProject>(
            API_ENDPOINTS.PROJECTS.CREATE,
            {
                ...project,
                status: Status.ACTIVE,
                progress: 0
            }
        );

        if (response.success) {
            this.projectCache.set(response.data.id, response.data);
            this.socket.emit('project:created', response.data);
        }

        return response;
    }

    /**
     * Updates an existing project
     * @param projectId Project ID
     * @param updates Project updates
     * @returns Promise resolving to updated project
     */
    public async updateProject(
        projectId: string,
        updates: Partial<IProject>
    ): Promise<ApiResponse<IProject>> {
        const debouncedUpdate = debounce(async () => {
            const response = await this.apiService.put<IProject>(
                API_ENDPOINTS.PROJECTS.UPDATE.replace(':id', projectId),
                updates
            );

            if (response.success) {
                this.projectCache.set(projectId, response.data);
                this.socket.emit('project:updated', {
                    projectId,
                    changes: updates,
                    timestamp: new Date().toISOString()
                });
            }

            return response;
        }, this.updateDebounceTime);

        return debouncedUpdate();
    }

    /**
     * Deletes a project
     * @param projectId Project ID
     * @returns Promise resolving to deletion status
     */
    public async deleteProject(projectId: string): Promise<ApiResponse<void>> {
        const response = await this.apiService.delete<void>(
            API_ENDPOINTS.PROJECTS.DELETE.replace(':id', projectId)
        );

        if (response.success) {
            this.projectCache.delete(projectId);
            this.socket.emit('project:deleted', { projectId });
        }

        return response;
    }

    /**
     * Manages project members
     * @param projectId Project ID
     * @param memberIds Member IDs to add/remove
     * @param action 'add' or 'remove'
     * @returns Promise resolving to updated project
     */
    public async manageProjectMembers(
        projectId: string,
        memberIds: string[],
        action: 'add' | 'remove'
    ): Promise<ApiResponse<IProject>> {
        const endpoint = API_ENDPOINTS.PROJECTS.MEMBERS.replace(':id', projectId);
        const response = await this.apiService.post<IProject>(endpoint, {
            memberIds,
            action
        });

        if (response.success) {
            this.projectCache.set(projectId, response.data);
            this.socket.emit('project:members-updated', {
                projectId,
                memberIds,
                action,
                timestamp: new Date().toISOString()
            });
        }

        return response;
    }

    /**
     * Updates project progress
     * @param projectId Project ID
     * @param progress Progress percentage (0-100)
     * @returns Promise resolving to updated project
     */
    public async updateProjectProgress(
        projectId: string,
        progress: number
    ): Promise<ApiResponse<IProject>> {
        return this.updateProject(projectId, { progress });
    }

    /**
     * Subscribes to real-time project updates
     * @param projectId Project ID
     * @param callback Callback function for updates
     * @returns Cleanup function
     */
    public subscribeToProjectUpdates(
        projectId: string,
        callback: (update: ProjectUpdateEvent) => void
    ): () => void {
        const channel = `project:${projectId}`;
        this.socket.connect();
        this.socket.emit('subscribe', { projectId });

        const handleUpdate = (update: ProjectUpdateEvent) => {
            if (update.projectId === projectId) {
                const cachedProject = this.projectCache.get(projectId);
                if (cachedProject) {
                    this.projectCache.set(projectId, {
                        ...cachedProject,
                        ...update.changes
                    });
                }
                callback(update);
            }
        };

        this.socket.on(channel, handleUpdate);

        return () => {
            this.socket.off(channel, handleUpdate);
            this.socket.emit('unsubscribe', { projectId });
        };
    }

    /**
     * Sets up WebSocket event listeners
     */
    private setupSocketListeners(): void {
        this.socket.on('connect', () => {
            console.log('Connected to project updates');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from project updates');
        });

        this.socket.on('error', (error) => {
            console.error('Project socket error:', error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`Reconnected to project updates (attempt ${attemptNumber})`);
        });
    }
}

// Export singleton instance
export const projectService = new ProjectService(new ApiService());