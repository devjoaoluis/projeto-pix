# syntax=docker/dockerfile:1
#
# Multi-stage: o estágio "build" tem tudo para compilar (TypeScript, Nest CLI,
# drizzle-kit). O estágio "runtime" copia só o resultado (dist/) e as
# dependências de produção, então a imagem final é bem menor e mais segura.

# ---------- Estágio 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copiar só os manifestos primeiro aproveita o cache: se package*.json não
# mudou, o Docker reaproveita o `npm ci` e o build fica rápido.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Estágio 2: runtime (imagem final) ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Não rodar como root dentro do container.
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
