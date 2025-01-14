# Task Management System Infrastructure Outputs
# Provider version: AWS ~> 4.0

# Environment Information
output "environment" {
  description = "Current deployment environment (dev/staging/prod/dr)"
  value       = var.environment
  sensitive   = false
}

output "region" {
  description = "AWS region where infrastructure is deployed"
  value       = data.aws_region.current.name
  sensitive   = false
}

output "vpc_id" {
  description = "ID of the VPC hosting the infrastructure"
  value       = var.vpc_id
  sensitive   = false
}

# EKS Cluster Information
output "eks_cluster_info" {
  description = "Comprehensive EKS cluster configuration and access information"
  value = {
    cluster_endpoint                    = module.eks.cluster_endpoint
    cluster_name                        = module.eks.cluster_name
    cluster_security_group_id           = module.eks.cluster_security_group_id
    cluster_iam_role_arn               = module.eks.cluster_iam_role_arn
    node_iam_role_arn                  = module.eks.node_iam_role_arn
  }
  sensitive = true
}

# Database Information
output "database_info" {
  description = "RDS PostgreSQL database connection and configuration details"
  value = {
    endpoint                = module.rds.db_instance_endpoint
    port                   = 5432
    security_group_id      = module.rds.db_security_group_id
    subnet_group_name      = module.rds.db_subnet_group_name
    parameter_group_family = "postgres14"
    engine_version         = "14"
  }
  sensitive = true
}

# Redis Cache Information
output "redis_info" {
  description = "Redis cluster configuration and connection details"
  value = {
    primary_endpoint     = module.redis.redis_primary_endpoint
    reader_endpoint      = module.redis.redis_reader_endpoint
    port                = 6379
    security_group_id   = module.redis.redis_security_group_id
    subnet_group_name   = module.redis.redis_subnet_group_name
    parameter_group     = "redis7.0"
    engine_version      = "7.0"
  }
  sensitive = true
}

# Security Groups Mapping
output "security_groups" {
  description = "Mapping of security group IDs for all infrastructure components"
  value = {
    eks_cluster     = module.eks.cluster_security_group_id
    eks_nodes       = module.eks.node_security_group_id
    database        = module.rds.db_security_group_id
    redis          = module.redis.redis_security_group_id
  }
  sensitive = true
}

# Network Information
output "network_info" {
  description = "Network configuration details for the infrastructure"
  value = {
    vpc_id              = var.vpc_id
    private_subnet_ids  = var.private_subnet_ids
    public_subnet_ids   = var.public_subnet_ids
    availability_zones  = data.aws_availability_zones.available.names
  }
  sensitive = false
}

# Monitoring Information
output "monitoring_info" {
  description = "Monitoring and logging configuration details"
  value = {
    cloudwatch_log_group     = "/aws/eks/${module.eks.cluster_name}/cluster"
    prometheus_endpoint      = "${module.eks.cluster_endpoint}/api/v1/namespaces/monitoring/services/prometheus-server:9090/proxy"
    grafana_endpoint        = "${module.eks.cluster_endpoint}/api/v1/namespaces/monitoring/services/grafana:3000/proxy"
    elasticsearch_endpoint  = "${module.eks.cluster_endpoint}/api/v1/namespaces/logging/services/elasticsearch-master:9200/proxy"
  }
  sensitive = true
}

# Regional Distribution Information
output "dr_config" {
  description = "Disaster recovery configuration details"
  value = {
    primary_region = data.aws_region.current.name
    dr_region      = var.dr_region
    failover_mode  = var.environment == "prod" ? "active-passive" : "none"
  }
  sensitive = false
}

# Data Sources
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}