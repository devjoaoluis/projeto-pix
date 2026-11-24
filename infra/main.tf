# Infraestrutura do projeto-pix como código, usando o provider "docker":
# o Terraform fala com o Docker Desktop e cria rede, volume, banco, seed e API.
# O mesmo desenho serviria para uma nuvem (AWS, Azure...) trocando o provider.
#
# Fluxo: terraform init -> terraform plan (mostra o que vai mudar)
#        -> terraform apply (cria) -> terraform destroy (apaga tudo)

terraform {
  required_version = ">= 1.5"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Provider = "plugin" que sabe falar com um sistema. host = null usa o padrão
# do computador (Docker Desktop no Windows, socket no Linux/Mac).
provider "docker" {
  host = var.docker_host
}

locals {
  # Prefixo que separa um ambiente do outro (pix-dev-..., pix-hom-..., pix-prd-...).
  name = "${var.project}-${var.environment}"

  # Dentro da rede Docker o banco é achado pelo nome do container, porta 5432.
  db_url = "postgresql://${var.db_user}:${var.db_password}@${local.name}-postgres:5432/${var.db_name}"
}

# ---------- Rede e volume ----------

# Rede privada: api, seed e banco conversam por aqui usando o nome do container.
resource "docker_network" "pix" {
  name = "${local.name}-net"
}

# Disco persistente: os dados do banco sobrevivem a um recriar do container.
resource "docker_volume" "pg_data" {
  name = "${local.name}-pg-data"
}

# ---------- Banco de dados ----------

resource "docker_image" "postgres" {
  name         = "postgres:15-alpine"
  keep_locally = true # `destroy` não apaga a imagem baixada
}

resource "docker_container" "postgres" {
  name    = "${local.name}-postgres"
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"

  env = [
    "POSTGRES_USER=${var.db_user}",
    "POSTGRES_PASSWORD=${var.db_password}",
    "POSTGRES_DB=${var.db_name}",
  ]

  ports {
    internal = 5432
    external = var.db_host_port
  }

  volumes {
    volume_name    = docker_volume.pg_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.pix.name
  }

  # Mesmo healthcheck do docker-compose. Com wait = true o Terraform só
  # considera o banco "criado" quando ele está healthy; é o que garante a
  # ordem banco -> seed -> api.
  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U ${var.db_user} -d ${var.db_name}"]
    interval = "5s"
    timeout  = "5s"
    retries  = 10
  }
  wait         = true
  wait_timeout = 120
}

# ---------- Imagens da aplicação ----------
# O Terraform NÃO constrói as imagens: elas vêm prontas (docker build local ou,
# no futuro, o GitHub Actions). Veja os comandos no README. Assim a infra fica
# separada do build e o terraform apply é rápido.

# ---------- Seed: roda uma vez e termina ----------

resource "docker_container" "seed" {
  name       = "${local.name}-seed"
  image      = var.seed_image
  command    = ["sh", "-c", "npm run db:migrate && npm run seed"]
  env        = ["DB_URL=${local.db_url}"]
  restart    = "no"
  must_run   = false # é esperado que ele termine
  attach     = true  # o Terraform espera o fim do seed antes de criar a API
  logs       = true
  depends_on = [docker_container.postgres]

  networks_advanced {
    name = docker_network.pix.name
  }
}

# ---------- API ----------

resource "docker_container" "api" {
  name       = "${local.name}-api"
  image      = var.api_image
  restart    = "unless-stopped"
  depends_on = [docker_container.seed]

  env = [
    "DB_URL=${local.db_url}",
    "PORT=3000",
    "TZ=${var.tz}",
    "JWT_SECRET=${var.jwt_secret}",
    "WEBHOOK_SECRET=${var.webhook_secret}",
  ]

  ports {
    internal = 3000
    external = var.api_host_port
  }

  networks_advanced {
    name = docker_network.pix.name
  }
}
