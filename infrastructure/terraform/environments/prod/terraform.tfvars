# Core Environment Configuration
environment = "prod"
region     = "us-east-1"
vpc_cidr   = "10.0.0.0/16"

# EKS Cluster Configuration
eks_cluster_version     = "1.25"
eks_node_instance_types = ["r6g.xlarge"]
eks_min_nodes          = 3
eks_max_nodes          = 10

# RDS Configuration
rds_instance_class         = "r6g.xlarge"
enable_multi_az           = true
backup_retention_days     = 7
deletion_protection       = true
storage_encrypted        = true
performance_insights_enabled = true
monitoring_interval      = 60

# Redis Configuration
redis_node_type = "r6g.large"

# Resource Tags
tags = {
  Environment         = "production"
  ManagedBy          = "terraform"
  Project            = "task-management-system"
  CostCenter         = "prod-infrastructure"
  BackupEnabled      = "true"
  MonitoringEnabled  = "true"
  SecurityLevel      = "high"
  DataClassification = "confidential"
}