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
const IMAGEN_MENU = "https://play-lh.googleusercontent.com/IVI0a5ikpBt6BMclofFoupP4kBLHqC4VJWWjwbJnd_4UfDSmf1z6MepZbbXPeALnw0He";
const IMAGEN_PEDIDO = "https://play-lh.googleusercontent.com/IVI0a5ikpBt6BMclofFoupP4kBLHqC4VJWWjwbJnd_4UfDSmf1z6MepZbbXPeALnw0He";
const IMAGEN_PAGINA_WEB = "https://cdn-icons-png.flaticon.com/512/174/174855.png";
const IP_LOCAL = process.env.IP_LOCAL || "192.168.1.2";
const URL_API_PHP = `http://${IP_LOCAL}/chatbotAPI/`;
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

// Esta función busca un producto o conjunto y envía la plantilla AGENDAR_PEDIDO
async function procesarBusquedaProductos(from, textoUsuario) {
  try {
    const terminosBusqueda = textoUsuario.split(',').map(t => t.trim()).filter(t => t.length > 0);

    let productosEncontrados = [];
    let precioTotal = 0;

    console.log(`Buscando: ${terminosBusqueda.join(" | ")}`);

    for (const termino of terminosBusqueda) {

      let productoEncontrado = null;

      //Buscar en productos
      try {
        const urlProductos = `${URL_API_PHP}/api.php?nombre=${encodeURIComponent(termino)}`;
        const resProd = await fetch(urlProductos);

        if (resProd.ok) {
          const data = await resProd.json();

          if (Array.isArray(data) && data.length > 0) {
            productoEncontrado = data[0];
          }
        }
      } catch (e) {
        console.log("Error buscando en productos:", e.message);
      }

      //Si no se encontró, buscar en conjuntos
      if (!productoEncontrado) {
        try {
          const urlConjuntos = `${URL_API_PHP}/conjuntos.php?nombre=${encodeURIComponent(termino)}`;
          const resConj = await fetch(urlConjuntos);

          if (resConj.ok) {
            const data = await resConj.json();

            if (Array.isArray(data) && data.length > 0) {
              productoEncontrado = data[0];
            }
          }
        } catch (e) {
          console.log("Error buscando en conjuntos:", e.message);
        }
      }

      //Si no encontro en ninguno
      if (!productoEncontrado) continue;
      productosEncontrados.push(productoEncontrado.nombre);
      const precioFloat = parseFloat(String(productoEncontrado.precio).replace(/[^0-9.]/g, ""));

      if (isNaN(precioFloat) || precioFloat <= 0) {
        console.log("Precio inválido detectado:", productoEncontrado.precio);
        continue;  
      }

      precioTotal += precioFloat;
    }

    //Respuesta al usuario
    if (productosEncontrados.length === 0) {
      await sendTextMessage(from, `No encontré ninguno de los productos de: "${textoUsuario}".`);
      return;
    }

    const lista = productosEncontrados.join(" + ");
    const precioFinal = precioTotal.toFixed(2);

    await sendTemplateMessage(from, templates.AGENDAR_PEDIDO, {
      header: { type: "image", link: IMAGEN_PEDIDO },
      body: [lista, precioFinal]
    });

  } catch (error) {
    console.error("Error general:", error);
    await sendTextMessage(from, "Ocurrió un error al consultar los productos.");
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
      header: { type: "document", link: URL_PDF_CATALOGO },

    });
  }
  
  // C. PUNTO DE ENCUENTRO O ENVÍO
  else if (userIntention.includes("punto de encuentro") || userIntention.includes("envio")) {
    // Mandamos la plantilla pagina_web
    await sendTemplateMessage(from, templates.PAGINA_WEB, {
        header: { type: "image", link: IMAGEN_PAGINA_WEB }
    });
  }

  // D. PEDIDO
  else if (userIntention.includes("agendar") || userIntention.includes("pedido") || userIntention.includes("ofertas")) {
    await sendTemplateMessage(from, templates.PEDIDO, {}); 
  }


  // E. BÚSQUEDA DE PRODUCTOS
  else if (message.type === "text") {
    // Asumimos que cualquier otro texto es una búsqueda de productos
    await procesarBusquedaProductos(from, rawText);
  }
  
  // F. SALIR
  else if (RETURN_KEYWORDS.has(userIntention) || userIntention.includes("salir")) {
    await sendTextMessage(from, "¡Gracias por visitarnos! Hasta pronto.");
  }

  // G. OPCIÓN NO RECONOCIDA
  else if (message.type !== "text") {
    await sendTextMessage(from, "Opción no reconocida. Por favor escribe 'Hola' para ver el menú.");
  }
}

module.exports = handleIncomingMessage;