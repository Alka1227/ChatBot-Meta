const fs = require("fs");
const path = require("path");
const axios = require("axios");

const repoRoot = path.resolve(__dirname, "..");
const messageHandlingPath = path.join(repoRoot, "messageHandling.js");
const outputPath = path.join(repoRoot, "data", "jokes.generated.json");

const redditSources = [
  "https://www.reddit.com/r/jokes/top.json?limit=100&t=month",
  "https://www.reddit.com/r/jokes/top.json?limit=100&t=year",
  "https://www.reddit.com/r/JokesEsp/top.json?limit=100&t=year",
];

const webSources = [
  "http://www.chistes.com/",
  "https://buenos-chistes.com/",
  "http://mejor-chiste.com/",
];

const HTTP_TIMEOUT_MS = 20000;
const MIN_JOKE_LENGTH = 20;
const MAX_JOKE_LENGTH = 280;
const MAX_TOTAL_NEW_JOKES = 500;

function normalizeForKey(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJoke(text) {
  const cleaned = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < MIN_JOKE_LENGTH || cleaned.length > MAX_JOKE_LENGTH) return "";
  return cleaned;
}

function extractBaseJokesFromMessageHandling() {
  const source = fs.readFileSync(messageHandlingPath, "utf8");
  const match = source.match(/const jokes = \[([\s\S]*?)\];/);
  if (!match) {
    throw new Error("No se pudo leer el arreglo base 'jokes' desde messageHandling.js");
  }

  const list = [];
  const regex = /"((?:[^"\\]|\\.)*)"/g;
  let current = regex.exec(match[1]);
  while (current) {
    const joke = current[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, " ")
      .trim();
    if (joke) list.push(joke);
    current = regex.exec(match[1]);
  }
  return list;
}

async function fetchWithRetry(url, retries = 2) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const response = await axios.get(url, {
        timeout: HTTP_TIMEOUT_MS,
        headers: {
          "User-Agent": "ChatBot-Meta-JokesScraper/1.0 (+manual-script)",
          Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        },
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1200 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function parseRedditJokes(jsonData) {
  const jokes = [];
  const posts = jsonData?.data?.children || [];

  for (const post of posts) {
    const data = post?.data || {};
    const title = String(data.title || "").trim();
    const body = String(data.selftext || "").trim();
    const candidate = cleanJoke([title, body].filter(Boolean).join(" - "));
    if (candidate) jokes.push(candidate);
  }
  return jokes;
}

function parseWebJokes(html) {
  const candidates = [];
  const blockRegex = /<(p|li|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match = blockRegex.exec(html);

  while (match) {
    const text = cleanJoke(match[2]);
    if (text && (text.includes("?") || text.includes("!") || text.length >= 45)) {
      candidates.push(text);
    }
    match = blockRegex.exec(html);
  }

  return candidates;
}

function dedupeJokes(jokesList, existing) {
  const seen = new Set(existing.map(normalizeForKey));
  const unique = [];

  for (const joke of jokesList) {
    const cleaned = cleanJoke(joke);
    if (!cleaned) continue;
    const key = normalizeForKey(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(cleaned);
    if (unique.length >= MAX_TOTAL_NEW_JOKES) break;
  }

  return unique;
}

async function collectAllJokes() {
  const collected = [];
  const stats = {
    reddit: 0,
    web: 0,
    failedSources: [],
  };

  for (const source of redditSources) {
    try {
      const data = await fetchWithRetry(source);
      const jokes = parseRedditJokes(data);
      collected.push(...jokes);
      stats.reddit += jokes.length;
      console.log(`[reddit] ${source} -> ${jokes.length}`);
    } catch (error) {
      stats.failedSources.push({ source, error: error.message });
      console.warn(`[reddit] fallo en ${source}: ${error.message}`);
    }
  }

  for (const source of webSources) {
    try {
      const data = await fetchWithRetry(source);
      const html = typeof data === "string" ? data : String(data || "");
      const jokes = parseWebJokes(html);
      collected.push(...jokes);
      stats.web += jokes.length;
      console.log(`[web] ${source} -> ${jokes.length}`);
    } catch (error) {
      stats.failedSources.push({ source, error: error.message });
      console.warn(`[web] fallo en ${source}: ${error.message}`);
    }
  }

  return { collected, stats };
}

async function main() {
  const baseJokes = extractBaseJokesFromMessageHandling();
  const existingGenerated = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : [];

  const allExisting = [...baseJokes, ...existingGenerated];
  const { collected, stats } = await collectAllJokes();
  const newUnique = dedupeJokes(collected, allExisting);
  const mergedGenerated = dedupeJokes([...existingGenerated, ...newUnique], baseJokes);

  fs.writeFileSync(outputPath, `${JSON.stringify(mergedGenerated, null, 2)}\n`, "utf8");

  console.log("----- Resumen scraper -----");
  console.log(`Base local: ${baseJokes.length}`);
  console.log(`Generados previos: ${existingGenerated.length}`);
  console.log(`Extraidos brutos: ${collected.length}`);
  console.log(`Nuevos unicos: ${newUnique.length}`);
  console.log(`Generados finales: ${mergedGenerated.length}`);
  if (stats.failedSources.length > 0) {
    console.log(`Fuentes con fallo: ${stats.failedSources.length}`);
  }
}

main().catch((error) => {
  console.error("Error en scrapeJokes:", error);
  process.exitCode = 1;
});
