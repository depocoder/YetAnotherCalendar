FROM node:20.11.1-alpine AS node-build

WORKDIR /app
COPY package*.json /app/

# --retry/--retry-delay are not real npm flags (npm silently ignores them);
# the actual retry knobs are fetch-retries/fetch-retry-*. The arm64 build
# under QEMU regularly hits ECONNRESET/ETIMEDOUT without them.
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=600000
COPY . /app

RUN npm run build


FROM node-build AS dev-run
CMD ["npm", "run", "start"]


FROM nginx:1.23-alpine AS prod-run

COPY --from=node-build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
