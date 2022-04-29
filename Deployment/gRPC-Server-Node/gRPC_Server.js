// Path de la estructura Proto
var PROTO_PATH = './proto/demo.proto';
// Libreria para conectar a RabbitMQ
var amqp = require('amqplib/callback_api');
// Libreria para utilizar grpc
var grpc = require('@grpc/grpc-js');
// Para enviar el proto 
var protoLoader = require('@grpc/proto-loader');
// Variables de entorno
require('dotenv').config()

// Configuracion del Proto
var packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

// Agregamos las configuraciones  
var demo_proto = grpc.loadPackageDefinition(packageDefinition);


/**
 * 
 * 
 *          Funciones para rutas
 * 
 * 
 */


// Funcion para Ejecutar el juego
function IniciarJuego(call, callback) {
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
   amqp.connect(`${process.env.BROKER_ADDR}`, function (error0, connection) {
    if (error0) {
      console.log(`No es posible establecer la conexion ${process.env.BROKER_ADDR}`);
      return
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        console.log("No es posible establecer el canal del broker");
        return
      }
      var queue = `${process.env.QUEUE}`;

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

  callback(null, { mensajeganador: 'El ganador del juego numero ' + num_Juego + ' a sido el jugador no: ' + Winner });
}


/**
 * 
 * 
 *          Funcion principal
 * 
 * 
 */

function main() {

  // Servidor de gRPC  
  var server = new grpc.Server();
  
  // Agregamos el servicio al servidor
  server.addService(demo_proto.ServicioNodejs.service, {
    IniciarJuego: IniciarJuego
  });

  // Iniciamos el servidor
  server.bindAsync(`${process.env.SERVER_ADDR}:${process.env.SERVER_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log(`gRPC server on port ${process.env.SERVER_PORT}`)
  });

}

/**
 * 
 * 
 *          Juegos
 * 
 * 
 */

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