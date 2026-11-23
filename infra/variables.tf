# Entradas do Terraform: o que muda de um ambiente para outro.
# Valores não secretos ficam em envs/<ambiente>.tfvars.
# A senha NUNCA fica em arquivo: vem da variável de ambiente TF_VAR_db_password.

variable "project" {
  description = "Prefixo dos recursos"
  type        = string
  default     = "pix"
}

variable "environment" {
  description = "Ambiente: dev, hom ou prd"
  type        = string
  validation {
    condition     = contains(["dev", "hom", "prd"], var.environment)
    error_message = "environment deve ser dev, hom ou prd."
  }
}

variable "db_user" {
  description = "Usuário do Postgres"
  type        = string
  default     = "root"
}

variable "db_name" {
  description = "Nome do banco"
  type        = string
  default     = "banco_pix"
}

variable "db_password" {
  description = "Senha do Postgres (passe por TF_VAR_db_password; sem default de propósito)"
  type        = string
  sensitive   = true # o Terraform esconde o valor nos logs e no plan
}

variable "db_host_port" {
  description = "Porta do banco publicada no seu computador"
  type        = number
}

variable "api_host_port" {
  description = "Porta da API publicada no seu computador"
  type        = number
}

variable "api_image" {
  description = "Imagem da API (docker build --target runtime -t pix-api:latest .)"
  type        = string
  default     = "pix-api:latest"
}

variable "seed_image" {
  description = "Imagem do seed, com drizzle-kit e tsx (docker build --target build -t pix-seed:latest .)"
  type        = string
  default     = "pix-seed:latest"
}

variable "tz" {
  description = "Fuso do processo Node (o limite diário zera à meia-noite dele)"
  type        = string
  default     = "America/Sao_Paulo"
}

variable "docker_host" {
  description = "Endereço do Docker; null usa o padrão do sistema"
  type        = string
  default     = null
}
