const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const verifyWebhook = require("./webhookVerification.js");
const webhookRouter = require("./webhook.js");
const app = express();
const PORT = 3001;

// Ruta del Get
app.get("/webhook", verifyWebhook);

app.use(cors());
app.use(express.json());
//app.use(bodyParser.json());

// Rutas del webhook
app.use("/", webhookRouter);

app.listen(PORT, () => {
  console.log(`Webhook listening on port ${PORT}`);
  // appendFileSync here for a simple startup log; in production use async logging or a logger library
  fs.appendFileSync('apiLog.txt', `Webhook listening on port ${PORT}\n`);
});