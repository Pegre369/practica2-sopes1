FROM node:17-alpine3.14
WORKDIR /gRPC-Server-Node
COPY . .
RUN npm install
EXPOSE 50051
CMD ["npm","run","dev"]