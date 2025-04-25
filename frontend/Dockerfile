FROM node:22.13.1-slim AS deps
WORKDIR /app

COPY package.json ./
RUN corepack enable && yarn install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . ./
RUN rm -f .env
COPY .env.docker .env

RUN yarn build


FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
COPY --from=builder /app/public          ./public
COPY --from=builder /app/.env ./.env 

EXPOSE 3000
CMD ["./server.js"] 