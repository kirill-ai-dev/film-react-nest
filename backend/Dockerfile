FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json .eslintrc.js .prettierrc ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY public ./public

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
