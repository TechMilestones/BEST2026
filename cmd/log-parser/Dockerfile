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
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/parser ./cmd/log-parser

# Stage 2: Final Image
FROM alpine:3.21

# Install certificates and update
RUN apk --no-cache add ca-certificates && \
    update-ca-certificates

# Copy the binary from the builder
COPY --from=builder /app/parser /usr/local/bin/parser

WORKDIR /out

CMD ["/usr/local/bin/parser"]

# Usage (in project root):
# docker build -t parser -f cmd/log-parser/Dockerfile .
# docker run --rm -v $(pwd)/data/telemetry:/out -v $(pwd)/data/flight-logs:/data --entrypoint sh parser -c '/usr/local/bin/parser /data/*.BIN'
