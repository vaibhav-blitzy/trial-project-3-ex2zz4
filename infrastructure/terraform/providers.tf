# Configure required providers with version constraints
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" 
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Primary AWS provider configuration for main region
provider "aws" {
  region = var.region

  default_tags {
    tags = merge(var.tags, {
      Region = var.region
    })
  }

  # Assume role configuration for cross-account access if needed
  assume_role {
    role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformExecutionRole-${var.environment}"
  }
}

# Secondary AWS provider configuration for DR region
provider "aws" {
  alias  = "secondary"
  region = var.dr_region

  default_tags {
    tags = merge(var.tags, {
      Region = var.dr_region
      Role   = "disaster-recovery"
    })
  }
}

# Data source to get current AWS account details
data "aws_caller_identity" "current" {}

# Data source to get EKS cluster auth details
data "aws_eks_cluster" "cluster" {
  name = "task-management-${var.environment}"
}

data "aws_eks_cluster_auth" "cluster" {
  name = data.aws_eks_cluster.cluster.name
}

# Kubernetes provider configuration for EKS
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      data.aws_eks_cluster.cluster.name,
      "--region",
      var.region
    ]
  }
}

# Helm provider configuration for Kubernetes package management
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }

  # Configure official Helm repository
  repository {
    name = "stable"
    url  = "https://charts.helm.sh/stable"
  }
}