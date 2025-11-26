const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const handleIncomingMessage = require("./messageHandling.js");

router.post("/webhook", async (req , res)=>{
    const payload = req.body;
    //creamos el dir del log
    const logDir = path.join(__dirname, "logs");
    if(!fs.existsSync(logDir)){
        fs.mkdirSync(logDir,{ recursive: true})
    };
    //log diagnositico
    const logEntry = `${new Date().toISOString()} - WEBHOOK PAYLOAD: ${JSON.stringify(payload)}\n`;
    fs.appendFileSync(path.join(logDir, "api_log.txt"), logEntry);

    //Procesar la petición
    if(
        payload?.object === "whatsapp" || payload?.object === "whatsapp_business_account"
    ){
        try{
            await handleIncomingMessage(payload);
        } catch (err){
            console.error("Error del mensaje: ", err);
            const errorLogEntry = `${new Date().toISOString()} - ERROR: ${err.message}\n${err.stack}\n`;
              fs.appendFileSync(path.join(logDir, "error_log.txt"), errorLogEntry);
        }
    } else {
        console.warn("Payload ignorado", payload?.object);
    }
    res.sendStatus(200);
});

module.exports = router;