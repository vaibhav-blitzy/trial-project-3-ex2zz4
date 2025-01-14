# Core Terraform functionality for variable definitions
terraform {
  required_version = ">=1.0.0"
}

variable "project_name" {
  type        = string
  description = "Name of the project for resource naming"

  validation {
    condition     = length(var.project_name) > 0
    error_message = "Project name cannot be empty"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where RDS will be deployed"

  validation {
    condition     = length(var.vpc_id) > 0
    error_message = "VPC ID cannot be empty"
  }
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for RDS subnet group"

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required for high availability"
  }
}

variable "instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "r6g.xlarge"

  validation {
    condition     = can(regex("^[a-z][0-9][a-z]\\.[a-zA-Z0-9]+$", var.instance_class))
    error_message = "Invalid instance class format"
  }
}

variable "allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 100

  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 and 65536 GB"
  }
}

variable "max_allocated_storage" {
  type        = number
  description = "Maximum storage size in GB for autoscaling"
  default     = 1000

  validation {
    condition     = var.max_allocated_storage >= 100 && var.max_allocated_storage <= 65536
    error_message = "Maximum allocated storage must be between 100 and 65536 GB"
  }
}

variable "multi_az" {
  type        = bool
  description = "Enable Multi-AZ deployment"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain backups"
  default     = 7

  validation {
    condition     = var.backup_retention_period >= 0 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days"
  }
}

variable "backup_window" {
  type        = string
  description = "Preferred backup window"
  default     = "03:00-04:00"

  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.backup_window))
    error_message = "Backup window must be in the format HH:MM-HH:MM"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window"
  default     = "Mon:04:00-Mon:05:00"

  validation {
    condition     = can(regex("^[A-Za-z]{3}:[0-9]{2}:[0-9]{2}-[A-Za-z]{3}:[0-9]{2}:[0-9]{2}$", var.maintenance_window))
    error_message = "Maintenance window must be in the format ddd:HH:MM-ddd:HH:MM"
  }
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection"
  default     = true
}

variable "storage_encrypted" {
  type        = bool
  description = "Enable storage encryption"
  default     = true
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights"
  default     = true
}

variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 60

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60"
  }
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks allowed to access the database"
  default     = []

  validation {
    condition     = alltrue([for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))])
    error_message = "Invalid CIDR block format"
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional tags for RDS resources"
  default     = {}

  validation {
    condition     = length(keys(var.tags)) <= 50
    error_message = "Maximum of 50 tags are allowed"
  }
}