# Environment identifier
environment = "staging"

# Regional configuration
region = "us-east-1"
vpc_cidr = "10.1.0.0/16"

# Project identification
project_name = "task-management-system"

# EKS cluster configuration
eks_cluster_version = "1.25"
eks_node_instance_types = ["r6g.xlarge"]
eks_node_groups = {
  default = {
    instance_types = ["r6g.xlarge"]
    desired_size   = 2
    min_size      = 2
    max_size      = 4
    labels = {
      environment = "staging"
    }
    taints = []
  }
}

# RDS configuration
rds_instance_class = "r6g.xlarge"
enable_multi_az = true
backup_retention_days = 7

# ElastiCache configuration
redis_node_type = "r6g.large"
redis_config = {
  num_cache_nodes    = 2
  automatic_failover = true
}

# Monitoring and logging configuration
enable_cluster_logging = true
cluster_log_types = [
  "api",
  "audit",
  "authenticator",
  "controllerManager",
  "scheduler"
]

# Resource tagging
tags = {
  Environment   = "staging"
  ManagedBy     = "terraform"
  Project       = "task-management-system"
  Purpose       = "pre-production"
  Owner         = "platform-team"
  SecurityLevel = "high"
  BackupRequired = "true"
}

# Networking configuration
vpc_config = {
  enable_nat_gateway = true
  single_nat_gateway = false
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true
}

# Security configuration
security_config = {
  enable_security_groups = true
  enable_network_policy = true
  enable_pod_security_policy = true
}

# Backup configuration
backup_config = {
  enable_automated_backups = true
  backup_window = "03:00-04:00"
  maintenance_window = "Mon:04:00-Mon:05:00"
}

# Monitoring configuration
monitoring_config = {
  retention_days = 90
  enable_detailed_monitoring = true
  alarm_evaluation_periods = 3
}