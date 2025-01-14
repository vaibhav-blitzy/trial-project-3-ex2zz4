/**
 * Project Settings Component
 * Version: 1.0.0
 * 
 * A secure and validated project settings management component implementing
 * Material Design 3.0 principles with comprehensive audit logging.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'; // ^18.0.0
import styled from '@emotion/styled'; // ^11.0.0
import { debounce } from 'lodash'; // ^4.17.21
import { toast } from 'react-toastify'; // ^9.0.0

import { IProject, IProjectSettings, IProjectAuditLog } from '../../interfaces/project.interface';
import { useAuth } from '../../hooks/useAuth';
import { SecurityLevel } from '../../interfaces/project.interface';

// Props interface with enhanced security and validation
interface ProjectSettingsProps {
  projectId: string;
  initialSettings: IProjectSettings;
  onSettingsUpdate: (settings: IProjectSettings) => Promise<void>;
  isReadOnly?: boolean;
  onAuditLog?: (log: IProjectAuditLog) => void;
}

// Styled components following Material Design 3.0
const SettingsForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  background: ${({ theme }) => theme.background.paper};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows[1]};
`;

const SettingsGroup = styled.div`
  border: 1px solid ${({ theme }) => theme.border.light};
  border-radius: 8px;
  padding: 1.5rem;
  background: ${({ theme }) => theme.background.default};
`;

const SettingField = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.text.primary};
  font-weight: 500;
`;

const ValidationMessage = styled.span`
  color: ${({ theme }) => theme.error.main};
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
`;

const AuditMessage = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 0.5rem;
`;

// Settings validation hook
const useSettingsValidation = (settings: IProjectSettings) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    // Validate security settings
    if (settings.allowGuestAccess && settings.isPrivate) {
      newErrors.guestAccess = 'Guest access cannot be enabled for private projects';
    }

    // Validate team size limits
    if (settings.maxTeamSize < 1 || settings.maxTeamSize > 100) {
      newErrors.maxTeamSize = 'Team size must be between 1 and 100 members';
    }

    // Validate security level combinations
    if (settings.securityLevel === SecurityLevel.PUBLIC && settings.isPrivate) {
      newErrors.securityLevel = 'Public security level conflicts with private project setting';
    }

    setErrors(newErrors);
  }, [settings]);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

export const ProjectSettings: React.FC<ProjectSettingsProps> = React.memo(({
  projectId,
  initialSettings,
  onSettingsUpdate,
  isReadOnly = false,
  onAuditLog
}) => {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<IProjectSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { errors, isValid } = useSettingsValidation(settings);
  const previousSettings = useRef<IProjectSettings>(initialSettings);

  // Debounced settings update
  const debouncedUpdate = useCallback(
    debounce(async (newSettings: IProjectSettings) => {
      try {
        setIsSaving(true);
        await onSettingsUpdate(newSettings);
        
        // Log audit trail
        if (onAuditLog) {
          const changes = Object.entries(newSettings).reduce((acc, [key, value]) => {
            if (previousSettings.current[key as keyof IProjectSettings] !== value) {
              acc[key] = {
                from: previousSettings.current[key as keyof IProjectSettings],
                to: value
              };
            }
            return acc;
          }, {} as Record<string, any>);

          onAuditLog({
            projectId,
            userId: 'current-user', // Replace with actual user ID from auth context
            action: 'UPDATE_SETTINGS',
            timestamp: new Date(),
            details: changes
          });
        }

        previousSettings.current = newSettings;
        toast.success('Settings updated successfully');
      } catch (error) {
        toast.error('Failed to update settings');
        console.error('Settings update error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 500),
    [projectId, onSettingsUpdate, onAuditLog]
  );

  // Handle settings change
  const handleSettingChange = useCallback((
    key: keyof IProjectSettings,
    value: any
  ) => {
    if (isReadOnly || !hasPermission('UPDATE_PROJECT_SETTINGS')) {
      return;
    }

    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      debouncedUpdate(newSettings);
      return newSettings;
    });
  }, [isReadOnly, hasPermission, debouncedUpdate]);

  if (!hasPermission('VIEW_PROJECT_SETTINGS')) {
    return <div>You don't have permission to view project settings</div>;
  }

  return (
    <SettingsForm aria-label="Project Settings">
      <SettingsGroup>
        <SettingField>
          <Label htmlFor="isPrivate">
            Project Privacy
          </Label>
          <input
            type="checkbox"
            id="isPrivate"
            checked={settings.isPrivate}
            onChange={e => handleSettingChange('isPrivate', e.target.checked)}
            disabled={isReadOnly}
            aria-describedby="isPrivate-error"
          />
          {errors.isPrivate && (
            <ValidationMessage id="isPrivate-error">
              {errors.isPrivate}
            </ValidationMessage>
          )}
        </SettingField>

        <SettingField>
          <Label htmlFor="allowGuestAccess">
            Guest Access
          </Label>
          <input
            type="checkbox"
            id="allowGuestAccess"
            checked={settings.allowGuestAccess}
            onChange={e => handleSettingChange('allowGuestAccess', e.target.checked)}
            disabled={isReadOnly || settings.isPrivate}
            aria-describedby="guestAccess-error"
          />
          {errors.guestAccess && (
            <ValidationMessage id="guestAccess-error">
              {errors.guestAccess}
            </ValidationMessage>
          )}
        </SettingField>

        <SettingField>
          <Label htmlFor="securityLevel">
            Security Level
          </Label>
          <select
            id="securityLevel"
            value={settings.securityLevel}
            onChange={e => handleSettingChange('securityLevel', e.target.value)}
            disabled={isReadOnly}
            aria-describedby="securityLevel-error"
          >
            {Object.values(SecurityLevel).map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {errors.securityLevel && (
            <ValidationMessage id="securityLevel-error">
              {errors.securityLevel}
            </ValidationMessage>
          )}
        </SettingField>

        <SettingField>
          <Label htmlFor="maxTeamSize">
            Maximum Team Size
          </Label>
          <input
            type="number"
            id="maxTeamSize"
            value={settings.maxTeamSize}
            onChange={e => handleSettingChange('maxTeamSize', parseInt(e.target.value, 10))}
            min={1}
            max={100}
            disabled={isReadOnly}
            aria-describedby="maxTeamSize-error"
          />
          {errors.maxTeamSize && (
            <ValidationMessage id="maxTeamSize-error">
              {errors.maxTeamSize}
            </ValidationMessage>
          )}
        </SettingField>

        <SettingField>
          <Label htmlFor="notificationsEnabled">
            Enable Notifications
          </Label>
          <input
            type="checkbox"
            id="notificationsEnabled"
            checked={settings.notificationsEnabled}
            onChange={e => handleSettingChange('notificationsEnabled', e.target.checked)}
            disabled={isReadOnly}
          />
        </SettingField>
      </SettingsGroup>

      {isSaving && (
        <AuditMessage>
          Saving changes...
        </AuditMessage>
      )}
    </SettingsForm>
  );
});

ProjectSettings.displayName = 'ProjectSettings';

export default ProjectSettings;