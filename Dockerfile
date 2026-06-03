FROM mirror.gcr.io/library/node:22-alpine
WORKDIR /app
COPY package*.json ./
# No dependencies to install as per README
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "src/server.js"]