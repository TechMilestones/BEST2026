# Stage 1: Build
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY go.mod go.sum ./

# Copy the dependency directory
COPY go-dataflash/ ./go-dataflash/

# Pre-download modules using cache mount
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy the entire source
COPY . .

# Build the binary using cache mounts for build and module cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/parser-ms ./cmd/parser-ms

# Stage 2: Final Image
FROM alpine:latest

WORKDIR /app

# Install certificates and update
RUN apk --no-cache add ca-certificates && \
    update-ca-certificates

# Copy the binary from the builder
COPY --from=builder /app/parser-ms .

EXPOSE 8080

CMD ["./parser-ms"]
