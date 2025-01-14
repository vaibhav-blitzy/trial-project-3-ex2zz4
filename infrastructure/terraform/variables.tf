# Core environment variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Regional configuration
variable "region" {
  type        = string
  description = "AWS region for primary deployment"
  default     = "us-east-1"
}

variable "dr_region" {
  type        = string
  description = "AWS region for disaster recovery"
  default     = "us-west-2"
}

# Networking configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.0.0.0/16"
}

# EKS configuration
variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for EKS cluster"
  default     = "1.25"
  validation {
    condition     = can(regex("^1\\.2[5-9]$", var.eks_cluster_version))
    error_message = "EKS cluster version must be 1.25 or higher"
  }
}

variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    min_size      = number
    max_size      = number
    desired_size  = number
  }))
  description = "Configuration for EKS node groups per environment"
  default = {
    dev = {
      instance_types = ["r6g.large"]
      min_size      = 1
      max_size      = 3
      desired_size  = 1
    }
    staging = {
      instance_types = ["r6g.xlarge"]
      min_size      = 2
      max_size      = 4
      desired_size  = 2
    }
    prod = {
      instance_types = ["r6g.xlarge"]
      min_size      = 3
      max_size      = 10
      desired_size  = 3
    }
  }
}

# RDS configuration
variable "rds_config" {
  type = map(object({
    instance_class        = string
    multi_az             = bool
    backup_retention_days = number
  }))
  description = "Configuration for RDS instances per environment"
  default = {
    dev = {
      instance_class        = "r6g.large"
      multi_az             = false
      backup_retention_days = 3
    }
    staging = {
      instance_class        = "r6g.xlarge"
      multi_az             = true
      backup_retention_days = 7
    }
    prod = {
      instance_class        = "r6g.xlarge"
      multi_az             = true
      backup_retention_days = 30
    }
  }
}

# ElastiCache configuration
variable "elasticache_config" {
  type = map(object({
    node_type           = string
    num_cache_nodes    = number
    automatic_failover = bool
  }))
  description = "Configuration for ElastiCache Redis clusters per environment"
  default = {
    dev = {
      node_type           = "r6g.large"
      num_cache_nodes    = 1
      automatic_failover = false
    }
    staging = {
      node_type           = "r6g.large"
      num_cache_nodes    = 2
      automatic_failover = true
    }
    prod = {
      node_type           = "r6g.xlarge"
      num_cache_nodes    = 3
      automatic_failover = true
    }
  }
}

# Monitoring configuration
variable "monitoring_config" {
  type = object({
    retention_days              = number
    enable_detailed_monitoring = bool
    alarm_evaluation_periods   = number
  })
  description = "Configuration for monitoring and alerting"
  default = {
    retention_days              = 90
    enable_detailed_monitoring = true
    alarm_evaluation_periods   = 3
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default = {
    ManagedBy       = "terraform"
    Project         = "task-management-system"
    Environment     = "var.environment"
    Owner           = "platform-team"
    SecurityLevel   = "high"
    BackupRequired  = "true"
  }
}