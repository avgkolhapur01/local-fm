FROM node:22-slim

WORKDIR /app

COPY package*.json ./
COPY server/package.json ./server/package.json
RUN npm ci --workspace server

COPY server ./server
RUN npm run build -w server

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start", "-w", "server"]
