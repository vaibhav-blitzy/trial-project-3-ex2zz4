# Task Management System - Production Environment Configuration
# Provider version: aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "tms-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tms-terraform-locks"
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = local.common_tags
  }
}

# Production environment specific tags
locals {
  common_tags = {
    Environment         = "production"
    ManagedBy          = "terraform"
    Project            = "task-management-system"
    CostCenter         = "production-infrastructure"
    Compliance         = "sox-hipaa-gdpr"
    DataClassification = "confidential"
    BackupEnabled      = "true"
    DR                 = "enabled"
  }
}

# VPC Configuration
module "vpc" {
  source = "../../"

  environment         = "prod"
  vpc_cidr           = "10.0.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = false
  enable_vpn_gateway = true
  enable_flow_logs   = true

  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets   = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
  
  tags = local.common_tags
}

# EKS Cluster Configuration
module "eks" {
  source = "../../modules/eks"

  cluster_name         = "tms-prod-cluster"
  kubernetes_version   = "1.25"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids

  node_groups = {
    general = {
      instance_types = ["r6g.xlarge"]
      min_size      = 3
      max_size      = 10
      desired_size  = 5
      disk_size     = 100
      labels = {
        Environment = "production"
        Type       = "general"
      }
      taints = []
      capacity_type = "ON_DEMAND"
    }
  }

  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }

  enable_cluster_logging = true
  cluster_log_types     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  tags = local.common_tags
}

# RDS Configuration
module "rds" {
  source = "../../modules/rds"

  project_name    = "tms"
  environment     = "prod"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids

  instance_class         = "r6g.xlarge"
  allocated_storage     = 100
  max_allocated_storage = 1000
  multi_az             = true

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  deletion_protection          = true
  storage_encrypted           = true
  performance_insights_enabled = true
  monitoring_interval         = 60

  allowed_cidr_blocks = [module.vpc.vpc_cidr_block]
  
  tags = local.common_tags
}

# Redis Configuration
module "redis" {
  source = "../../modules/redis"

  environment = "prod"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids

  redis_node_type            = "r6g.large"
  redis_num_cache_nodes     = 3
  redis_parameter_group_family = "redis7.0"

  automatic_failover_enabled = true
  allowed_security_group_ids = [module.eks.cluster_security_group_id]
  
  tags = local.common_tags
}

# KMS key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = merge(local.common_tags, {
    Name = "tms-prod-eks-key"
  })
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}