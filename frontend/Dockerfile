FROM node:20.11.1-alpine AS node-build

WORKDIR /app
COPY package*.json /app/

RUN npm i
COPY . /app

RUN npm run build


FROM node-build AS dev-run
CMD ["npm", "run", "start"]


FROM nginx:1.23-alpine as prod-run

COPY --from=node-build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
