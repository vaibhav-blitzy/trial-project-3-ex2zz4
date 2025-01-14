# Terraform AWS Redis ElastiCache Module Variables
# Module version: 1.0.0
# Provider version requirements:
# - hashicorp/terraform >= 1.0.0

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "redis_node_type" {
  type        = string
  description = "Instance type for Redis nodes"
  default     = "r6g.large"
}

variable "redis_num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the Redis cluster"
  default     = 2
}

variable "redis_port" {
  type        = number
  description = "Port number for Redis cluster"
  default     = 6379
}

variable "redis_parameter_group_family" {
  type        = string
  description = "Redis parameter group family version"
  default     = "redis7.0"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for Redis cluster deployment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where Redis cluster will be deployed"
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "List of security group IDs allowed to access Redis cluster"
  default     = []
}

variable "automatic_failover_enabled" {
  type        = bool
  description = "Enable automatic failover for Redis cluster"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Additional tags for Redis resources"
  default     = {}
}