package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var ADDRMONGO = "mongodb://admindb:1234@35.219.131.202:27017"
var NAMEDB = "Logs"
var NAMECOLL = "log"

type Game struct {
	Juegoid        string `json:"juegoid"`
	Cantjugadores  string `json:"cantjugadores"`
	Nombrejuego    string `json:"nombrejuego"`
	Jugadorganador int    `json:"jugadorganador"`
	Queue          string `json:"queue"`
}

func FromJSON(data []byte) Game {
	game := Game{}
	err := json.Unmarshal(data, &game)
	if err != nil {
		panic(err)
	}
	return game
}

func main() {
	fmt.Println("Starting RabbitMQ consumer...")
	time.Sleep(7 * time.Second)

	// Dial connection to broker
	conn, err := amqp.Dial(brokerAddr())
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	//Open communication channel
	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	//Declare the queue
	q, err := ch.QueueDeclare(
		queue(), // name
		true,    // durable
		false,   // delete when unused
		false,   // exclusive
		false,   // no-wait
		nil,     // arguments
	)
	failOnError(err, "Failed to declare a queue")

	// register and fet a message consumer
	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	failOnError(err, "Failed to register a consumer")

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			log.Printf("Received a message: %+v", FromJSON(d.Body))
			SaveLogMongo(d.Body)
		}
	}()

	log.Printf(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}

func brokerAddr() string {
	brokerAddr := os.Getenv("BROKER_ADDR")
	if len(brokerAddr) == 0 {
		brokerAddr = "amqp://guest:guest@localhost:5672/"
	}
	return brokerAddr
}

func queue() string {
	queue := os.Getenv("QUEUE")
	if len(queue) == 0 {
		queue = "default-queue"
	}
	return queue
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}

func SaveLogMongo(bjsonLog []byte) {

	// Get Struct Log
	logsobj := Game{}
	err := json.Unmarshal(bjsonLog, &logsobj)
	if err != nil {
		fmt.Println("Error al decodificar")
		return
	}

	// Database connection
	client, err := mongo.NewClient(options.Client().ApplyURI(ADDRMONGO))
	if err != nil {
		fmt.Println("Error de Conexion-1")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Connect(ctx)
	if err != nil {
		fmt.Println("Error de Conexion-2")
		return
	}
	defer client.Disconnect(ctx)

	dbLogs := client.Database(NAMEDB).Collection(NAMECOLL)

	// Insert Value
	_, err = dbLogs.InsertOne(ctx, logsobj)
	if err != nil {
		fmt.Println("Not inserted")
		fmt.Println(err)
	} else {
		fmt.Println("New data inserted")
	}
}
