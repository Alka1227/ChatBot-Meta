const fs = require("fs");
const path = require("path");
const { enviarMensajeTexto } = require("./whatsappTemplates");

const sendTextMessage = enviarMensajeTexto;

const jokes = [
  "Por que los pajaros no usan Facebook? Porque ya tienen Twitter.",
  "Que le dice un jardinero a otro? Nos vemos cuando podamos.",
  "Como se despiden los quimicos? Acido un placer.",
  "Por que la computadora fue al doctor? Porque tenia un virus.",
  "Que hace una abeja en el gimnasio? Zum-ba.",
  "Por que el libro de matematicas estaba triste? Porque tenia muchos problemas.",
  "Que le dice una impresora a otra? Esa hoja es tuya o es impresion mia?",
  "Por que no se puede confiar en un atom? Porque lo componen todo.",
  "Que hace una vaca cuando sale el sol? Sombra.",
  "Por que el tomate se sonrojo? Porque vio al pepino sin ropa.",
  "Como maldice un pollito a otro pollito? Caldito seas.",
  "Que le dice un pez a otro pez? Nada.",
  "Por que el cafe fue a la policia? Porque lo estaban moliendo.",
  "Que le dice una iguana a su hermana gemela? Somos iguanitas.",
  "Por que el reloj fue al gimnasio? Para ponerse en hora.",
  "Que le dice una pared a otra pared? Nos vemos en la esquina.",
  "Que hace una caja en el gimnasio? Crossfit.",
  "Por que el lapiz esta feliz? Porque tiene buena punta.",
  "Que le dijo el cero al ocho? Bonito cinturon.",
  "Por que el hielo no se pelea? Porque se derrite.",
  "Que hace un perro con un taladro? Taladrando.",
  "Por que los esqueletos no pelean entre ellos? Porque no tienen agallas.",
  "Como se llama el primo vegetariano de Bruce Lee? Broco Lee.",
  "Que hace una naranja en la playa? Tomando fanta sol.",
  "Por que la escoba esta contenta? Porque barre con todo.",
  "Que le dice un semaforo a otro? No me mires, me estoy cambiando.",
  "Como se llama un boomerang que no vuelve? Palo.",
  "Por que el mar nunca se seca? Porque no sabe sumar.",
  "Que hace una uva cuando la pisan? Da vino.",
  "Por que el panadero no pudo dormir? Porque tenia mucho pan-samiento.",
  "Como se llama el campeon de buceo japones? Tokofondo.",
  "Y el subcampeon? Kasitoko.",
  "Por que el celular fue al psicologo? Porque tenia muchas llamadas perdidas.",
  "Que hace un mago despues de comer? Magordito.",
  "Por que la luna va al medico? Porque tiene estrellas.",
  "Que le dice un techo a otro techo? Techo de menos.",
  "Por que el libro de historia estaba nervioso? Porque tenia examenes del pasado.",
  "Como se llama el pez mas divertido? El pez payaso.",
  "Que le dijo una cuchara a la gelatina? No tiembles, todo saldra bien.",
  "Por que la silla fue a terapia? Porque no se sentia bien.",
  "Que hace una foca en una computadora? Sella archivos.",
  "Como se llama un gato que toca piano? Gatethoven.",
  "Por que el robot estaba cansado? Porque trabajo a full carga.",
  "Que hace una gallina en una iglesia? Reza por sus pollitos.",
  "Como se dice pelo sucio en chino? Chin cham pu.",
  "Que le dice un gusano a otro gusano? Voy a dar una vuelta a la manzana.",
  "Por que el avion no pudo estudiar? Porque siempre estaba en modo avion.",
  "Que hace una taza en una obra de teatro? Hace de cafe-cio.",
  "Como se llama un dinosaurio que duerme? Dino-snorio.",
  "Por que la pizza se graduo? Porque estaba muy completa.",
  "Que le dice un cable a otro cable? Somos buena conexion.",
  "Por que el numero 7 comio con tenedor? Porque el 8 ya habia comido.",
  "Que hace un pato en una farmacia? Pide pan-tol.",
  "Como se llama el rey de los quesos? Requeson.",
  "Por que la nube no cuenta secretos? Porque se le escapan.",
  "Que hace una tecla en la playa? Toma espacio.",
  "Por que el volcan no se enoja? Porque explota de alegria.",
  "Como se llama un oso sin dientes? Oso gomoso.",
  "Que le dice una oveja a otra oveja? Beee-n dia.",
  "Por que la bicicleta no se levanta sola? Porque esta dos-tirada.",
  "Que hace un leon en un gimnasio? Musculo felino.",
  "Como se llama un mosquito que canta? Mosquiton.",
  "Por que la cebolla siempre llora? Porque es muy sensible.",
  "Que hace una computadora en el mar? Navega por internet.",
  "Por que la tortilla no se pelea? Porque se dobla facil.",
  "Como se llama un perro mago? Labracadabrador.",
  "Que hace un pez en la escuela? Nada de nada.",
  "Por que el sol no va a la universidad? Porque ya tiene muchos rayos.",
  "Que le dice un martillo a un clavo? Agarrate que alla voy.",
  "Como se llama un elefante que no importa? Irrelefante.",
  "Por que el arbol se metio a internet? Para tener mas ramas.",
  "Que hace una banana con capa? Superplatano.",
  "Por que la letra A fue al doctor? Porque estaba afonica.",
  "Como se llama un pajaro sin plumas? Un pelicano en verano.",
  "Que hace un teclado en misa? Da el enter.",
  "Por que el agua nunca discute? Porque siempre fluye.",
  "Que le dice una calculadora a un estudiante? Puedes contar conmigo.",
  "Como se llama un gato gigante? Michilin.",
  "Por que el pastel fue al dentista? Porque tenia caries de chocolate.",
  "Que hace una estrella en clase? Brilla por su ausencia.",
  "Por que la puerta no se estresa? Porque siempre se abre.",
  "Como se llama un pan que se cae bien? Panita.",
  "Que hace una pelota en la oficina? Rebota ideas.",
  "Por que el champu no cuenta chismes? Porque se enjuaga.",
  "Que le dice una cama a otra cama? Te veo en suenos.",
  "Como se llama un mosquito optimista? Posi-tito.",
  "Por que el queso no corre maratones? Porque se derrite en la meta.",
  "Que hace un reloj en la cocina? Marca la hora del saz-on.",
  "Por que la sal no canta? Porque le falta pimienta.",
  "Como se llama el amigo del cafe? El companero de taza.",
  "Que hace una moneda en la nieve? Frio de cambio.",
  "Por que el cuaderno se enojo? Porque le arrancaron la hoja.",
  "Como se llama un zapato inteligente? Sapiente.",
  "Que hace una lampara triste? Se apaga.",
  "Por que el helado fue al banco? Para congelar su cuenta.",
  "Que le dice un foco a otro foco? Brillas hoy.",
  "Como se llama un cafe que acaba de nacer? Expresito.",
  "Por que la mesa no miente? Porque tiene cuatro patas de verdad.",
  "Que hace una sopa en internet? Busca caldo de cultivo.",
  "Como se llama un conejo elegante? Conejames Bond.",
  "Por que el globo no fue al cole? Porque se le escapaban las respuestas.",
  "Que le dice una nube a otra nube? Vamos a llover ideas.",
  "Como se llama un dragon dormilon? Ronca-gon.",
  "Por que el cepillo de dientes es buen amigo? Porque siempre te apoya.",
  "Que hace una llave en el gimnasio? Abre oportunidades.",
  "Por que el arroz no se preocupa? Porque todo se cocina a su tiempo.",
  "Como se llama un koala con cafe? Koalatte.",
  "Que le dice una alarma a otra alarma? Nos vemos al amanecer.",
  "Por que la goma no aprueba examenes? Porque borra todo.",
  "Que hace una mochila en vacaciones? Carga recuerdos.",
  "Por que el espejo nunca llega tarde? Porque siempre se refleja a tiempo.",
  "Como se llama un pulpo con ocho autos? Pulpo-tente.",
  "Que hace una hoja en el agua? Va corriente abajo.",
  "Por que el sofa esta tan tranquilo? Porque se toma todo con calma.",
  "Que le dice una nube al sol? No te pongas tan radiante.",
  "Como se llama un violinista sin violin? Ex-musico.",
  "Por que el pastelero no usa reloj? Porque trabaja por hornadas.",
  "Que hace un astronauta con lapiz? Dibuja via lactea.",
  "Por que la radio sonrie? Porque tiene buena onda.",
  "Como se llama un mono con tutú? Mono-ballet.",
  "Que le dice una pila a otra pila? Nos vemos en el polo positivo.",
  "Por que el calendario es exitoso? Porque tiene muchos dias buenos.",
  "Que hace una cometa en la oficina? Se eleva profesionalmente.",
  "Como se llama un unicornio dormido? Uni-zzz-cornio.",
  "Por que el cafe y el pan son amigos? Porque hacen buena pareja.",
  "Que le dice un pixel a otro pixel? Te veo un poco desenfocado.",
  "Por que el tren no se estresa? Porque siempre va sobre rieles.",
  "Como se llama un fantasma pesado? Espiritu de masa.",
  "Que hace una sandia en una boda? Da un brindis fresco.",
  "Por que el tomate nunca gana carreras? Porque siempre lo hacen pure.",
  "Que le dice un emoji feliz a otro? Sonrie, que te leen.",
  "Como se llama un caracol rapido? Turbo-col.",
  "Por que el hielo es buen consejero? Porque te enfria la cabeza.",
  "Que hace una rana con internet? Salta de link en link.",
  "Por que el shampoo es poeta? Porque hace rimas espumosas.",
  "Como se llama un mapa gracioso? Mapa-chiste.",
  "Que le dice un wifi a otro wifi? Nos conectamos luego.",
  "Por que la maleta no discute? Porque siempre carga con todo.",
  "Que hace una dona en el gimnasio? Cardio con agujero.",
  "Por que la cuchara no corre? Porque se queda en la sopa.",
  "Como se llama un pez con corbata? Ejecutivo marino.",
  "Que hace una estrella fugaz en WhatsApp? Deja un estado brillante.",
  "Por que el limon no cuenta secretos? Porque exprime de mas.",
  "Como se llama un robot que canta rancheras? Mariachi-tron.",
  "Que le dice una nube de datos a otra? Respaldame por si llueve.",
  "Por que la almohada es sabia? Porque consulta con la almohada.",
  "Que hace una taza feliz? Se llena de alegria.",
  "Por que el teclado no se pierde? Porque siempre tiene una tecla.",
  "Como se llama un caballo en internet? Hiper-hipico.",
  "Que hace una galleta en la playa? Se dora al sol.",
  "Por que el papel no pelea? Porque se arruga.",
  "Como se llama un vampiro vegetariano? Conde Brocoli.",
  "Que le dice una bateria a un celular? Te doy energia positiva.",
  "Por que la escuelita de peces cerro? Porque no daban pie con bola.",
];

function loadGeneratedJokes() {
  try {
    const generatedPath = path.join(__dirname, "data", "jokes.generated.json");
    if (!fs.existsSync(generatedPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch (error) {
    console.warn("No se pudo cargar jokes.generated.json:", error.message);
    return [];
  }
}

function buildJokesPool(baseJokes, generatedJokes) {
  const seen = new Set();
  const pool = [];
  for (const joke of [...generatedJokes, ...baseJokes]) {
    const normalized = String(joke)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    pool.push(joke);
  }
  return pool;
}

const generatedJokes = loadGeneratedJokes();
const jokesPool = buildJokesPool(jokes, generatedJokes);
console.log(`Pool de chistes cargado: base=${jokes.length}, generados=${generatedJokes.length}, total=${jokesPool.length}`);

const conversationStateByUser = new Map();

//Normaliza el texto de entrada para facilitar la comparación
function normalizeInput(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .replace(/[^a-z0-9\s]/g, "")     // Quita emojis y signos
    .trim();
}

function nextJokeForUser(userId) {
  const state = conversationStateByUser.get(userId) || { lastJokeIndex: -1 };
  const hasGenerated = generatedJokes.length > 0;
  const shouldPreferGenerated = hasGenerated && Math.random() < 0.8;
  const preferredPool = shouldPreferGenerated ? generatedJokes : jokesPool;
  const sourcePool = preferredPool.length > 0 ? preferredPool : jokes;
  let nextIndex = Math.floor(Math.random() * sourcePool.length);
  if (sourcePool.length > 1 && nextIndex === state.lastJokeIndex) {
    nextIndex = (nextIndex + 1) % sourcePool.length;
  }
  conversationStateByUser.set(userId, { lastJokeIndex: nextIndex, updatedAt: Date.now() });
  return sourcePool[nextIndex];
}


async function handleIncomingMessage(payload) {
  // Log request
  fs.appendFileSync(
    "debug_post_log.txt",
    `${new Date().toISOString()} - POST: ${JSON.stringify(payload)}\n`
  );

  const firstEntry = payload.entry?.[0];
  const firstChange = firstEntry?.changes?.[0];
  const firstMessage = firstChange?.value?.messages?.[0];

  if (!firstMessage) {
    console.log("Payload sin mensajes válidos");
    return;
  }

  const message = firstMessage;
  console.log("Mensaje recibido:", message.type);

  if (!message.type) return;

  const from = message.from;


//Obtener y limpiar el texto del mensaje para detectar la intención del texto
  
  let userIntention = "";
  let rawText = ""; 
  //Normalizamos el texto según el tipo de mensaje que recibe
  if (message.type === "text") {
    rawText = message.text?.body || ""; 
    userIntention = normalizeInput(rawText);
  } 
  else if (message.type === "interactive" && message.interactive.type === "button_reply") {
    userIntention = normalizeInput(message.interactive.button_reply.title);
  } 
  else if (message.type === "button" && message.button.payload) {
    userIntention = normalizeInput(message.button.payload);
  }

  console.log(`Intención detectada: "${userIntention}"`);

  // Respuesta estricta solo para las palabras exactas "chiste" y "otro".
  if (message.type === "text" && (userIntention === "chiste" || userIntention === "otro")) {
    const joke = nextJokeForUser(from);
    await sendTextMessage(from, joke);
  }
}

module.exports = handleIncomingMessage;