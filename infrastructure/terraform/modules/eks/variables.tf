# Core Terraform functionality for variable definitions and validation rules
terraform {
  required_version = ">=1.0.0"
}

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster - must be unique within the AWS region"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name)) && length(var.cluster_name) <= 100
    error_message = "Cluster name must start with a letter, contain only alphanumeric characters and hyphens, and be 100 characters or less"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster - must be 1.25 or higher as per technical requirements"
  default     = "1.25"
  validation {
    condition     = can(regex("^1\\.(2[5-9]|[3-9][0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.25 or higher as per system requirements"
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be deployed - must be configured with appropriate subnets and routing"
  validation {
    condition     = can(regex("^vpc-", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier"
  }
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for EKS cluster and node groups - must include both public and private subnets for high availability"
  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnets must be provided for high availability"
  }
}

variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    desired_size   = number
    min_size      = number
    max_size      = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    capacity_type = string
  }))
  description = "Comprehensive configuration for EKS node groups including instance types, scaling parameters, and Kubernetes labels/taints"
  default = {
    default = {
      instance_types = ["r6g.xlarge"]
      desired_size   = 3
      min_size      = 3
      max_size      = 10
      labels = {
        environment = "production"
        workload    = "general"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
  }
}

variable "enable_cluster_logging" {
  type        = bool
  description = "Enable EKS control plane logging for audit and monitoring purposes"
  default     = true
}

variable "cluster_log_types" {
  type        = list(string)
  description = "List of EKS control plane log types to enable for comprehensive monitoring"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "endpoint_private_access" {
  type        = bool
  description = "Enable private API server endpoint for enhanced security"
  default     = true
}

variable "endpoint_public_access" {
  type        = bool
  description = "Enable public API server endpoint - should be carefully controlled"
  default     = false
}

variable "public_access_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks that can access the public API server endpoint if enabled"
  default     = []
  validation {
    condition     = alltrue([for cidr in var.public_access_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All CIDR blocks must be in valid format"
  }
}

variable "encryption_config" {
  type = object({
    enabled     = bool
    kms_key_arn = string
  })
  description = "Configuration for EKS cluster encryption using KMS"
  default = {
    enabled     = true
    kms_key_arn = ""
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to all EKS resources for proper resource management and cost allocation"
  default = {
    ManagedBy    = "terraform"
    Project      = "task-management-system"
    Environment  = "production"
  }
}