# Production Dockerfile for High-Performance News CMS & Frontend
FROM oven/bun:alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source files
COPY . .

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["bun", "run", "src/index.ts"]
