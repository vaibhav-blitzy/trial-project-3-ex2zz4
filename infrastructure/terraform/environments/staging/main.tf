# Task Management System - Staging Environment Infrastructure Configuration
# Provider version: aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Store state in S3 with DynamoDB locking
  backend "s3" {
    bucket         = "task-management-system-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# Define provider configuration with default tags
provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment   = "staging"
      ManagedBy    = "terraform"
      Project      = "task-management-system"
      CostCenter   = "staging-ops"
      SecurityZone = "pre-production"
    }
  }
}

# Local variables for environment-specific settings
locals {
  environment = "staging"
  region      = "us-east-1"
  common_tags = {
    Environment   = "staging"
    ManagedBy    = "terraform"
    Project      = "task-management-system"
    CostCenter   = "staging-ops"
    SecurityZone = "pre-production"
  }
}

# Main staging infrastructure module
module "staging_infrastructure" {
  source = "../../"

  # Core configuration
  environment         = local.environment
  region             = local.region
  vpc_cidr           = "10.1.0.0/16"
  enable_multi_az    = true

  # EKS configuration
  eks_cluster_version    = "1.25"
  eks_node_instance_types = ["r6g.xlarge"]
  eks_node_scaling = {
    min_size     = 2
    max_size     = 4
    desired_size = 2
  }

  # RDS configuration
  rds_instance_class   = "r6g.xlarge"
  rds_multi_az        = true
  rds_backup_retention = 7

  # Redis configuration
  redis_node_type    = "r6g.large"
  redis_cluster_mode = true

  # Monitoring configuration
  monitoring_config = {
    enable_enhanced_monitoring = true
    monitoring_interval       = 60
    create_alarms            = true
    log_retention_days       = 30
  }

  # Security configuration
  security_config = {
    enable_encryption       = true
    enable_network_isolation = true
    enable_waf             = true
    enable_audit_logging   = true
  }

  # Resource tagging
  tags = local.common_tags
}

# Export outputs for other modules and documentation
output "vpc_id" {
  description = "ID of the staging VPC"
  value       = module.staging_infrastructure.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for staging EKS cluster"
  value       = module.staging_infrastructure.eks_cluster_endpoint
}

output "rds_endpoint" {
  description = "Endpoint for staging RDS instance"
  value       = module.staging_infrastructure.rds_endpoint
}

output "redis_endpoint" {
  description = "Endpoint for staging Redis cluster"
  value       = module.staging_infrastructure.redis_endpoint
}

output "monitoring_dashboard_url" {
  description = "URL for staging monitoring dashboard"
  value       = module.staging_infrastructure.monitoring_dashboard_url
}