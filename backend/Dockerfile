FROM node:20-alpine

WORKDIR /opt/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 1337

CMD ["npx", "tsx", "src/index.ts"]
