# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage: Serve static files
FROM halverneus/static-file-server:latest
# Copy build artifacts from the build stage
COPY --from=build /app/dist /web
# The default port for this image is 8080, but we can configure it
ENV PORT=3000
EXPOSE 3000
