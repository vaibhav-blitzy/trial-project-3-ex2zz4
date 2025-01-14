# AWS Provider configuration with version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# RDS subnet group for Multi-AZ deployment
resource "aws_db_subnet_group" "this" {
  name        = "${var.project_name}-${var.environment}-rds-subnet-group"
  description = "Subnet group for ${var.project_name} RDS instance in ${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-rds-subnet-group"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

# Security group for RDS instance
resource "aws_security_group" "this" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for ${var.project_name} RDS instance in ${var.environment}"
  vpc_id      = var.vpc_id

  # PostgreSQL ingress rule
  ingress {
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    cidr_blocks      = var.allowed_cidr_blocks
    description      = "PostgreSQL access from allowed CIDR blocks"
  }

  # Allow all egress traffic
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    description      = "Allow all outbound traffic"
  }

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-rds-sg"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )

  lifecycle {
    create_before_destroy = true
  }
}

# RDS instance
resource "aws_db_instance" "this" {
  identifier = "${var.project_name}-${var.environment}-db"

  # Engine configuration
  engine                      = "postgres"
  engine_version             = "14"
  instance_class             = var.instance_class
  username                   = "postgres"  # Default admin username
  manage_master_user_password = true       # Use AWS Secrets Manager for password

  # Storage configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = var.storage_encrypted
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  multi_az              = var.multi_az
  publicly_accessible   = false

  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  copy_tags_to_snapshot  = true

  # Monitoring and performance
  monitoring_interval          = var.monitoring_interval
  monitoring_role_arn         = aws_iam_role.rds_monitoring_role.arn
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_retention_period = 7 # Days

  # Enhanced monitoring
  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]

  # Security settings
  deletion_protection = var.deletion_protection
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD", timestamp())}"

  # Parameter group
  parameter_group_name = aws_db_parameter_group.this.name

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-db"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      password,
      final_snapshot_identifier
    ]
  }
}

# Parameter group for PostgreSQL configuration
resource "aws_db_parameter_group" "this" {
  name        = "${var.project_name}-${var.environment}-pg14"
  family      = "postgres14"
  description = "Custom parameter group for ${var.project_name} PostgreSQL 14 in ${var.environment}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-pg14"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring_role" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Name        = "${var.project_name}-${var.environment}-rds-monitoring-role"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.tags
  )
}

# Attach enhanced monitoring policy to the IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  role       = aws_iam_role.rds_monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}