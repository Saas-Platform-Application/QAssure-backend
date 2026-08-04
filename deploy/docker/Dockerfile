# ============================================
# QAssure Platform - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm prune --production

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S qassure -u 1001 -G nodejs

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=builder --chown=qassure:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=qassure:nodejs /app/package*.json ./
COPY --from=builder --chown=qassure:nodejs /app/src ./src
COPY --from=builder --chown=qassure:nodejs /app/server.js ./
COPY --from=builder --chown=qassure:nodejs /app/app.js ./

RUN mkdir -p /app/uploads /app/logs && \
    chown -R qassure:nodejs /app/uploads /app/logs

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

USER qassure

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]

ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="QAssure Platform API" \
      org.opencontainers.image.description="Enterprise Quality Management System API" \
      org.opencontainers.image.vendor="QAssure"
