# <center>Practica #2 - Manual técnico 201712132 </center>

# Arquitectura
A continuacion podra observar la arquitectura armada con el codigo fuente del repositorio
es importante mencionar que posteriormente se realizara una breve explicacion de las tecnologias
utilizadas.
![](./img/arquitectura.png)

# Archivos de Manifiesto

#### deployment-app.yaml
Se encuentra dentro de la carpeta Deployment, en el encontrara el archivo de manifiesto
utilizado para poder implementar el Deployment que se observa en la arquitectura.

#### rabbitmq-pod.yaml y rabbitmq-tcp-service.yaml
Se encuentra dentro del directorio Rabbitmq el cual sirve para poder subir el Pod
del servicio de rabbit a utilziar

#### rabbitmq-consumer-pod.yaml y rabbitmq-consumer-service.yaml
Se encuentra dentro del directorio Rabbitmq/ConsumerRabbitMq el cual sirve para poder subir el Pod
del suscriber de Rabbit


### Para esta fase del proyecto se implementaron los siguentes servicios en Kubernetes:
### Pod con rabbit 
### Pod con el consumidor de rabbit
### Un deployment con un cliente y servidor en Grpc
### Virtual Machine con mongo

### Estas son las tecnologias utilizadas en esta fase:
* ### Go
* ### Nodejs
* ### Mongo DB
* ### Kubernetes
* ### GCP



>## gRPC 
gRPC es un moderno sistema de llamada a procedimiento remoto que procesa la comunicación en estructuras cliente-servidor distribuidas de manera especialmente eficiente gracias a una innovadora ingeniería de procesos. Actúa en el nivel del proceso, al igual que su antecesor, el sistema RPC.  

Un elemento característico de la comunicación entre procesos mediante gRPC es el principio de transparencia: la colaboración entre instancias (en parte muy) distanciadas es tan estrecha y sencilla que no se percibe ninguna diferencia en comparación con una comunicación local entre procesos internos de una máquina.    

Para fines del proyecto se tuvo que realizar de la siguiente manera:
>### Client Go -> Server Nodejs

Para esta parte se implemnto en go lo que es el cliente de la siguiente manera:

creamos un archivo de go llamad **gRPC-client.go** la cual esta estructurado de la siguiente manera:

```proto
syntax = "proto3";

option go_package = "github.com/racarlosdavid/demo-gRPC/proto";

package proto;

service ServicioNodejs {
  rpc IniciarJuego (PlayerGameRequest) returns (PlayerGameReply) {}
}

message PlayerGameRequest {
  string players = 1;
  string game = 2;
}

message PlayerGameReply {
  string mensajeganador = 1;
}

```
En este archivo tenemos la estructura que vamos a utilizar para nuestro servicio de grpc de go, para poder hacer la peticion a nuestro server de grpc de nodejs

una vez terminamos de compilarlo, procedemos hacer las importaciones necesarias
```go

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	pb "github.com/racarlosdavid/demo-gRPC/proto"
	"google.golang.org/grpc"
)
```
Primero tenemos las importaciones las cuales las hacemos con nuestro go.mod, para poder implementar lo que gRPC, necesitamos tener instalado lo siguiente:

* Dependencias de google
```
go get -u google.golang.org/grpc

go get github.com/golang/protobuf/proto@v1.5.2

go get google.golang.org/protobuf/reflect/protoreflect@v1.27.1

go get google.golang.org/protobuf/runtime/protoimpl@v1.27.1

```
  
* Dependencias para compilar el .proto
```
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.26

go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.1

export PATH="$PATH:$(go env GOPATH)/bin"

protoc --go_out=. --go_opt=paths=source_relative --go-grpc_out=. --go-grpc_opt=paths=source_relative proto/demo.proto
```

al momento de compilar, tenemos que tener cuidado con la ubicacion de nuestro archivo .proto, ya que en el ejemplo esta claramente que no estamos dentro de la carpeta llamada proto, asi que se hace referencia como si fuera una ruta a partir del nivel de archivos que estemos.

Una vez con esas dependencias instaladas procedemos a la estructura del proyecto


```go
//Aqui definimos nuestra struc a enviar a nuestro server
type GameJson struct {
	Game_id   string `json: game_id`
	Jugadores string `json: jugadores`
}

// Definimos una ruta para probar que si este bien creado el archivo
func IndexHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("API GO - gRPC Client!\n"))
}

//Aqui es donde utilizamos nuestros parametros creados en nuestro archivo proto
func StarGame(w http.ResponseWriter, r *http.Request) {
	var Jugador GameJson

	reqBody, err := ioutil.ReadAll(r.Body)

	json.Unmarshal(reqBody, &Jugador)

	//fmt.Println(Jugador)

	// en esta parte hacemos la conexion con nuestro server
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewServicioNodejsClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

    //Y para finalizar aqui buscamos nuestro Request del servicio grpc que el cual esta mandando un reply y esta esperando una respuesta.
	reply, err := c.IniciarJuego(ctx, &pb.PlayerGameRequest{
		Players: Jugador.Jugadores,
		Game:    Jugador.Game_id,
	})
	if err != nil {
		log.Fatalf("No se puede ingresar la informacion: %v", err)
	}
	//log.Printf("Greeting: %s", reply.GetMensajeganador())
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(reply.GetMensajeganador())
}

func main() {
	router := mux.NewRouter().StrictSlash(false)
	router.HandleFunc("/", IndexHandler)
	router.HandleFunc("/StarGame", StarGame).Methods("POST")
	router.HandleFunc("/Prueba", Prueba).Methods("POST")
	log.Println("Listening at port 2000")
	log.Fatal(http.ListenAndServe(":2000", router))
}
```
Una vez terminamos nuestro cliente, procedemos a nuestro server llamado **gRPC-server-Node**

Para esta parte lo unico que necesitamos es copiar la carpeta proto utilizada en nuestro cliente go, para luego iniciar a crear nuestro servidor grpc:
```js

var PROTO_PATH = './proto/demo.proto';
var amqp = require('amqplib/callback_api');
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
var demo_proto = grpc.loadPackageDefinition(packageDefinition);
```
Primero hacemos las importaciones necesarias para nuestro servidor, en el cual podemos apreciar que el **PROTO_PATH,** **packageDefinition,** **grpc**, **protoLoader**, son aquellas variables que nos permiten utilizar las funciones del .proto.

cuando terminamos iniciamos a recibir lo que el cliente nos mando:

```js
//Tenemos la funcion que es donde recibimos la informacion
function IniciarJuego(call, callback) {

 //De esta manera, call.nombre del request.atributo de esta manera es que sacamos la informacion que necesitamos
  const cant_Jugadores = call.request.players
  const num_Juego = call.request.game
  var Winner
  
  var msg_erik = {
    juegoid: '123',
    cantjugadores: '5',
    nombrejuego: 'JP Morgan',
    jugadorganador: 'Senior Application Engineer',
    queue_rabbit : 'RabbitMQ'
  };

  if (num_Juego == 1) {
    Winner = Juego1(cant_Jugadores)
    msg_erik = {
      juegoid: '1',
      cantjugadores: cant_Jugadores,
      nombrejuego: 'Juego_Random',
      jugadorganador: Winner,
      queue_rabbit : 'RabbitMQ'
    };

  } else if (num_Juego == 2) {
    Winner = Juego2(cant_Jugadores)
    msg_erik = {
      juegoid: '2',
      cantjugadores: cant_Jugadores,
      nombrejuego: 'Pelea_Impares_Pares',
      jugadorganador: Winner,
      queue_rabbit : 'RabbitMQ'
    };

  } else if (num_Juego == 3) {
    Winner = Juego3(cant_Jugadores)
    msg_erik = {
      juegoid: '3',
      cantjugadores: cant_Jugadores,
      nombrejuego: 'Ruleta_no_rusa',
      jugadorganador: Winner,
      queue_rabbit : 'RabbitMQ'
    };

  } else if (num_Juego == 4) {
    Winner = Juego4(cant_Jugadores)
    msg_erik = {
      juegoid: '4',
      cantjugadores: cant_Jugadores,
      nombrejuego: 'La_posicion_de_la_Suerte',
      jugadorganador: Winner,
      queue_rabbit : 'RabbitMQ'
    };

  } else if (num_Juego == 5) {
    Winner = Juego5(cant_Jugadores)
    msg_erik = {
      juegoid: '5',
      cantjugadores: cant_Jugadores,
      nombrejuego: 'La_Ultima_Bala',
      jugadorganador: Winner,
      queue_rabbit : 'RabbitMQ'
    };

  } else {
    Winner = 0
  }

  console.log('El ganador del juego numero ', num_Juego, ' a sido el jugador no: ', Winner);

  /*Rabbit*/
   amqp.connect('amqp://guest:guest@localhost:5672/', function (error0, connection) {
    if (error0) {
      //console.log("Entra al Error");
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        console.log("Entra al Error");
        throw error1;
      }
      var queue = 'default-queue';

      channel.assertQueue(queue, {
        durable: true
      });

      channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg_erik)));;

      //msg_erik es el objeto a enviar con los datos del juego
      console.log(" [x] Sent %s", msg_erik);
    });

    setTimeout(function() {
      connection.close();
      }, 500);

  });

 

  /*Rabbit*/

//En esta parte tenemos la respuesta que se le manda al cliente en un formato json.
  callback(null, { mensajeganador: 'El ganador del juego numero ' + num_Juego + ' a sido el jugador no: ' + Winner });
}

function main() {
  var server = new grpc.Server();
  server.addService(demo_proto.ServicioNodejs.service, {
    IniciarJuego: IniciarJuego
  });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log('gRPC server on port 50051')
  });
}

//Juego_Random
function Juego1(LimJugadores) {
  var ale

  ale = Math.floor(Math.random() * (LimJugadores) + 1);
  //console.log(ale)

  return ale
}

//Pelea_Impares_Pares
function Juego2(LimJugadores) {
  var ale
  var par
  var num1 = 1;

  while (num1 != 0) {

    ale = Math.floor(Math.random() * (LimJugadores) + 1);
    //console.log(ale)
    num1 = (ale % 2)
    //console.log(num1)

  }

  par = ale

  var num2 = 0
  var impar

  while (num2 == 0) {

    ale = Math.floor(Math.random() * (LimJugadores) + 1);
    //console.log(ale)
    num2 = (ale % 2)
    //console.log(num2)

  }

  impar = ale


  if (par > impar) {
    return par
  } else {
    return impar
  }

}

//Ruleta_no_rusa
function Juego3(LimJugadores) {

  var ale
  var ruleta = []

  for (i = 0; i <= 5; i++) {
    ale = Math.floor(Math.random() * (LimJugadores) + 1)
    //fmt.Println(ale)
    ruleta.push(ale)
  }

  //console.log(ruleta)

  ale = Math.floor(Math.random() * (5))

  //console.log(ale)

  return ruleta[ale]
}

//La_posicion_de_la_Suerte
function Juego4(LimJugadores) {

  var ale
  var Lista = []

  for (i = 0; i <= 9; i++) {
    ale = Math.floor(Math.random() * (LimJugadores) + 1)
    //fmt.Println(ale)
    Lista.push(ale)
  }

  //console.log(Lista)

  return Lista[6]
}

//La_Ultima_Bala
function Juego5(LimJugadores) {

  var ale
  var Lista = []

  for (i = 11; i >= 0; i--) {
    ale = Math.floor(Math.random() * (LimJugadores) + 1)
    //fmt.Println(ale)
    Lista.push(ale)
  }

  //console.log(Lista)

  return Lista[11]
}


main();

```






<br>
<br>

# <img src="https://pbs.twimg.com/profile_images/1223261138059780097/eH73w5lN_400x400.jpg" width="50">  RabbitMq
`
    RabbitMQ es un software de negociación de mensajes de código abierto que funciona como un middleware de mensajería. Implementa el estándar Advanced Message Queuing Protocol
`
## Requerimientos
Para la creacion del contenedor utilizamos una imagen que trae configurado el puerto de administracion
el cual se encuentra por defecto en el 15671, configurando los demas puertos necesarios para el funcionamiento de rabbit
y que asi este pueda escuchar recibiendo interfaces.

    - Imagen rabbitmq:3.9.5-managment
    - Libreria Cliente amqp

#### Variables de entorno Importantes
    - BROKER_ADDR=amqp://guest:guest@rabbitmq:5672/
    - QUEUE=test-queue
    - RABBITMQ_DEFAULT_USER=guest
    - RABBITMQ_DEFAULT_PASS=guest

### Producer (Node)
En el se establecio la Declaracion de conexion al broker, asi como el canal de comunicacion. Ademas se declaro la cola
a la que se estaran enviando las interfaces.

### Suscriber (Golang)
En el se declara la cola y se establece un canal de conexion, para que este pueda estar enlazado a la espera de interfaces
que pueda consumir y registrarlas en las bases de datos.