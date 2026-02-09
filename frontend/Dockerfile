FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for API URLs (set at build time or runtime)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FSD_API_URL
ARG NEXT_PUBLIC_FCS_API_URL
ARG NEXT_PUBLIC_DMA_API_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FSD_API_URL=$NEXT_PUBLIC_FSD_API_URL
ENV NEXT_PUBLIC_FCS_API_URL=$NEXT_PUBLIC_FCS_API_URL
ENV NEXT_PUBLIC_DMA_API_URL=$NEXT_PUBLIC_DMA_API_URL

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
