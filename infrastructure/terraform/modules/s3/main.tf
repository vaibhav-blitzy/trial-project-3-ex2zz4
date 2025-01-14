# AWS Provider configuration
# Provider version: ~> 4.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Primary S3 bucket resource with enhanced security features
resource "aws_s3_bucket" "main" {
  bucket        = var.bucket_name
  force_destroy = false

  # Comprehensive tagging strategy for cost allocation and compliance
  tags = merge(var.tags, {
    Environment = var.environment
    Encryption  = "AES256"
    Compliance  = "GDPR"
    SecurityTier = "High"
  })

  # Prevent accidental deletion in production
  lifecycle {
    prevent_destroy = var.environment == "prod" ? true : false
  }
}

# Enable versioning with MFA delete protection
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status     = "Enabled"
    mfa_delete = var.environment == "prod" ? "Enabled" : "Disabled"
  }
}

# Configure server-side encryption using AES-256
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Implement strict public access controls
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure intelligent tiering and lifecycle policies
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "cost_optimization"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# Configure CORS for web application access
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["Authorization", "Content-Type", "x-amz-date", "x-amz-security-token"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["https://*.${var.environment}.taskmaster.com"]
    expose_headers  = ["ETag", "x-amz-server-side-encryption"]
    max_age_seconds = 3600
  }
}

# Enable bucket logging for audit compliance
resource "aws_s3_bucket_logging" "main" {
  bucket = aws_s3_bucket.main.id

  target_bucket = aws_s3_bucket.main.id
  target_prefix = "access-logs/"
}

# Configure bucket policy for secure access
resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Configure bucket notification for object changes
resource "aws_s3_bucket_notification" "main" {
  bucket = aws_s3_bucket.main.id

  eventbridge = true
}