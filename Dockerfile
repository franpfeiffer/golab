FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o golab cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
RUN apk --no-cache add go
WORKDIR /app
COPY --from=builder /app/golab .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

EXPOSE 42069

CMD ["./golab"]
