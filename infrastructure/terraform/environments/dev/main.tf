# Task Management System - Development Environment Infrastructure
# Provider version: aws ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for development environment
locals {
  environment = "dev"
  region     = "us-east-1"
  common_tags = {
    Environment    = "development"
    ManagedBy     = "terraform"
    Project       = "task-management-system"
    CostCenter    = "development"
    Backup        = "daily"
    SecurityLevel = "development"
  }
}

# Import root module for base infrastructure
module "root_module" {
  source = "../../"
}

# EKS cluster configuration for development
module "eks" {
  source = "../../modules/eks"

  environment         = local.environment
  cluster_name        = "tms-dev-cluster"
  kubernetes_version  = "1.25"
  vpc_id             = module.root_module.vpc_id
  subnet_ids         = module.root_module.private_subnet_ids
  
  node_groups = {
    default = {
      instance_types = ["t3.medium"]
      desired_size   = 2
      min_size      = 1
      max_size      = 3
      labels = {
        Environment = "development"
        Workload    = "general"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
  }

  enable_cluster_logging = true
  cluster_log_types     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs    = ["0.0.0.0/0"]  # Restrict in production

  encryption_config = {
    enabled     = true
    kms_key_arn = ""  # Will use default EKS key
  }

  tags = local.common_tags
}

# RDS instance configuration for development
module "rds" {
  source = "../../modules/rds"

  project_name    = "tms"
  environment     = local.environment
  vpc_id         = module.root_module.vpc_id
  private_subnet_ids = module.root_module.private_subnet_ids
  
  instance_class        = "r6g.large"
  allocated_storage     = 50
  max_allocated_storage = 100
  
  multi_az               = false  # Single AZ for dev environment
  backup_retention_period = 3
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  deletion_protection          = false
  storage_encrypted           = true
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  allowed_cidr_blocks = [
    module.root_module.vpc_cidr
  ]

  tags = local.common_tags
}

# Redis cache configuration for development
module "redis" {
  source = "../../modules/redis"

  environment     = local.environment
  redis_node_type = "cache.r6g.large"
  redis_num_cache_nodes = 1
  
  vpc_id     = module.root_module.vpc_id
  subnet_ids = module.root_module.private_subnet_ids
  
  allowed_security_group_ids = [
    module.eks.cluster_security_group_id
  ]
  
  automatic_failover_enabled = false  # Disabled for dev environment
  
  tags = local.common_tags
}

# Output the development environment configuration
output "eks_cluster" {
  description = "Development EKS cluster details"
  value = {
    cluster_name            = module.eks.cluster_name
    cluster_endpoint        = module.eks.cluster_endpoint
    cluster_security_group_id = module.eks.cluster_security_group_id
  }
}

output "rds_instance" {
  description = "Development RDS instance details"
  value = {
    db_instance_endpoint = module.rds.db_instance_endpoint
    db_instance_id      = module.rds.db_instance_id
  }
}

output "redis_cluster" {
  description = "Development Redis cluster details"
  value = {
    redis_endpoint = module.redis.redis_endpoint
    redis_port     = module.redis.redis_port
  }
}