# Stage 1: Build
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Download dependencies first (cached layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/parser .

# Stage 2: Run
FROM alpine:3.21

COPY --from=builder /app/parser /usr/local/bin/parser

WORKDIR /out

CMD ["/usr/local/bin/parser"]

# Usage:
# docker build -t parser .
# docker run --rm -v $(pwd)/out:/out -v $(pwd)/data/flight-logs:/data --entrypoint sh parser -c '/usr/local/bin/parser /data/*.BIN'
