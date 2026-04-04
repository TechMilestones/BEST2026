FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

# Copy the replaced dependency directory (required for go mod download)
COPY go-dataflash/ ./go-dataflash/

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/parser-ms ./cmd/parser-ms

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/parser-ms .

EXPOSE 8080

CMD ["./parser-ms"]
