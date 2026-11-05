# ==========================================
# Production Dockerfile for Express Backend
# ==========================================

FROM node:22-alpine

WORKDIR /opt/app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .

# Güvenlik: Uygulamayı yetkisiz (non-root) kullanıcı ile çalıştır
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p public/uploads && \
    chown -R appuser:appgroup /opt/app

USER appuser

EXPOSE 1337

CMD ["npx", "tsx", "src/index.ts"]
