FROM node:slim

COPY . .

RUN npm install --omit=dev

ENTRYPOINT ["node", "/lib/main.js"]
