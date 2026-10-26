FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /data
ENV DB_PATH=/data/klepagram.db
CMD ["node","--no-warnings","server.js"]
