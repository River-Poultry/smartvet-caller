FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 10000
CMD ["sh", "-c", "node src/migrations/run.js && node src/index.js"]
