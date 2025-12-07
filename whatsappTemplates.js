const axios = require('axios');
const fs = require("fs");
require('dotenv').config();

const templates = {
  MENU_INICIO: "menu_inicio",
  AGENDAR_PEDIDO: "agendar_pedido",
  CATALOGO: "catalogo_pdf",
  ERROR_GENERICO: "error_generico",
  PAGINA_WEB: "pagina_web",
  PEDIDO: "pedido",
};

// Utilidad para limpiar texto y asegurar longitud
function sanitize(text) {
  if (typeof text !== 'string') text = String(text);
  const cleaned = text.replace(/[\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned.slice(0, 1024);
}


// Token de acceso generado en la consola de Meta
const accessToken = process.env.BEREAER_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// Función para limpiar y validar el número
function procesarNumero(to) {
  if (!to) throw new Error("Número de destinatario no válido");
  to = String(to)
  return to.startsWith("521") ? to.replace(/^521/, "52") : to;
}
 
// Función genérica para construir y enviar payloads
async function enviarPayload(to, templateName, components = []) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  to = procesarNumero(to);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_MX" },
      components,
    },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    logExitoso(payload, response.data);
  } catch (error) {
    logError(payload, error);
  }
}

//Funcion generica para enviar plantillas específicas
async function enviarPlantillaWhatsApp(to, templateName, templateParams = {}) {
  const components = [] //Array vacio para agregar componentes según la plantilla
    if (templateParams.header){ //Si hay hedaer se agrega
      const header = templateParams.header;
      const headerComponent = { //Componente constructor para el header
        type: "header",
        parameters: [], 
    };
    if (header.type === "image" && header.link) { //Si el header es imagen
      headerComponent.parameters.push({
        type: "image",
        image: { link: header.link },
      });
    } else if (header.type === "text" && header.text) {//Si el header es texto
      headerComponent.parameters.push({
        type: "text",
        text: sanitize(header.text),
      });
    } else if (header.type === "document" && header.link) { //Si el header es documento
      headerComponent.parameters.push({
        type: "document",
        document: {
          link: header.link,
          filename: header.filename || "Catalogo.pdf"
        }
      });
    }
    if (headerComponent.parameters.length > 0) {
      components.push(headerComponent);
    }
  }

  if (Array.isArray(templateParams.body) && templateParams.body.length > 0){ //Verifica que templateParams.body sea un aaray con al menos un elemento
    const bodyParameters = templateParams.body.map((text) => ({ //Mapea cada elemento del array body a un objeto
      type: "text",
      text: sanitize(text),
    }));
    components.push({ //Lo agrega a components
      type: "body",
      parameters: bodyParameters,
    });
  }

  if (components.length === 0 && templateName != templates.PEDIDO) { //Si components esta vacio y no es plantilla PEDIDO regresa un error
    throw new Error(`La plantilla "${templateName}" requiere components y se envió vacía.`);
  }
  await enviarPayload(to, templateName, components); //Envia los components construidos con la función enviarPayload
}

async function enviarPlantillaErrorGenerico(to, errorMessage) {
  const components = [
    {
      type: "body",
      parameters: [{ type: "text", text: errorMessage }],
    },
  ];
  await enviarPayload(to, templates.ERROR_GENERICO, components);
}

async function enviarMensajeTexto(to, text) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: procesarNumero(to),
    type: "text",
    text: { body: text },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    logExitoso(payload, response.data);
  } catch (error) {
    logError(payload, error);
  }
}

// Funciones auxiliares para logging
function logExitoso(payload, responseData) {
  const logMessage = `${new Date().toISOString()} - Enviado: ${JSON.stringify(payload)}\nRespuesta: ${JSON.stringify(responseData)}\n`;
  fs.appendFileSync("template_log.txt", logMessage);
  console.log("Plantilla enviada exitosamente:", responseData);
}

function logError(payload, error) {
  const errorData = error.response?.data || error.message;
  const logMessage = `${new Date().toISOString()} - Error enviando: ${JSON.stringify(payload)}\nError: ${JSON.stringify(errorData)}\n`;
  fs.appendFileSync("template_log.txt", logMessage);
  console.error("Error enviando plantilla:", errorData);
}

module.exports = {
  templates,
  enviarPlantillaWhatsApp,
  enviarPlantillaErrorGenerico,
  enviarMensajeTexto,
};
