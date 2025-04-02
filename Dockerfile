FROM golang:1.24-alpine AS builder

RUN apk --no-cache add ca-certificates gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o golab cmd/server/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/golab .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

EXPOSE 42069

CMD ["./golab"]
