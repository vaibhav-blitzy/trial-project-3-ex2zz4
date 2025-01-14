# Backend configuration for Task Management System Terraform state
# AWS Provider version: ~> 4.0

terraform {
  backend "s3" {
    bucket         = "tms-terraform-state-${var.environment}"
    key            = "terraform.tfstate"
    region         = var.region
    encrypt        = true
    dynamodb_table = "tms-terraform-locks-${var.environment}"
    acl            = "private"
    
    versioning {
      enabled = true
    }
  }
}

# S3 bucket for storing Terraform state with encryption and versioning
resource "aws_s3_bucket" "terraform_state" {
  bucket = "tms-terraform-state-${var.environment}"
  acl    = "private"

  versioning {
    enabled    = true
    mfa_delete = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  logging {
    target_bucket = "tms-logs-${var.environment}"
    target_prefix = "s3-access-logs/"
  }

  lifecycle_rule {
    enabled = true

    noncurrent_version_transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      days          = 60
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      days = 90
    }
  }

  replication_configuration {
    role = "arn:aws:iam::account:role/service-role/s3-bucket-replication"

    rules {
      id     = "disaster-recovery"
      status = "Enabled"

      destination {
        bucket        = "arn:aws:s3:::tms-terraform-state-dr-${var.environment}"
        storage_class = "STANDARD_IA"
      }
    }
  }

  tags = {
    Environment    = var.environment
    Purpose       = "Terraform State Storage"
    ManagedBy     = "Terraform"
    SecurityLevel = "High"
  }
}

# DynamoDB table for state locking with encryption and replication
resource "aws_dynamodb_table" "terraform_locks" {
  name           = "tms-terraform-locks-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = "aws/dynamodb"
  }

  replica {
    region_name            = "us-west-2"
    point_in_time_recovery = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "Terraform State Locking"
    ManagedBy   = "Terraform"
  }
}

# S3 bucket policy for secure access
resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceHTTPS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "RestrictToEnvironment"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = var.region
          }
        }
      }
    ]
  })
}

# Block public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}