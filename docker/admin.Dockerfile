FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json yarn.lock .yarnrc.yml ./
COPY admin ./admin
COPY api/package.json ./api/
COPY frontend/package.json ./frontend/
ARG NEXT_PUBLIC_API_URL=https://api.kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_SITE_URL=https://kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_CDN_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
RUN yarn install --immutable
WORKDIR /app/admin
RUN yarn build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/admin/public ./admin/public
COPY --from=build /app/admin/.next/standalone ./
COPY --from=build /app/admin/.next/static ./admin/.next/static
EXPOSE 3001
CMD ["node", "admin/server.js"]
