/**
 * Cron: hasta 20 chistes/día en ventana fija (CRON_WINDOW_*), con límites
 * móviles: máx. 3 envíos / 3 min, máx. 20 / 12 h, máx. 20 / día calendario (CRON_TZ).
 *
 * Variables .env: CRON_RECIPIENT, CRON_TZ, CRON_WINDOW_START, CRON_WINDOW_END,
 * BEREAER_TOKEN, PHONE_NUMBER_ID; opcional GRAPH_API_VERSION (default v24.0).
 *
 * Crontab (ej., cada minuto; ajusta ruta y `which node`):
 *   * * * * * cd /ruta/al/repo && /usr/local/bin/node scripts/cronRandomJokes.js >> /tmp/whatsapp-cron.log 2>&1
 */
const fs = require("fs");
const path = require("path");

process.env.WHATSAPP_PROVIDER = "meta";
require("dotenv").config();

const { enviarMensajeTexto } = require("../whatsappTemplates.js");

const STATE_PATH = path.join(__dirname, "..", "data", "whatsapp-cron-state.json");
const JOKES_PATH = path.join(__dirname, "..", "data", "jokes.generated.json");

const MAX_PER_DAY = 20;
const MAX_PER_12H = 20;
const MAX_PER_3MIN = 3;
const WINDOW_3MIN_MS = 3 * 60 * 1000;
const WINDOW_12H_MS = 12 * 60 * 60 * 1000;
const PRUNE_MS = 8 * 24 * 60 * 60 * 1000;
const SCHEDULE_MAX_TRIES = 250;

function parseHm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  if (!m) throw new Error(`CRON_WINDOW_* inválido (usa HH:mm): ${s}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`Hora fuera de rango: ${s}`);
  return { h, m: min };
}

function dayKeyInTz(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDayKey(dayKey) {
  const [y, mo, d] = dayKey.split("-").map(Number);
  return { year: y, month: mo, day: d };
}

function zonedLocalToUtc(year, month, day, hour, minute, second, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function compareUtc(midMs) {
    const parts = fmt.formatToParts(new Date(midMs));
    const map = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const y = +map.year;
    const mo = +map.month;
    const d = +map.day;
    const h = +map.hour;
    const mi = +map.minute;
    const s = +map.second;
    const dk = y * 10000 + mo * 100 + d;
    const targetDk = year * 10000 + month * 100 + day;
    if (dk < targetDk) return -1;
    if (dk > targetDk) return 1;
    const cur = h * 3600 + mi * 60 + s;
    const target = hour * 3600 + minute * 60 + second;
    if (cur < target) return -1;
    if (cur > target) return 1;
    return 0;
  }

  let lo = Date.UTC(year, month - 1, day, 0, 0, 0) - 86400000;
  let hi = Date.UTC(year, month - 1, day, 0, 0, 0) + 2 * 86400000;
  let best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmp = compareUtc(mid);
    if (cmp === 0) {
      best = mid;
      break;
    }
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  if (best === null) {
    throw new Error(
      `zonedLocalToUtc: sin instante UTC para ${year}-${month}-${day} ${hour}:${minute}:${second} [${timeZone}]`
    );
  }
  return best;
}

function windowBoundsForDay(dayKey, timeZone, startHm, endHm) {
  const { year, month, day } = parseDayKey(dayKey);
  const startMs = zonedLocalToUtc(year, month, day, startHm.h, startHm.m, 0, timeZone);
  const endMs = zonedLocalToUtc(year, month, day, endHm.h, endHm.m, 0, timeZone);
  return { startMs, endMs };
}

function isInFixedWindow(nowMs, dayKey, timeZone, startHm, endHm) {
  const { startMs, endMs } = windowBoundsForDay(dayKey, timeZone, startHm, endHm);
  return nowMs >= startMs && nowMs < endMs;
}

function maxEventsInSlidingWindow(sortedMs, windowMs) {
  let max = 0;
  let j = 0;
  for (let i = 0; i < sortedMs.length; i++) {
    while (j < sortedMs.length && sortedMs[j] - sortedMs[i] <= windowMs) {
      j++;
    }
    max = Math.max(max, j - i);
  }
  return max;
}

function generateSchedule(windowStartMs, windowEndMs) {
  const span = windowEndMs - windowStartMs;
  if (span <= 0) throw new Error("La ventana CRON_WINDOW_* no tiene duración positiva.");

  for (let attempt = 0; attempt < SCHEDULE_MAX_TRIES; attempt++) {
    const times = [];
    for (let k = 0; k < MAX_PER_DAY; k++) {
      const t = windowStartMs + Math.floor(Math.random() * span);
      times.push(t);
    }
    times.sort((a, b) => a - b);
    if (maxEventsInSlidingWindow(times, WINDOW_3MIN_MS) <= MAX_PER_3MIN) {
      return times;
    }
  }
  throw new Error(
    `No se pudo generar una agenda válida tras ${SCHEDULE_MAX_TRIES} intentos (máx. ${MAX_PER_3MIN} por ${WINDOW_3MIN_MS / 60000} min).`
  );
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      dayKey: null,
      scheduledAt: [],
      sentSlot: [],
      sentAt: [],
    };
  }
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  try {
    const data = JSON.parse(raw);
    return {
      dayKey: data.dayKey ?? null,
      scheduledAt: Array.isArray(data.scheduledAt) ? data.scheduledAt : [],
      sentSlot: Array.isArray(data.sentSlot) ? data.sentSlot : [],
      sentAt: Array.isArray(data.sentAt) ? data.sentAt : [],
    };
  } catch {
    return {
      dayKey: null,
      scheduledAt: [],
      sentSlot: [],
      sentAt: [],
    };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function pruneSentAt(sentAt, nowMs) {
  const cutoff = nowMs - PRUNE_MS;
  return sentAt.filter((iso) => {
    const t = new Date(iso).getTime();
    return t >= cutoff;
  });
}

function countSentToday(sentAt, timeZone, now) {
  const todayKey = dayKeyInTz(now, timeZone);
  let n = 0;
  for (const iso of sentAt) {
    const d = new Date(iso);
    if (dayKeyInTz(d, timeZone) === todayKey) n++;
  }
  return n;
}

function countInRollingWindow(sentAt, nowMs, windowMs) {
  const cutoff = nowMs - windowMs;
  let n = 0;
  for (const iso of sentAt) {
    const t = new Date(iso).getTime();
    if (t >= cutoff && t <= nowMs) n++;
  }
  return n;
}

function sanitizeJoke(text) {
  if (typeof text !== "string") text = String(text);
  const cleaned = text.replace(/[\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return cleaned.slice(0, 4096);
}

function pickRandomJoke(jokes) {
  if (!jokes.length) throw new Error("No hay chistes en jokes.generated.json");
  const i = Math.floor(Math.random() * jokes.length);
  return jokes[i];
}

function isSlotDue(nowMs, slotMs, sent) {
  if (sent) return false;
  return nowMs >= slotMs - 60_000 && nowMs <= slotMs + 120_000;
}

function findFirstDueSlot(nowMs, scheduledAt, sentSlot) {
  const indices = scheduledAt.map((t, i) => ({ t, i }));
  indices.sort((a, b) => a.t - b.t);
  for (const { t, i } of indices) {
    if (isSlotDue(nowMs, t, sentSlot[i])) return i;
  }
  return -1;
}

async function main() {
  const timeZone = process.env.CRON_TZ || "America/Mexico_City";
  const startHm = parseHm(process.env.CRON_WINDOW_START || "08:00");
  const endHm = parseHm(process.env.CRON_WINDOW_END || "20:00");
  const recipient = process.env.CRON_RECIPIENT;
  if (!recipient) {
    console.error("Falta CRON_RECIPIENT en .env");
    process.exit(1);
  }
  if (!process.env.BEREAER_TOKEN || !process.env.PHONE_NUMBER_ID) {
    console.error("Faltan BEREAER_TOKEN o PHONE_NUMBER_ID en .env");
    process.exit(1);
  }

  const now = new Date();
  const nowMs = now.getTime();
  const dayKey = dayKeyInTz(now, timeZone);

  let state = loadState();
  state.sentAt = pruneSentAt(state.sentAt, nowMs);

  if (state.dayKey !== dayKey) {
    const { startMs, endMs } = windowBoundsForDay(dayKey, timeZone, startHm, endHm);
    const scheduledAt = generateSchedule(startMs, endMs);
    state = {
      dayKey,
      scheduledAt,
      sentSlot: scheduledAt.map(() => false),
      sentAt: state.sentAt,
    };
    saveState(state);
    console.log(`Nueva agenda para ${dayKey}: ${scheduledAt.length} envíos planificados.`);
  }

  if (!isInFixedWindow(nowMs, dayKey, timeZone, startHm, endHm)) {
    console.log("Fuera de ventana horaria; no se envía.");
    process.exit(0);
  }

  if (countSentToday(state.sentAt, timeZone, now) >= MAX_PER_DAY) {
    console.log("Límite diario alcanzado.");
    process.exit(0);
  }
  if (countInRollingWindow(state.sentAt, nowMs, WINDOW_12H_MS) >= MAX_PER_12H) {
    console.log("Límite de 12 h alcanzado.");
    process.exit(0);
  }
  if (countInRollingWindow(state.sentAt, nowMs, WINDOW_3MIN_MS) >= MAX_PER_3MIN) {
    console.log("Límite de 3 min alcanzado.");
    process.exit(0);
  }

  const slotIndex = findFirstDueSlot(nowMs, state.scheduledAt, state.sentSlot);
  if (slotIndex < 0) {
    console.log("Ningún slot pendiente en ventana de disparo.");
    process.exit(0);
  }

  const jokes = JSON.parse(fs.readFileSync(JOKES_PATH, "utf8"));
  const joke = sanitizeJoke(pickRandomJoke(jokes));

  const ok = await enviarMensajeTexto(recipient, joke);
  if (!ok) {
    console.error("Envío fallido; el slot no se marca como enviado.");
    process.exit(1);
  }

  state.sentSlot[slotIndex] = true;
  state.sentAt.push(new Date().toISOString());
  saveState(state);
  console.log(`Chiste enviado (slot ${slotIndex + 1}/${state.scheduledAt.length}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
