FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 python3-venv ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY backend/scripts/listening-asr-requirements.txt /tmp/listening-asr-requirements.txt
RUN python3 -m venv /opt/listening-asr && /opt/listening-asr/bin/pip install --no-cache-dir -r /tmp/listening-asr-requirements.txt
ENV LISTENING_ASR_PYTHON=/opt/listening-asr/bin/python
ENV LISTENING_ASR_MODEL_DIR=/app/storage/models/base.en
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/models ./models
COPY --chown=node:node backend/scripts/ ./scripts/
RUN mkdir -p /app/storage/listening /app/storage/models /app/storage/asr-input && chown -R node:node /app/storage
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
