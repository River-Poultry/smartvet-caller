FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p logs
EXPOSE 4600
CMD ["node", "src/index.js"]
