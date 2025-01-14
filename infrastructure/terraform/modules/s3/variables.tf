# S3 bucket name variable with AWS naming convention validation
variable "bucket_name" {
  type        = string
  description = "The name of the S3 bucket for storing task attachments and files. Must be globally unique and follow AWS naming conventions."
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.bucket_name)) && length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "Bucket name must be 3-63 characters long, contain only lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen."
  }
}

# Environment variable with strict validation for allowed values
variable "environment" {
  type        = string
  description = "The deployment environment for the S3 bucket. Used for applying environment-specific configurations."
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Versioning control variable with production-ready default
variable "enable_versioning" {
  type        = bool
  description = "Whether to enable versioning for the S3 bucket. Recommended for production environments."
  default     = true
}

# Encryption configuration variable supporting AES-256 and KMS
variable "encryption_configuration" {
  type = object({
    algorithm    = string
    kms_key_arn = optional(string)
  })
  description = "Encryption configuration for the S3 bucket. Supports AES-256 and AWS KMS encryption."
  
  default = {
    algorithm    = "AES256"
    kms_key_arn = null
  }

  validation {
    condition     = contains(["AES256", "aws:kms"], var.encryption_configuration.algorithm)
    error_message = "Encryption algorithm must be either AES256 or aws:kms"
  }
}

# Resource tagging variable with default project tags
variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the S3 bucket. Should include required organizational tags."
  
  default = {
    Terraform = "true"
    Project   = "task-management-system"
    Service   = "file-storage"
  }
}