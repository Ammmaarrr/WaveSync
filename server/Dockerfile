# syntax=docker/dockerfile:1
FROM node:18-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install deps (include dev deps to build)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/server.js"]
