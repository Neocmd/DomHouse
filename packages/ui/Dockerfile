FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ui/package.json ./packages/ui/
RUN npm install --workspace=@domhouse/ui
COPY packages/ui ./packages/ui
RUN cd packages/ui && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone output with outputFileTracingRoot=workspace root:
#   server.js           → /app/server.js
#   packages/ui/.next/  → /app/packages/ui/.next/
COPY --from=builder /app/packages/ui/.next/standalone ./
COPY --from=builder /app/packages/ui/.next/static ./packages/ui/.next/static
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
