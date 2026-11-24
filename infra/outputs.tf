# Saídas: o que o Terraform mostra ao terminar (terraform output).

output "api_url" {
  description = "URL da API neste ambiente"
  value       = "http://localhost:${var.api_host_port}"
}

output "db_connection_string" {
  description = "String de conexão para usar do seu computador (contém a senha)"
  value       = "postgresql://${var.db_user}:${var.db_password}@localhost:${var.db_host_port}/${var.db_name}"
  sensitive   = true # ver com: terraform output -raw db_connection_string
}
