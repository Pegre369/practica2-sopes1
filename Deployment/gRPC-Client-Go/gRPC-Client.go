package main

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	pb "github.com/racarlosdavid/demo-gRPC/proto"
	"google.golang.org/grpc"
)

// Estructura de la Peticion
type GameJson struct {
	Game_id   string `json: game_id`
	Jugadores string `json: jugadores`
}

/*
 *
 *		Funcion para la ruta de Inicio
 *
 *
 */
func IndexHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("API GO - gRPC Client!\n"))
}

/*
 *
 *		Funcion para la ruta de la peticion del Juego
 *
 *
 */
func StarGame(w http.ResponseWriter, r *http.Request) {
	var Jugador GameJson

	reqBody, err := ioutil.ReadAll(r.Body)

	json.Unmarshal(reqBody, &Jugador)
	log.Printf("Send: %+v", Jugador)

	// Set up a connection to the server.
	conn, err := grpc.Dial(serverAddr()+portserver(), grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewServicioNodejsClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	reply, err := c.IniciarJuego(ctx, &pb.PlayerGameRequest{
		Players: Jugador.Jugadores,
		Game:    Jugador.Game_id,
	})
	if err != nil {
		log.Fatalf("No se puede ingresar la informacion: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(reply.GetMensajeganador())
}

/*
 *
 *		Funcion principal
 *
 *
 */
func main() {
	router := mux.NewRouter().StrictSlash(false)
	router.HandleFunc("/", IndexHandler).Methods("GET")
	router.HandleFunc("/", StarGame).Methods("POST")
	port := port()
	log.Println("Listening at port ", port)
	log.Fatal(http.ListenAndServe(port, router))
}

func serverAddr() string {
	serverAddr := os.Getenv("SERVER_ADDR")
	if len(serverAddr) == 0 {
		serverAddr = "localhost"
	}
	return serverAddr
}

func port() string {
	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "2000"
	}
	return ":" + port
}

func portserver() string {
	portserver := os.Getenv("PORT_SERVER")
	if len(portserver) == 0 {
		portserver = "50051"
	}
	return ":" + portserver
}
