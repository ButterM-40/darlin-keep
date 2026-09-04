# syntax=docker/dockerfile:1

# ---- dependencies -----------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/copy-pdf-worker.mjs ./scripts/
# postinstall copies the pdf.js worker into public/, so scripts/ must exist first.
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/pdfjs is gitignored and dockerignored, so the worker is copied in here
# rather than inherited from the context. Then the Prisma client is generated
# and the app compiled. No database is contacted: every route renders on
# demand, so nothing is prerendered at build time.
RUN node scripts/copy-pdf-worker.mjs \
    && npx prisma generate \
    && npx next build

# ---- migrations -------------------------------------------------------------
# Keeps the Prisma CLI and schema out of the runtime image; compose runs this
# once per start, before the app comes up.
FROM node:24-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma7.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/data/uploads

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# The standalone build carries its own trimmed node_modules; static assets and
# public/ are not included in it and have to be copied alongside.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

CMD ["node", "server.js"]
