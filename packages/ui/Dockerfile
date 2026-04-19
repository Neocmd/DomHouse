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
COPY --from=builder /app/packages/ui/.next/standalone ./
COPY --from=builder /app/packages/ui/.next/static ./.next/static
EXPOSE 4000
ENV PORT=4000
CMD ["node", "server.js"]
