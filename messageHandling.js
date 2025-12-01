const fs = require("fs");
const path = require("path");
const {
  templates,
  enviarPlantillaWhatsApp,
  enviarPlantillaErrorGenerico,
  enviarMensajeTexto,
} = require("./whatsappTemplates");

// Alias para facilitar la lectura
const sendTemplateMessage = enviarPlantillaWhatsApp;
const sendTextMessage = enviarMensajeTexto;

// --- CONSTANTES ---
const IMAGEN_MENU = "https://amigosafety.com/images/productos/1680213793_PANTALON%20FRENTE.png";
const IMAGEN_PEDIDO = "https://placehold.co/600x400/png?text=Imagen+Pedido";
const IMAGEN_PAGINA_WEB = "https://cdn-icons-png.flaticon.com/512/174/174855.png";
const NOMBRE_DEFAULT = "Cliente";

//Diccionarios de palabras clave
const GREETINGS = new Set([
  "hola", "ola", "hloa", "holla", "halo", "hello", "hi", "hey",
  "oli", "holis", "buenos dias", "buenas tardes", "buenas noches",
  "que tal", "que onda", "k onda", "q hubo", "como estas",
  "inicio", "start", "menu", "empezar"
]);

const RETURN_KEYWORDS = new Set([
  "salir", "adios", "bye", "hasta luego",
  "regresar", "volver", "inicio", "home",
  "cancelar", "terminar", "fin"
]);

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

/* Esta funcion es del profe y es para jalar datos de la API de XAMP, yo no tengo eso 
async function enviarPlantillaDesdeAPI({ from, url, templateName }) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    
    // Procesamos items de la API
    let items = [];
    if (data.menu) {
      items = data.menu.map((e) => ({ nombre: e.nombre, precio: e.precio }));
    } else if (data.ofertas) {
      items = data.ofertas.map((e) => ({ nombre: e.descripcion, precio: "N/A" }));
    }

    // Log
    const logsDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(path.join(logsDir, "api_log.txt"), 
      `${new Date().toISOString()} - API ${templateName}: ${JSON.stringify(data)}\n`
    );

    if (items.length > 0) {
      let templateParams = {};

      if (templateName === templates.AGENDAR_PEDIDO) {
        const item = items[0]; 
        templateParams = {
          header: { type: "image", link: IMAGEN_PEDIDO },
          body: [item.nombre, item.precio || "Consultar"]
        };
      } else {
        const texto = items.map(i => i.nombre).join("\n");
        templateParams = { body: [texto] };
      }

      await sendTemplateMessage(from, templateName, templateParams);
    } else {
      await sendTextMessage(from, "No encontramos información disponible.");
    }

  } catch (error) {
    console.error("Error API:", error);
    await sendTextMessage(from, "Hubo un error al consultar la información.");
  }
} */

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


//Obtener y limpiar el texto del mensaje para detectar intención
  
  let userIntention = ""; 
  //Normalizamos el texto según el tipo de mensaje que recibe
  if (message.type === "text") { 
    userIntention = normalizeInput(message.text?.body);
  } 
  else if (message.type === "interactive" && message.interactive.type === "button_reply") {
    userIntention = normalizeInput(message.interactive.button_reply.title);
  } 
  else if (message.type === "button" && message.button.payload) {
    userIntention = normalizeInput(message.button.payload);
  }

  console.log(`Intención detectada: "${userIntention}"`);

//Logica para responder según la intención del usuario

  // A. MENÚ PRINCIPAL
  const esSaludo = GREETINGS.has(userIntention) || Array.from(GREETINGS).some(g => userIntention.includes(g));
  
  if ((esSaludo && message.type === "text") || userIntention === "menu" || userIntention === "inicio") {
    await sendTemplateMessage(from, templates.MENU_INICIO, {
      header: { type: "image", link: IMAGEN_MENU },
    });
    return;
  }

  // B. CATÁLOGO
  if (userIntention.includes("catalogo") || userIntention.includes("ver menu")) {
    await sendTemplateMessage(from, templates.CATALOGO, {
        body: [NOMBRE_DEFAULT]
    });
  }
  
  // C. PUNTO DE ENCUENTRO O ENVÍO
  else if (userIntention.includes("punto de encuentro") || userIntention.includes("envio")) {
    // Mandamos la plantilla pagina_web
    // Asumimos que pagina_web tiene un Header de imagen y NO tiene variables de texto (o texto estático)
    await sendTemplateMessage(from, templates.PAGINA_WEB, {
        header: { type: "image", link: IMAGEN_PAGINA_WEB }
    });
  }

  // D. AGENDAR PEDIDO
  else if (userIntention.includes("agendar") || userIntention.includes("pedido") || userIntention.includes("ofertas")) {
    await sendTemplateMessage(from, templates.AGENDAR_PEDIDO, {
      header: { type: "image", link: IMAGEN_PEDIDO },
      body: ["Producto Ejemplo", "$150.00"]
    });
  }
  
  // E. SALIR
  else if (RETURN_KEYWORDS.has(userIntention) || userIntention.includes("salir")) {
    await sendTextMessage(from, "¡Gracias por visitarnos! Hasta pronto.");
  }
  
  // F. OPCIÓN NO RECONOCIDA
  else if (message.type !== "text") {
    await sendTextMessage(from, "Opción no reconocida. Por favor escribe 'Hola' para ver el menú.");
  }
}

module.exports = handleIncomingMessage;