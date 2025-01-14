# AWS ElastiCache Redis Module
# Provider version: ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

locals {
  name_prefix = "tms-${var.environment}-redis"
  common_tags = merge(
    {
      Environment = var.environment
      Service     = "redis"
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

# Redis subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${local.name_prefix}-subnet-group"
  description = "Subnet group for ${local.name_prefix} Redis cluster"
  subnet_ids  = var.subnet_ids
  tags        = local.common_tags
}

# Redis parameter group for cluster configuration
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.redis_parameter_group_family
  name        = "${local.name_prefix}-params"
  description = "Parameter group for ${local.name_prefix} Redis cluster"

  # Redis configuration parameters based on best practices
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = local.common_tags
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-sg"
  description = "Security group for ${local.name_prefix} Redis cluster"
  vpc_id      = var.vpc_id

  # Redis port ingress rule
  ingress {
    from_port       = var.redis_port
    to_port         = var.redis_port
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Allow Redis traffic from application security groups"
  }

  # Egress rule allowing all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Redis replication group (cluster)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${local.name_prefix}-cluster"
  replication_group_description = "Redis cluster for ${local.name_prefix}"
  node_type                     = var.redis_node_type
  num_cache_clusters           = var.redis_num_cache_nodes
  port                         = var.redis_port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  
  # High availability settings
  automatic_failover_enabled  = var.automatic_failover_enabled
  multi_az_enabled           = var.automatic_failover_enabled
  
  # Security settings
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  # Engine settings
  engine               = "redis"
  engine_version      = "7.0"
  
  # Maintenance settings
  maintenance_window  = "sun:05:00-sun:09:00"
  snapshot_window    = "03:00-05:00"
  snapshot_retention_limit = 7
  
  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = true

  tags = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = []  # Add SNS topic ARN if needed
  ok_actions         = []  # Add SNS topic ARN if needed

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.name_prefix}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = []  # Add SNS topic ARN if needed
  ok_actions         = []  # Add SNS topic ARN if needed

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = local.common_tags
}