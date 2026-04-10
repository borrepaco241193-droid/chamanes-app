# ============================================================
# Chamanes Backend — Production Dockerfile
# Multi-stage build: keeps final image lean and secure
# ============================================================

# Stage 1: Build (includes all deps + compiled output)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

# Copy everything from builder (includes prisma CLI + client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Railway sets PORT via environment — default to 3000
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run migrations with retry, then start server (as root to avoid permission issues)
CMD ["sh", "-c", "until node_modules/.bin/prisma migrate deploy; do echo 'DB not ready, retrying in 5s...'; sleep 5; done && node dist/index.js"]
