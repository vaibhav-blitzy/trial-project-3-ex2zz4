# Output definitions for Redis ElastiCache module
# Module version: 1.0.0
# Provider version: ~> 4.0

output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint address for Redis cluster write operations in multi-AZ configuration"
}

output "redis_reader_endpoint" {
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  description = "Reader endpoint address for Redis cluster read operations supporting read replicas"
}

output "redis_port" {
  value       = aws_elasticache_replication_group.redis.port
  description = "Port number for Redis cluster connections"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security group ID associated with Redis cluster for network access control"
}

output "redis_connection_string" {
  value       = format("redis://%s:%s", aws_elasticache_replication_group.redis.primary_endpoint_address, aws_elasticache_replication_group.redis.port)
  description = "Full Redis connection string for secure application configuration"
  sensitive   = true
}