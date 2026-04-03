FROM golang:1.25-alpine

WORKDIR /app

COPY ./go-dataflash/ ./go-dataflash/

# Download dependencies first (cached layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

EXPOSE 8080

CMD ["/app/server"]

# Usage (in project root):
# docker build -t server -f cmd/server/Dockerfile .
# docker run --rm -p 8080:8080 server
