FROM node:22.13.1-slim AS builder

WORKDIR /app

COPY package.json drizzle.config.ts tsconfig.json custom.d.ts ./

RUN corepack enable

COPY src ./src

RUN yarn config set nodeLinker node-modules \
    && yarn workspaces focus --all \
    && yarn drizzle-kit generate \
    && yarn build

FROM node:22.13.1-slim

# Créer un utilisateur non-root pour la sécurité
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Changer le propriétaire du répertoire
RUN chown -R appuser:appuser /app

# Copier les fichiers depuis le builder
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/drizzle ./drizzle
COPY --from=builder --chown=appuser:appuser /app/package.json ./package.json
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --chown=appuser:appuser .env.docker .env

# Passer à l'utilisateur non-root
USER appuser

EXPOSE 3001

CMD ["node", "./dist/src/index.js"]