# Environment Configuration
environment = "dev"
region = "us-east-1"
project_name = "task-management-system"

# Network Configuration
vpc_cidr = "10.0.0.0/16"

# EKS Cluster Configuration
eks_cluster_version = "1.25"
eks_node_groups = {
  dev = {
    instance_types = ["t3.medium"]
    min_size      = 1
    max_size      = 3
    desired_size  = 1
  }
}

# RDS Configuration
rds_config = {
  dev = {
    instance_class        = "r6g.xlarge"
    multi_az             = false
    backup_retention_days = 7
  }
}

# ElastiCache Configuration
elasticache_config = {
  dev = {
    node_type           = "cache.r6g.large"
    num_cache_nodes    = 1
    automatic_failover = false
  }
}

# Monitoring Configuration
monitoring_config = {
  retention_days              = 30
  enable_detailed_monitoring = true
  alarm_evaluation_periods   = 2
}

# Cost Optimization Settings
auto_shutdown_enabled = true
auto_shutdown_schedule = "cron(0 20 ? * MON-FRI *)" # Shutdown at 8 PM EST
auto_startup_schedule  = "cron(0 8 ? * MON-FRI *)"  # Startup at 8 AM EST

# Resource Tags
tags = {
  Environment     = "development"
  ManagedBy      = "terraform"
  Project        = "task-management-system"
  CostCenter     = "development"
  AutoShutdown   = "enabled"
  Owner          = "platform-team"
  SecurityLevel  = "high"
  BackupRequired = "true"
}

# Development-specific Feature Flags
enable_monitoring = true
enable_multi_az = false
enable_auto_scaling = false
enable_performance_insights = true

# Backup Configuration
backup_retention_days = 7
backup_window = "03:00-04:00"
maintenance_window = "Mon:04:00-Mon:05:00"

# Security Configuration
enable_deletion_protection = false
enable_ssl_enforcement = true
allowed_cidr_blocks = ["10.0.0.0/16"]  # VPC CIDR for internal access