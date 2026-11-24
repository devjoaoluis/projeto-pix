# syntax=docker/dockerfile:1
# Estágio 1: compila o painel (Vite gera arquivos estáticos em dist/).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Mesmo caminho do proxy do nginx: o navegador chama /api/v1 na própria origem.
RUN npm run build

# Estágio 2: nginx serve os estáticos e encaminha /api para a API.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
