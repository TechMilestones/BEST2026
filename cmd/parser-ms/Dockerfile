# Use a stable Go version
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy all go.mod and go.sum files (if they exist at root)
COPY go.mod go.sum ./
RUN go mod download

# Copy the entire workspace to get shared packages like 'log-parser'
COPY . .

# Build from the specific subdirectory
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/parser-ms ./cmd/parser-ms

# Final lightweight stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/parser-ms .

EXPOSE 8080

CMD ["./parser-ms"]

