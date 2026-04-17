const axios = require('axios');
const fs = require("fs");
require('dotenv').config();
const { getSessionContext } = require("./whatsappConnectAdapter.js");

// Utilidad para limpiar texto y asegurar longitud
function sanitize(text) {
  if (typeof text !== 'string') text = String(text);
  const cleaned = text.replace(/[\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned.slice(0, 1024);
}


// Token de acceso generado en la consola de Meta
const accessToken = process.env.BEREAER_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const provider = (process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
const connectBaseUrl = (process.env.WHATSAPP_CONNECT_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const connectApiKey = process.env.WHATSAPP_CONNECT_API_KEY;
const connectTenantIdFromEnv = process.env.WHATSAPP_CONNECT_TENANT_ID;

// Función para limpiar y validar el número
function procesarNumero(to) {
  if (!to) throw new Error("Número de destinatario no válido");
  to = String(to)
  return to.startsWith("521") ? to.replace(/^521/, "52") : to;
}

async function enviarMensajeTexto(to, text) {
  const sessionContext = getSessionContext(to);
  const shouldUseConnect = provider === "connect" || !!sessionContext;
  if (shouldUseConnect) {
    await enviarMensajeTextoConnect(to, text, sessionContext);
    return;
  }

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

async function enviarMensajeTextoConnect(to, text, sessionContext = null) {
  const deviceId = sessionContext?.deviceId || process.env.WHATSAPP_CONNECT_DEVICE_ID;
  const tenantId = sessionContext?.tenantId || connectTenantIdFromEnv;

  if (!deviceId) {
    throw new Error("Falta deviceId para enviar por whatsapp-connect-v2");
  }

  if (!connectApiKey) {
    throw new Error("Falta WHATSAPP_CONNECT_API_KEY para enviar por whatsapp-connect-v2");
  }

  const url = `${connectBaseUrl}/devices/${encodeURIComponent(deviceId)}/messages/send`;
  const payload = {
    to: String(to),
    text: sanitize(text),
  };

  const headers = {
    "x-api-key": connectApiKey,
    "Content-Type": "application/json",
  };

  if (tenantId) headers["x-tenant-id"] = tenantId;

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
  console.log("Mensaje enviado exitosamente:", responseData);
}

function logError(payload, error) {
  const errorData = error.response?.data || error.message || "Error desconocido";
  const errorDetails = {
    message: error?.message || "Sin mensaje",
    code: error?.code || null,
    status: error?.response?.status || null,
    statusText: error?.response?.statusText || null,
    data: error?.response?.data || null,
  };
  const logMessage = `${new Date().toISOString()} - Error enviando: ${JSON.stringify(payload)}\nError: ${JSON.stringify(errorDetails)}\n`;
  fs.appendFileSync("template_log.txt", logMessage);
  console.error("Error enviando mensaje:", errorData, errorDetails);
}

module.exports = {
  enviarMensajeTexto,
};
