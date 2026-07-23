FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json yarn.lock .yarnrc.yml ./
COPY api ./api
COPY frontend/package.json ./frontend/
COPY admin/package.json ./admin/
RUN yarn install --immutable
WORKDIR /app/api
RUN yarn build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=build /app/api/package.json ./api/package.json
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/node_modules ./api/node_modules
WORKDIR /app/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
