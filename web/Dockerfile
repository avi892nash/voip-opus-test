# Two-stage build: compile static assets with Node, serve with nginx.

FROM node:20-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY web/ ./
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_TURN_URL
ARG VITE_TURN_USERNAME
ARG VITE_TURN_CREDENTIAL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
