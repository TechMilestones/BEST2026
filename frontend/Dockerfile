# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies using cache mount and npm ci for faster/reproducible builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Final stage: Serve static files using a lightweight server
FROM halverneus/static-file-server:latest
COPY --from=build /app/dist /web

# Configuration for static file server
ENV PORT=3000
ENV ABSENT_TERMINAL=/index.html
EXPOSE 3000
