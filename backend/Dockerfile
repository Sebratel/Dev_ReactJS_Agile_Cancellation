FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --legacy-peer-deps || (cat /root/.npm/_logs/*-debug-0.log && exit 1)
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
# Padrao = perfil medium (docs/dimensionamento.md); o compose sobrescreve via BACKEND_HEAP_MB
ENV NODE_OPTIONS=--max-old-space-size=768
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget tzdata \
  && rm -rf /var/lib/apt/lists/*
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
USER node
EXPOSE 4000
CMD ["sh", "-c", "node prisma/heal-failed-migration.cjs; npx prisma migrate deploy || echo 'WARN: prisma migrate deploy failed; starting API anyway'; node dist/main.js"]
