FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

RUN npx playwright install --with-deps chromium

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]