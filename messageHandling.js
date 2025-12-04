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
const IP_LOCAL = process.env.IP_LOCAL || "192.168.1.2";
const URL_API_PHP = `http://${IP_LOCAL}/chatbotAPI/api.php`;
const URL_PDF_CATALOGO = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

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

// Esta función busca un producto y envía la plantilla AGENDAR_PEDIDO con los datos reales
async function obtenerProductoYEnviarPlantilla(from, busqueda = "") {
  try {
    // Construimos la URL. Si hay búsqueda usamos ?nombre=X, si no, traemos todo.
    let urlFinal = URL_API_PHP;
    if (busqueda) {
        urlFinal += `?nombre=${encodeURIComponent(busqueda)}`;
    }

    console.log(`Consultando API PHP: ${urlFinal}`);
    
    const response = await fetch(urlFinal);
    
    // Verificamos si la respuesta es exitosa
    if (!response.ok) throw new Error(`Error API PHP status: ${response.status}`);
    
    // Convertimos la respuesta a JSON
    // Tu PHP devuelve un array: [{"id":"1", "nombre":"Camisa", ...}]
    const productos = await response.json(); 
    
    // Guardamos log de lo que respondió PHP
    const logsDir = path.join(__dirname, "logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(path.join(logsDir, "api_log.txt"), 
      `${new Date().toISOString()} - PHP Response: ${JSON.stringify(productos)}\n`
    );

    // Validamos que sea un array y tenga datos
    if (Array.isArray(productos) && productos.length > 0) {
      
      // Tomamos el PRIMER producto encontrado para llenar la plantilla
      const producto = productos[0]; 

      // Preparamos los parámetros para la plantilla AGENDAR_PEDIDO
      // {{1}} = producto.nombre
      // {{2}} = producto.precio
      const templateParams = {
        header: { type: "image", link: IMAGEN_PEDIDO },
        body: [
            producto.nombre,    // Variable {{1}}
            `${producto.precio}` // Variable {{2}}
        ]
      };

      console.log(`Producto encontrado: ${producto.nombre} - $${producto.precio}`);
      
      // Enviamos la plantilla
      await sendTemplateMessage(from, templates.AGENDAR_PEDIDO, templateParams);

    } else {
      console.log("La API PHP respondió, pero no trajo productos o el array está vacío.");
      await sendTextMessage(from, "Lo siento, no encontramos información del producto en este momento.");
    }

  } catch (error) {
    console.error("Error conectando con API PHP:", error);
    // Si falla la API, enviamos un mensaje de error genérico al usuarioñ
    await sendTextMessage(from, "Ocurrió un error al consultar el catálogo.");
  }
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
    await sendDocumentMessage(from, URL_PDF_CATALOGO, "Aquí tienes nuestro catálogo 📄");
  }
  
  // C. PUNTO DE ENCUENTRO O ENVÍO
  else if (userIntention.includes("punto de encuentro") || userIntention.includes("envio")) {
    // Mandamos la plantilla pagina_web
    await sendTemplateMessage(from, templates.PAGINA_WEB, {
        header: { type: "image", link: IMAGEN_PAGINA_WEB }
    });
  }

  // D. AGENDAR PEDIDO
  else if (userIntention.includes("agendar") || userIntention.includes("pedido") || userIntention.includes("ofertas")) {
    await obtenerProductoYEnviarPlantilla(from, "Pantalon"); 
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