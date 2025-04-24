FROM node:22.13.1-slim AS deps
WORKDIR /app

COPY package.json ./
RUN corepack enable && yarn install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .

RUN yarn build


FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
COPY --from=builder /app/public          ./public

EXPOSE 4000
CMD ["node", "./server.js"]