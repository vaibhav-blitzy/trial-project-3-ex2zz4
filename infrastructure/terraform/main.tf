# Task Management System Infrastructure Configuration
# Provider versions: aws ~> 4.0, kubernetes ~> 2.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Common tags for all resources
locals {
  common_tags = {
    Environment         = var.environment
    ManagedBy          = "terraform"
    Project            = "task-management-system"
    CostCenter         = "infrastructure"
    DataClassification = "confidential"
    DR                 = "enabled"
  }
}

# Primary region VPC
resource "aws_vpc" "primary" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "vpc-${var.environment}-primary"
  })
}

# DR region VPC
resource "aws_vpc" "dr" {
  provider = aws.dr
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "vpc-${var.environment}-dr"
  })
}

# Primary region EKS cluster
module "eks_cluster_primary" {
  source = "./modules/eks"

  cluster_name         = "eks-${var.environment}-primary"
  kubernetes_version   = var.eks_cluster_version
  vpc_id              = aws_vpc.primary.id
  subnet_ids          = aws_vpc.primary.private_subnets
  node_groups         = var.eks_node_groups[var.environment]
  
  encryption_config = {
    enabled     = true
    kms_key_arn = aws_kms_key.eks.arn
  }

  tags = local.common_tags
}

# RDS Aurora cluster with multi-AZ support
resource "aws_rds_cluster" "main" {
  cluster_identifier     = "rds-${var.environment}"
  engine                = "aurora-postgresql"
  engine_version        = "14.6"
  database_name         = "taskmanagement"
  master_username       = "admin"
  master_password       = aws_secretsmanager_secret_version.rds_password.secret_string
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period   = var.rds_config[var.environment].backup_retention_days
  preferred_backup_window   = "03:00-04:00"
  deletion_protection       = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "final-snapshot-${var.environment}"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn

  tags = local.common_tags
}

# ElastiCache Redis cluster with automatic failover
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "redis-${var.environment}"
  replication_group_description = "Redis cluster for ${var.environment}"
  
  node_type            = var.elasticache_config[var.environment].node_type
  number_cache_clusters = var.elasticache_config[var.environment].num_cache_nodes
  port                 = 6379
  
  automatic_failover_enabled = var.elasticache_config[var.environment].automatic_failover
  multi_az_enabled          = var.elasticache_config[var.environment].automatic_failover
  
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.common_tags
}

# Route53 DNS configuration for multi-region setup
resource "aws_route53_zone" "primary" {
  name = "task-management.internal"
  
  vpc {
    vpc_id = aws_vpc.primary.id
  }
  
  tags = local.common_tags
}

# CloudWatch Log Groups for centralized logging
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/application/${var.environment}"
  retention_in_days = var.monitoring_config.retention_days
  
  tags = local.common_tags
}

# KMS keys for encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = local.common_tags
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = local.common_tags
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "rds-${var.environment}"
  description = "Security group for RDS cluster"
  vpc_id      = aws_vpc.primary.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks_cluster_primary.cluster_security_group_id]
  }

  tags = local.common_tags
}

# Security group for Redis
resource "aws_security_group" "redis" {
  name        = "redis-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.primary.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks_cluster_primary.cluster_security_group_id]
  }

  tags = local.common_tags
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cluster_health" {
  alarm_name          = "eks-cluster-health-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.monitoring_config.alarm_evaluation_periods
  metric_name         = "cluster_failed_node_count"
  namespace           = "AWS/EKS"
  period             = "300"
  statistic          = "Maximum"
  threshold          = "0"
  alarm_description  = "Monitor EKS cluster node health"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = module.eks_cluster_primary.cluster_name
  }
  
  tags = local.common_tags
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "infrastructure-alerts-${var.environment}"
  
  tags = local.common_tags
}