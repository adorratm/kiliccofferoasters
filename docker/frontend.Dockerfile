FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
# Paylaşımlı VPS — OOM (exit 137) önleme
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV YARN_NETWORK_CONCURRENCY=2
ENV YARN_ENABLE_GLOBAL_CACHE=false

COPY package.json yarn.lock .yarnrc.yml ./
COPY frontend ./frontend
COPY api/package.json ./api/
COPY admin/package.json ./admin/
ARG NEXT_PUBLIC_API_URL=https://api.kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_SITE_URL=https://kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.kiliccoffeeroaster.com.tr
ARG NEXT_PUBLIC_CDN_URL=
ARG NEXT_PUBLIC_GA4_ID=
ARG NEXT_PUBLIC_GTM_ID=
ARG NEXT_PUBLIC_META_PIXEL_ID=
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
RUN yarn workspaces focus @kilic/frontend
WORKDIR /app/frontend
RUN yarn build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/frontend/public ./frontend/public
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
EXPOSE 3000
CMD ["node", "frontend/server.js"]
