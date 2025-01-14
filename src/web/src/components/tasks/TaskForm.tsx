/**
 * @fileoverview Enterprise-grade TaskForm component with real-time collaboration
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import { useTranslation } from 'react-i18next';
import { Box, Button, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Input } from '../common/Input';
import { FileUpload } from '../common/FileUpload';
import { useWebSocket } from '../../hooks/useWebSocket';
import { COLORS, SPACING, TRANSITIONS } from '../../constants/theme.constants';
import { Priority, Status } from '../../types/common.types';

// Styled components for enhanced visual hierarchy
const FormContainer = styled(Box)(({ theme }) => ({
  padding: SPACING.scale[4],
  borderRadius: '8px',
  backgroundColor: COLORS.light.background.paper,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: `all ${TRANSITIONS.duration.standard} ${TRANSITIONS.easing.easeInOut}`,
  '&:focus-within': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
}));

const CollaboratorIndicator = styled('div')<{ isActive: boolean }>(({ isActive }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: isActive ? COLORS.light.primary.main : COLORS.light.text.disabled,
  marginRight: SPACING.scale[2],
}));

// Interface definitions
interface TaskFormProps {
  initialData?: Partial<ITask>;
  onSubmit: (task: ITask) => Promise<void>;
  onCancel: () => void;
  collaborators: IUser[];
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

interface ITask {
  id?: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  assigneeIds: string[];
  attachments: string[];
}

// Form validation schema
const validateForm = (values: Partial<ITask>) => {
  const errors: Partial<Record<keyof ITask, string>> = {};

  if (!values.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!values.description?.trim()) {
    errors.description = 'Description is required';
  }

  if (!values.dueDate) {
    errors.dueDate = 'Due date is required';
  } else {
    const date = new Date(values.dueDate);
    if (date < new Date()) {
      errors.dueDate = 'Due date cannot be in the past';
    }
  }

  if (!values.assigneeIds?.length) {
    errors.assigneeIds = 'At least one assignee is required';
  }

  return errors;
};

export const TaskForm: React.FC<TaskFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  collaborators,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'],
}) => {
  const { t } = useTranslation();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [collaboratorPresence, setCollaboratorPresence] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // WebSocket setup for real-time collaboration
  const { subscribe } = useWebSocket();

  // Formik initialization with validation
  const formik = useFormik({
    initialValues: {
      title: initialData.title || '',
      description: initialData.description || '',
      priority: initialData.priority || Priority.MEDIUM,
      status: initialData.status || Status.ACTIVE,
      dueDate: initialData.dueDate || '',
      assigneeIds: initialData.assigneeIds || [],
      attachments: initialData.attachments || [],
    },
    validate: validateForm,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values as ITask);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Real-time collaboration subscription
  useEffect(() => {
    const unsubscribe = subscribe<{ userId: string; active: boolean }>('user.presence', 
      ({ userId, active }) => {
        setCollaboratorPresence(prev => ({
          ...prev,
          [userId]: active,
        }));
      }
    );

    return () => unsubscribe();
  }, [subscribe]);

  // File upload handler
  const handleFileUpload = useCallback(async (files: File[]) => {
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          // Implement file upload logic here
          return `https://storage.example.com/${file.name}`;
        })
      );

      formik.setFieldValue('attachments', [
        ...formik.values.attachments,
        ...uploadedUrls,
      ]);
    } catch (error) {
      console.error('File upload error:', error);
    }
  }, [formik]);

  return (
    <FormContainer
      component="form"
      ref={formRef}
      onSubmit={formik.handleSubmit}
      role="form"
      aria-label={initialData.id ? 'Edit Task' : 'Create Task'}
    >
      <Box sx={{ mb: SPACING.scale[4] }}>
        <Input
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          error={formik.touched.title && formik.errors.title}
          helperText={formik.touched.title && formik.errors.title}
          required
          fullWidth
          ariaLabel="Task title"
        />
      </Box>

      <Box sx={{ mb: SPACING.scale[4] }}>
        <Input
          name="description"
          value={formik.values.description}
          onChange={formik.handleChange}
          error={formik.touched.description && formik.errors.description}
          helperText={formik.touched.description && formik.errors.description}
          multiline
          rows={4}
          required
          fullWidth
          ariaLabel="Task description"
        />
      </Box>

      <Box sx={{ mb: SPACING.scale[4], display: 'flex', gap: SPACING.scale[4] }}>
        <Select
          value={formik.values.priority}
          onChange={formik.handleChange}
          name="priority"
          fullWidth
          aria-label="Task priority"
        >
          {Object.values(Priority).map((priority) => (
            <MenuItem key={priority} value={priority}>
              {t(`priority.${priority.toLowerCase()}`)}
            </MenuItem>
          ))}
        </Select>

        <Input
          type="date"
          name="dueDate"
          value={formik.values.dueDate}
          onChange={formik.handleChange}
          error={formik.touched.dueDate && formik.errors.dueDate}
          helperText={formik.touched.dueDate && formik.errors.dueDate}
          required
          fullWidth
          ariaLabel="Due date"
        />
      </Box>

      <Box sx={{ mb: SPACING.scale[4] }}>
        <Select
          multiple
          value={formik.values.assigneeIds}
          onChange={formik.handleChange}
          name="assigneeIds"
          fullWidth
          aria-label="Assignees"
        >
          {collaborators.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <CollaboratorIndicator isActive={collaboratorPresence[user.id]} />
              {user.name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={{ mb: SPACING.scale[4] }}>
        <FileUpload
          accept={allowedFileTypes}
          maxSize={maxFileSize}
          onUpload={handleFileUpload}
          onProgress={setUploadProgress}
          multiple
        />
        {uploadProgress > 0 && uploadProgress < 100 && (
          <CircularProgress
            variant="determinate"
            value={uploadProgress}
            size={24}
            sx={{ mt: SPACING.scale[2] }}
          />
        )}
      </Box>

      {formik.status && (
        <Alert severity="error" sx={{ mb: SPACING.scale[4] }}>
          {formik.status}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: SPACING.scale[2], justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={formik.isSubmitting}
          aria-label="Cancel"
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={formik.isSubmitting || !formik.isValid}
          aria-label={initialData.id ? 'Save task' : 'Create task'}
        >
          {formik.isSubmitting ? (
            <CircularProgress size={24} />
          ) : initialData.id ? (
            t('common.save')
          ) : (
            t('common.create')
          )}
        </Button>
      </Box>
    </FormContainer>
  );
};

export default TaskForm;