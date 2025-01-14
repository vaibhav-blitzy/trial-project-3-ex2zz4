# Output definitions for the S3 bucket module
# These outputs expose essential bucket information for use by other modules

output "bucket_id" {
  value       = aws_s3_bucket.main.id
  description = "The unique identifier of the S3 bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.main.arn
  description = "The ARN of the S3 bucket"
}

output "bucket_name" {
  value       = aws_s3_bucket.main.bucket
  description = "The name of the S3 bucket"
}

output "bucket_domain_name" {
  value       = aws_s3_bucket.main.bucket_domain_name
  description = "The domain name of the S3 bucket"
}

output "bucket_regional_domain_name" {
  value       = aws_s3_bucket.main.bucket_regional_domain_name
  description = "The regional domain name of the S3 bucket"
}