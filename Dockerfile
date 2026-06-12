FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data blog logs

EXPOSE 80 2222 2121 3306 8080

CMD ["node", "src/index.js"]
