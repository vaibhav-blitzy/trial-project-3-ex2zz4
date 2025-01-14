import React, { useState, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import QRCode from 'qrcode.react';
import zxcvbn from 'zxcvbn';

import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useNotification } from '../../hooks/useNotification';
import { COLORS, SPACING, TYPOGRAPHY, TRANSITIONS } from '../../constants/theme.constants';

// Styled components with Material Design 3.0 principles
const SecurityContainer = styled.div`
  padding: ${SPACING.scale[6]};
  max-width: 800px;
  margin: 0 auto;
`;

const SecuritySection = styled.section`
  background: ${({ theme }) => theme.background.paper};
  border-radius: 8px;
  padding: ${SPACING.scale[6]};
  margin-bottom: ${SPACING.scale[6]};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut};

  h2 {
    font-family: ${TYPOGRAPHY.fontFamilies.primary};
    font-size: ${TYPOGRAPHY.fontSizes.xl};
    margin-bottom: ${SPACING.scale[4]};
    color: ${({ theme }) => theme.text.primary};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${SPACING.scale[4]};
`;

const QRCodeContainer = styled.div`
  padding: ${SPACING.scale[4]};
  background: white;
  border-radius: 4px;
  display: inline-block;
  margin: ${SPACING.scale[4]} 0;
`;

const SessionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${SPACING.scale[4]} 0;
`;

const SessionItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${SPACING.scale[3]};
  border-bottom: 1px solid ${({ theme }) => theme.background.default};

  &:last-child {
    border-bottom: none;
  }
`;

interface SecurityPageProps {}

const SecurityPage: React.FC<SecurityPageProps> = React.memo(() => {
  const { user, verifyMfa, updatePassword, generateMfaSecret, terminateSession } = useAuth();
  const { addNotification } = useNotification();

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Handle password change with validation
  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate password strength
      const strength = zxcvbn(newPassword);
      if (strength.score < 3) {
        throw new Error('Password is too weak. Please choose a stronger password.');
      }

      // Validate password match
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match.');
      }

      await updatePassword(currentPassword, newPassword);
      
      addNotification({
        type: 'success',
        message: 'Password updated successfully',
        autoHide: true,
        duration: 5000
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update password',
        autoHide: true,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, updatePassword, addNotification]);

  // Handle MFA setup
  const handleMfaSetup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!mfaSecret) {
        const secret = await generateMfaSecret();
        setMfaSecret(secret);
        return;
      }

      const success = await verifyMfa(mfaCode);
      if (success) {
        addNotification({
          type: 'success',
          message: 'MFA enabled successfully',
          autoHide: true,
          duration: 5000
        });
        setMfaCode('');
        setMfaSecret(null);
      } else {
        throw new Error('Invalid MFA code');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to setup MFA',
        autoHide: true,
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  }, [mfaCode, mfaSecret, generateMfaSecret, verifyMfa, addNotification]);

  // Update password strength indicator
  useEffect(() => {
    if (newPassword) {
      const result = zxcvbn(newPassword);
      setPasswordStrength(result.score);
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  return (
    <SecurityContainer>
      <SecuritySection>
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange}>
          <FormGroup>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current Password"
              required
              aria-label="Current Password"
            />
          </FormGroup>
          <FormGroup>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              aria-label="New Password"
              error={newPassword && passwordStrength < 3 ? 'Password is too weak' : undefined}
            />
          </FormGroup>
          <FormGroup>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              required
              aria-label="Confirm New Password"
              error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
            />
          </FormGroup>
          <Button
            type="submit"
            variant="PRIMARY"
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            loading={isLoading}
            aria-label="Update Password"
          >
            Update Password
          </Button>
        </form>
      </SecuritySection>

      <SecuritySection>
        <h2>Two-Factor Authentication</h2>
        {!user?.mfaEnabled ? (
          <form onSubmit={handleMfaSetup}>
            {mfaSecret && (
              <QRCodeContainer>
                <QRCode
                  value={`otpauth://totp/TaskManagement:${user?.email}?secret=${mfaSecret}&issuer=TaskManagement`}
                  size={200}
                  level="H"
                />
              </QRCodeContainer>
            )}
            {mfaSecret && (
              <FormGroup>
                <Input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter MFA Code"
                  required
                  aria-label="MFA Code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                />
              </FormGroup>
            )}
            <Button
              type="submit"
              variant="PRIMARY"
              disabled={isLoading || (mfaSecret && !mfaCode)}
              loading={isLoading}
              aria-label={mfaSecret ? "Verify MFA Code" : "Setup MFA"}
            >
              {mfaSecret ? "Verify MFA Code" : "Setup MFA"}
            </Button>
          </form>
        ) : (
          <p>Two-factor authentication is enabled for your account.</p>
        )}
      </SecuritySection>

      <SecuritySection>
        <h2>Active Sessions</h2>
        <SessionList>
          {user?.sessions?.map((session) => (
            <SessionItem key={session.id}>
              <div>
                <p>{session.deviceInfo}</p>
                <small>{new Date(session.lastActive).toLocaleString()}</small>
              </div>
              <Button
                variant="OUTLINED"
                onClick={() => terminateSession(session.id)}
                disabled={isLoading}
                aria-label="Terminate Session"
              >
                Terminate
              </Button>
            </SessionItem>
          ))}
        </SessionList>
      </SecuritySection>
    </SecurityContainer>
  );
});

SecurityPage.displayName = 'SecurityPage';

export default SecurityPage;