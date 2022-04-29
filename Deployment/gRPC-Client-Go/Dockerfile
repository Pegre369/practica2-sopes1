FROM golang

RUN CGO_ENABLED=0

WORKDIR /gRPC-Client-Go

COPY . .

RUN go mod download

RUN chmod +x /gRPC-Client-Go

EXPOSE 2000

CMD ["go", "run", "gRPC-Client.go"]