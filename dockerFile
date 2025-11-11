FROM node:20-alpine

WORKDIR /app

# dependencies first
COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY . .

# create data dirs
RUN mkdir -p /app/data /app/data/media

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
