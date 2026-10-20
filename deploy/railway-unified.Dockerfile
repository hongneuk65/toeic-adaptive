FROM node:22-bookworm-slim AS backend-build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:22-bookworm-slim AS media-build
WORKDIR /assets
COPY deploy/fetch-release-media.cjs ./fetch-media.cjs
COPY deploy/media-release-manifest.json ./media-manifest.json
RUN node fetch-media.cjs

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production SERVE_FRONTEND=1 LISTENING_ASR_ENABLED=false EXAM_MEDIA_DIR=/app/media/exam
COPY --from=backend-build --chown=node:node /app/package*.json ./
COPY --from=backend-build --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/dist ./dist
COPY --from=backend-build --chown=node:node /app/prisma ./prisma
COPY --from=backend-build --chown=node:node /app/models ./models
COPY --from=frontend-build --chown=node:node /web/dist ./public
COPY --chown=node:node backend/scripts/ ./scripts/
COPY --from=media-build --chown=node:node /media/ ./media/exam/
RUN mkdir -p /app/storage/listening /app/storage/models && chown -R node:node /app/storage
USER node
EXPOSE 3000
CMD ["node", "scripts/boot-production.cjs"]
