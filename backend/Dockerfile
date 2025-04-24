FROM node:22.13.1-slim AS builder

WORKDIR /app

COPY package.json drizzle.config.ts tsconfig.json custom.d.ts ./

RUN corepack enable

COPY src ./src

RUN yarn config set nodeLinker node-modules \
    && yarn workspaces focus --all \
    && yarn drizzle-kit generate \
    && yarn build

FROM gcr.io/distroless/nodejs22-debian12:nonroot
    
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "./dist/server.js"]