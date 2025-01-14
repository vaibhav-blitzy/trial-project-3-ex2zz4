# RDS instance outputs
output "db_instance_id" {
  description = "The ID of the RDS instance"
  value       = aws_db_instance.this.id
}

output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.this.arn
}

output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.this.availability_zone
}

output "db_backup_retention_period" {
  description = "The backup retention period for the RDS instance"
  value       = aws_db_instance.this.backup_retention_period
}

# Subnet group outputs
output "db_subnet_group_id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.this.id
}

output "db_subnet_group_arn" {
  description = "The ARN of the DB subnet group"
  value       = aws_db_subnet_group.this.arn
}

output "db_subnet_ids" {
  description = "The list of subnet IDs used by the DB subnet group"
  value       = aws_db_subnet_group.this.subnet_ids
}

# Security group outputs
output "db_security_group_id" {
  description = "The ID of the DB security group"
  value       = aws_security_group.this.id
}

output "db_security_group_arn" {
  description = "The ARN of the DB security group"
  value       = aws_security_group.this.arn
}

output "db_security_group_vpc_id" {
  description = "The VPC ID associated with the DB security group"
  value       = aws_security_group.this.vpc_id
}