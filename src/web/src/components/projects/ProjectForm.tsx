/**
 * @fileoverview Enterprise-grade project form component with Material Design 3.0
 * Implements comprehensive validation, accessibility, and internationalization
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { styled } from '@mui/material/styles'; // v5.0.0
import { 
  Button, 
  Grid, 
  MenuItem, 
  Select, 
  FormHelperText,
  CircularProgress 
} from '@mui/material'; // v5.0.0
import { useTranslation } from 'react-i18next'; // v12.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import sanitizeHtml from 'sanitize-html'; // v2.7.0

import Input from '../common/Input';
import DatePicker from '../common/DatePicker';
import useDebounce from '../../hooks/useDebounce';
import { Status, Priority } from '../../types/common.types';

// Styled components following Material Design 3.0
const FormContainer = styled('form')(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  '& .MuiGrid-item': {
    marginBottom: theme.spacing(2),
  },
}));

const ErrorMessage = styled(FormHelperText)(({ theme }) => ({
  color: theme.palette.error.main,
  marginTop: theme.spacing(1),
}));

interface IProject {
  id?: string;
  name: string;
  description: string;
  status: Status;
  priority: Priority;
  startDate: Date | null;
  endDate: Date | null;
  teamId: string;
}

interface ProjectFormProps {
  initialData?: Partial<IProject>;
  onSubmit: (project: IProject) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  className,
  disabled = false,
  autoFocus = true,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<IProject>>({
    name: '',
    description: '',
    status: Status.ACTIVE,
    priority: Priority.MEDIUM,
    startDate: null,
    endDate: null,
    teamId: '',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced validation for performance
  const debouncedValidation = useDebounce((field: string, value: any) => {
    validateField(field, value);
  }, 300);

  // Validation rules
  const validateField = useCallback((field: string, value: any): string => {
    switch (field) {
      case 'name':
        if (!value?.trim()) {
          return t('validation.required', { field: t('project.name') });
        }
        if (value.length < 3 || value.length > 100) {
          return t('validation.length', { field: t('project.name'), min: 3, max: 100 });
        }
        break;
      case 'description':
        if (value?.length > 1000) {
          return t('validation.maxLength', { field: t('project.description'), max: 1000 });
        }
        break;
      case 'startDate':
        if (!value) {
          return t('validation.required', { field: t('project.startDate') });
        }
        if (formData.endDate && value > formData.endDate) {
          return t('validation.dateRange.start');
        }
        break;
      case 'endDate':
        if (!value) {
          return t('validation.required', { field: t('project.endDate') });
        }
        if (formData.startDate && value < formData.startDate) {
          return t('validation.dateRange.end');
        }
        break;
      case 'teamId':
        if (!value) {
          return t('validation.required', { field: t('project.team') });
        }
        break;
    }
    return '';
  }, [formData.startDate, formData.endDate, t]);

  // Handle input changes with validation
  const handleInputChange = useCallback((field: string, value: any) => {
    // Sanitize string inputs
    const sanitizedValue = typeof value === 'string' ? 
      sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
      }) : value;

    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    setTouched(prev => ({ ...prev, [field]: true }));
    debouncedValidation(field, sanitizedValue);
  }, [debouncedValidation]);

  // Form submission handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const validationErrors: Record<string, string> = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        validationErrors[field] = error;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await onSubmit(formData as IProject);
    } catch (error) {
      setErrors({
        submit: t('error.submission'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary fallback={<div role="alert">{t('error.component')}</div>}>
      <FormContainer
        onSubmit={handleSubmit}
        className={className}
        noValidate
        aria-label={t('project.form.label')}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Input
              name="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={touched.name ? errors.name : undefined}
              required
              disabled={disabled || isLoading}
              autoFocus={autoFocus}
              maxLength={100}
              ariaLabel={t('project.name')}
              testId="project-name-input"
            />
          </Grid>

          <Grid item xs={12}>
            <Input
              name="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={touched.description ? errors.description : undefined}
              multiline
              rows={4}
              maxLength={1000}
              disabled={disabled || isLoading}
              ariaLabel={t('project.description')}
              testId="project-description-input"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              value={formData.startDate}
              onChange={(date) => handleInputChange('startDate', date)}
              label={t('project.startDate')}
              error={touched.startDate ? errors.startDate : undefined}
              required
              disabled={disabled || isLoading}
              testId="project-start-date"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              value={formData.endDate}
              onChange={(date) => handleInputChange('endDate', date)}
              label={t('project.endDate')}
              error={touched.endDate ? errors.endDate : undefined}
              required
              disabled={disabled || isLoading}
              minDate={formData.startDate || undefined}
              testId="project-end-date"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Select
              value={formData.status || Status.ACTIVE}
              onChange={(e) => handleInputChange('status', e.target.value)}
              disabled={disabled || isLoading}
              fullWidth
              aria-label={t('project.status')}
              data-testid="project-status-select"
            >
              {Object.values(Status).map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`status.${status.toLowerCase()}`)}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Select
              value={formData.priority || Priority.MEDIUM}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              disabled={disabled || isLoading}
              fullWidth
              aria-label={t('project.priority')}
              data-testid="project-priority-select"
            >
              {Object.values(Priority).map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {t(`priority.${priority.toLowerCase()}`)}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          {errors.submit && (
            <Grid item xs={12}>
              <ErrorMessage role="alert">{errors.submit}</ErrorMessage>
            </Grid>
          )}

          <Grid item xs={12} container justifyContent="flex-end" spacing={2}>
            <Grid item>
              <Button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || disabled || isLoading}
                color="inherit"
                data-testid="project-cancel-button"
              >
                {t('common.cancel')}
              </Button>
            </Grid>
            <Grid item>
              <Button
                type="submit"
                disabled={isSubmitting || disabled || isLoading}
                variant="contained"
                color="primary"
                data-testid="project-submit-button"
              >
                {isSubmitting || isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t(initialData?.id ? 'common.save' : 'common.create')
                )}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </FormContainer>
    </ErrorBoundary>
  );
};

export default ProjectForm;