const axios = require('axios');
const fs = require("fs");

const templates = {
  MENU_INICIO: "menu_inicio",
  AGENDAR_PEDIDO: "agendar_pedido",
  CATALOGO: "catalogo",
  ERROR_GENERICO: "error_generico",
};

// Utilidad para limpiar texto y asegurar longitud
function sanitize(text) {
  const cleaned = text.replace(/[\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned.slice(0, 1024);
}


// Token de acceso generado en la consola de Meta

const accessToken = "EAAL2TxBDqnEBP8yGn7vRBjIdIqZC6zjjyekp09Q4XzBsScxYDyD9UwCyCf9eHZAj4pp9lbRqDZAOlZBlxKlSwn6wMZCV7Fbp8RnHCjTsltiXBWPrrlOeOPHC0sibnDoO9QexqV8qZCkJW7UAlyZCQ0Xc0Tm7Jq75f5WZAjuN5EbSwY0eCT27xyhtIwSELXYBzgZDZD";
const phoneNumberId = "866306696566425";

// Función para limpiar y validar el número
function procesarNumero(to) {
  if (!to) throw new Error("Número de destinatario no válido");
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

// Funciones específicas
async function enviarPlantillaWhatsApp(to, templateName, text = "") {
  const components = text
    ? [
        {
          type: "body",
          parameters: [{ type: "text", text: sanitize(text) }],
        },
      ]
    : [];
  await enviarPayload(to, templateName, components);
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

/* Body example for "agendar_pedido" template, botones no funcionan
{
  "messaging_product": "whatsapp",
  "to": "526181556489",
  "type": "template",
  "template": {
    "name": "agendar_pedido",
    "language": {
      "code": "es_MX"
    },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://amigosafety.com/images/productos/1680213793_PANTALON%20FRENTE.png" 
            }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Camisa de vestir" // Valor para {{1}}: Producto
          },
          {
            "type": "text",
            "text": "450.50" // Valor para {{2}}: Precio
          }
        ]
      }
    ]
  }
}
*/