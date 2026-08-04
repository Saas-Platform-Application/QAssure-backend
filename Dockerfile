# ============================================
# QAssure Platform - Production Dockerfile
# ============================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Run any build steps (if needed)
# RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime dependencies for PDF rasterization/multimodal parsing
RUN apk add --no-cache graphicsmagick ghostscript

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 qassure

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=qassure:nodejs . .

# Remove unnecessary files
RUN rm -rf .git .env.example tests docs .github

# Switch to non-root user
USER qassure

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start application with migrations
CMD sh -c "node src/migrations/migrate.js && node server.js"
