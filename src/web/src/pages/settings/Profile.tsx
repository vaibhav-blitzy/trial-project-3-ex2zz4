/**
 * Profile Settings Page Component
 * Version: 1.0.0
 * 
 * Implements comprehensive user profile management with enhanced security features
 * and accessibility following Material Design 3.0 principles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  Paper,
  Box,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';

// Internal imports
import {
  IUser,
  IUserProfile,
  IUserPreferences,
  ISecuritySettings
} from '../../interfaces/user.interface';
import { Input, FileUpload } from '../../components/common/Input';
import { AuthService } from '../../services/auth.service';

// Interface for form state management
interface ProfileFormState {
  profile: IUserProfile;
  preferences: IUserPreferences;
  securitySettings: ISecuritySettings;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  activeTab: number;
  validationErrors: Record<string, string>;
}

/**
 * Enhanced Profile Settings Component
 * Provides comprehensive profile management with security features
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authService = new AuthService(null); // Initialize with API service

  // Component state
  const [state, setState] = useState<ProfileFormState>({
    profile: {} as IUserProfile,
    preferences: {} as IUserPreferences,
    securitySettings: {} as ISecuritySettings,
    isLoading: true,
    error: null,
    success: null,
    activeTab: 0,
    validationErrors: {}
  });

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Load profile data here
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load profile data'
        }));
      }
    };

    loadProfileData();
  }, [navigate]);

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setState(prev => ({ ...prev, activeTab: newValue }));
  };

  // Handle profile updates with validation
  const handleProfileUpdate = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate form data
      const validationErrors = validateProfileData(state.profile);
      if (Object.keys(validationErrors).length > 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          validationErrors
        }));
        return;
      }

      // Update profile logic here
      setState(prev => ({
        ...prev,
        isLoading: false,
        success: 'Profile updated successfully'
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to update profile'
      }));
    }
  }, [state.profile]);

  // Handle security settings update
  const handleSecurityUpdate = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Update security settings logic here
      const { mfaEnabled, mfaMethod } = state.securitySettings;
      if (mfaEnabled) {
        await authService.configureMFA(mfaMethod);
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        success: 'Security settings updated successfully'
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to update security settings'
      }));
    }
  }, [state.securitySettings]);

  // Render profile form
  const renderProfileForm = () => (
    <form onSubmit={handleProfileUpdate} aria-label="Profile Settings Form">
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Input
            name="firstName"
            value={state.profile.user?.firstName || ''}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={state.validationErrors.firstName}
            required
            fullWidth
            label="First Name"
            autoComplete="given-name"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            name="lastName"
            value={state.profile.user?.lastName || ''}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            error={state.validationErrors.lastName}
            required
            fullWidth
            label="Last Name"
            autoComplete="family-name"
          />
        </Grid>
        <Grid item xs={12}>
          <Input
            name="email"
            type="email"
            value={state.profile.user?.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={state.validationErrors.email}
            required
            fullWidth
            label="Email"
            autoComplete="email"
          />
        </Grid>
        <Grid item xs={12}>
          <FileUpload
            accept="image/*"
            onChange={handleAvatarUpload}
            error={state.validationErrors.avatar}
            helperText="Upload profile picture (max 5MB)"
          />
        </Grid>
      </Grid>
    </form>
  );

  // Render security settings
  const renderSecuritySettings = () => (
    <form onSubmit={handleSecurityUpdate} aria-label="Security Settings Form">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={state.securitySettings.mfaEnabled}
                onChange={(e) => handleSecuritySettingChange('mfaEnabled', e.target.checked)}
                color="primary"
              />
            }
            label="Enable Two-Factor Authentication"
          />
        </Grid>
        <Grid item xs={12}>
          <Input
            type="password"
            name="currentPassword"
            value={state.securitySettings.currentPassword || ''}
            onChange={(e) => handleSecuritySettingChange('currentPassword', e.target.value)}
            error={state.validationErrors.currentPassword}
            fullWidth
            label="Current Password"
            autoComplete="current-password"
          />
        </Grid>
        <Grid item xs={12}>
          <Input
            type="password"
            name="newPassword"
            value={state.securitySettings.newPassword || ''}
            onChange={(e) => handleSecuritySettingChange('newPassword', e.target.value)}
            error={state.validationErrors.newPassword}
            fullWidth
            label="New Password"
            autoComplete="new-password"
          />
        </Grid>
      </Grid>
    </form>
  );

  // Render loading state
  if (state.isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>

        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {state.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {state.success}
          </Alert>
        )}

        <Tabs
          value={state.activeTab}
          onChange={handleTabChange}
          aria-label="Profile Settings Tabs"
          sx={{ mb: 3 }}
        >
          <Tab label="Profile" id="profile-tab" aria-controls="profile-panel" />
          <Tab label="Security" id="security-tab" aria-controls="security-panel" />
          <Tab label="Preferences" id="preferences-tab" aria-controls="preferences-panel" />
        </Tabs>

        <Box role="tabpanel" hidden={state.activeTab !== 0}>
          {state.activeTab === 0 && renderProfileForm()}
        </Box>

        <Box role="tabpanel" hidden={state.activeTab !== 1}>
          {state.activeTab === 1 && renderSecuritySettings()}
        </Box>

        <Box role="tabpanel" hidden={state.activeTab !== 2}>
          {state.activeTab === 2 && renderPreferencesForm()}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            aria-label="Cancel changes"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={state.activeTab === 1 ? handleSecurityUpdate : handleProfileUpdate}
            disabled={state.isLoading}
            aria-label="Save changes"
          >
            {state.isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

// Validation utility
const validateProfileData = (profile: IUserProfile): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!profile.user?.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!profile.user?.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!profile.user?.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(profile.user.email)) {
    errors.email = 'Invalid email address';
  }

  return errors;
};

export default Profile;