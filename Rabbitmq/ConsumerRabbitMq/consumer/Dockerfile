FROM golang

RUN CGO_ENABLED=0

WORKDIR /

COPY . .

RUN go mod download

RUN chmod +x /

CMD ["go", "run", "consumer/consumer.go"]