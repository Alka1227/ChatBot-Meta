const fs = require("fs");
const path = require("path");
const axios = require("axios");

//Templates de meta
const {
  templates,
  enviarPlantillaWhatsapp,
  enviarPlantillaErrorGenerico,
  enviarMensajeTexto,
  procesarNumero,
} = require("./whatsappTemplates");

//url de mis apis
const API_BASE_URL = "http://127.0.0.1:3000/apiChatBot"; // Aqui va la ruta XAMP de la API - Falta crear la API
const sendTemplateMessage = enviarPlantillaWhatsapp;
const sendTextMessage = enviarMensajeTexto;
//Diccionarios
const keywords = {
  //Diccioario y palabras claves
};

//Funcionesa asincronas
async function crearSesion(phone) {
  try {
    const response = await axios.post(`${API_BASE_URL}/sesion.php`, { phone });
    return response.data;
  } catch (error) {
    console.error("Error creando sesion: ", error);
    return { success: false, error: error.message };
  }
}

//Funciones de lógica
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^\w\s]/g, " ") // quitar caracteres especiales
    .replace(/\s+/g, " ")
    .trim();
}

//Priorizar frases
async function findAction(text, phoneNumber) {
  const normalizedText = normalizeText(text);
  const matches = [];
  for (const [action, keywordList] of Object.entries(keywords)) {
    for (const keyword of keywordList) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedText.includes(normalizedKeyword)) {
        matches.push({
          action,
          keyword: normalizedKeyword,
          length: normalizedKeyword.length,
        });
      }
    }
  }
}
