/**
 * @fileoverview Enterprise-grade team form component implementing Material Design 3.0
 * Provides comprehensive validation, accessibility, and theme support
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { debounce } from 'lodash';
import styled from '@emotion/styled';
import { ITeam } from '../../interfaces/team.interface';
import { validateTeamName, validateTeamDescription } from '../../validators/team.validator';
import Button from '../common/Button';
import Input from '../common/Input';
import { COLORS, SPACING, TRANSITIONS, TYPOGRAPHY } from '../../constants/theme.constants';

// Styled components with Material Design 3.0 principles
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.scale[4]};
  max-width: ${SPACING.layout.container.sm};
  width: 100%;
  padding: ${SPACING.scale[6]};
  background: ${({ theme }) => theme === 'dark' ? COLORS.dark.background.paper : COLORS.light.background.paper};
  border-radius: 8px;
  transition: all ${TRANSITIONS.duration.shorter} ${TRANSITIONS.easing.easeInOut};

  @media (max-width: ${SPACING.layout.container.sm}) {
    padding: ${SPACING.scale[4]};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${SPACING.scale[3]};
  margin-top: ${SPACING.scale[6]};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme === 'dark' ? COLORS.dark.text.primary : COLORS.light.text.primary};
  font-size: ${TYPOGRAPHY.fontSizes.sm};
  margin-top: ${SPACING.scale[2]};
  font-family: ${TYPOGRAPHY.fontFamilies.primary};
`;

// Interface definitions
interface TeamFormProps {
  initialData?: Partial<ITeam>;
  onSubmit: (data: ITeam) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  theme?: 'light' | 'dark';
  isAccessible?: boolean;
}

interface TeamFormData {
  name: string;
  description: string;
  memberCount: number;
}

/**
 * Enhanced team form component with real-time validation and accessibility
 */
const TeamForm: React.FC<TeamFormProps> = React.memo(({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  theme = 'light',
  isAccessible = true
}) => {
  // Form initialization with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    watch,
    setValue,
    trigger
  } = useForm<TeamFormData>({
    mode: 'onChange',
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      memberCount: initialData?.memberIds?.length || 0
    }
  });

  // Watch form values for real-time validation
  const watchedValues = watch();

  // Debounced validation
  const debouncedValidation = useMemo(
    () => debounce(async (name: string, description: string) => {
      const nameValidation = await validateTeamName(name);
      const descriptionValidation = await validateTeamDescription(description);

      if (!nameValidation.isValid) {
        setValue('name', name, { shouldValidate: true });
      }
      if (!descriptionValidation.isValid) {
        setValue('description', description, { shouldValidate: true });
      }
    }, 300),
    []
  );

  // Effect for real-time validation
  useEffect(() => {
    debouncedValidation(watchedValues.name, watchedValues.description);
  }, [watchedValues.name, watchedValues.description, debouncedValidation]);

  // Form submission handler
  const handleFormSubmit = useCallback(
    async (data: TeamFormData) => {
      try {
        await onSubmit({
          ...initialData,
          name: data.name,
          description: data.description,
          memberIds: initialData?.memberIds || []
        } as ITeam);
      } catch (error) {
        console.error('Team form submission error:', error);
      }
    },
    [initialData, onSubmit]
  );

  return (
    <FormContainer
      onSubmit={handleSubmit(handleFormSubmit)}
      theme={theme}
      aria-label="Team Form"
      noValidate
    >
      <Input
        {...register('name', {
          required: 'Team name is required',
          minLength: { value: 3, message: 'Team name must be at least 3 characters' },
          maxLength: { value: 50, message: 'Team name must not exceed 50 characters' }
        })}
        label="Team Name"
        error={errors.name?.message}
        disabled={isLoading}
        required
        aria-required="true"
        aria-invalid={Boolean(errors.name)}
        aria-describedby={errors.name ? 'name-error' : undefined}
        fullWidth
      />

      <Input
        {...register('description', {
          maxLength: { value: 500, message: 'Description must not exceed 500 characters' }
        })}
        label="Description"
        multiline
        rows={4}
        error={errors.description?.message}
        disabled={isLoading}
        aria-invalid={Boolean(errors.description)}
        aria-describedby={errors.description ? 'description-error' : undefined}
        fullWidth
      />

      <ButtonContainer>
        <Button
          variant="OUTLINED"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Cancel team form"
          type="button"
        >
          Cancel
        </Button>
        <Button
          variant="PRIMARY"
          type="submit"
          disabled={!isDirty || !isValid || isLoading}
          loading={isLoading}
          aria-label="Save team"
        >
          {initialData ? 'Update Team' : 'Create Team'}
        </Button>
      </ButtonContainer>

      {/* Accessibility announcement region */}
      {isAccessible && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {errors.name && `Team name error: ${errors.name.message}`}
          {errors.description && `Description error: ${errors.description.message}`}
        </div>
      )}
    </FormContainer>
  );
});

TeamForm.displayName = 'TeamForm';

export default TeamForm;