# Cluster identification and access outputs
output "cluster_id" {
  description = "The unique identifier of the EKS cluster used for resource referencing"
  value       = aws_eks_cluster.main.id
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server used for Kubernetes provider configuration"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required for cluster authentication and API server verification"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

# Security and access control outputs
output "cluster_security_group_id" {
  description = "ID of the security group attached to the EKS cluster for network access control"
  value       = aws_security_group.cluster_sg.id
}

output "cluster_iam_role_arn" {
  description = "ARN of the IAM role used by the EKS cluster for AWS service authentication"
  value       = aws_iam_role.cluster_role.arn
}

output "node_iam_role_arn" {
  description = "ARN of the IAM role used by the EKS node groups for AWS service authentication"
  value       = aws_iam_role.node_role.arn
}

# Node group configuration outputs
output "node_groups" {
  description = "Detailed map of node group configurations including scaling settings and instance specifications"
  value = {
    for k, v in aws_eks_node_group.main : k => {
      id              = v.id
      status          = v.status
      scaling_config  = v.scaling_config
      instance_types  = v.instance_types
      capacity_type   = v.capacity_type
      labels         = v.labels
    }
  }
}

# Cluster version and configuration outputs
output "kubernetes_version" {
  description = "The Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "vpc_config" {
  description = "VPC configuration details for the EKS cluster"
  value = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.cluster_sg.id]
  }
}

# Logging and monitoring outputs
output "cluster_logging_enabled" {
  description = "List of enabled cluster logging types for monitoring and audit purposes"
  value       = aws_eks_cluster.main.enabled_cluster_log_types
}

output "cluster_status" {
  description = "Current status of the EKS cluster"
  value       = aws_eks_cluster.main.status
}

# Authentication configuration outputs
output "cluster_auth_config" {
  description = "Authentication configuration for the EKS cluster"
  value = {
    endpoint_private_access = aws_eks_cluster.main.vpc_config[0].endpoint_private_access
    endpoint_public_access  = aws_eks_cluster.main.vpc_config[0].endpoint_public_access
    public_access_cidrs    = aws_eks_cluster.main.vpc_config[0].public_access_cidrs
  }
  sensitive = true
}