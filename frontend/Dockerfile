# Build stage
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage: Serve static files
FROM halverneus/static-file-server:latest
COPY --from=build /app/dist /web
# The default port for this image is 8080, but we can configure it
ENV PORT=3000
# SPA fallback: handle all non-existent paths by serving index.html
ENV ABSENT_TERMINAL=/index.html
EXPOSE 3000
