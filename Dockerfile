FROM node:current-alpine
COPY . /app
WORKDIR /app
RUN npm install
ENTRYPOINT [ "node", "index.js" ]
