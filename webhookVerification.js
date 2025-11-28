function webhookVerificationHandler(req,res){
    const VERIFY_TOKEN = "Test1234";
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('--- INTENTO DE VERIFICACIÓN ---');
    console.log('Mode recibido:', mode);
    console.log('Token recibido:', token);
    console.log('Token esperado:', VERIFY_TOKEN);
    console.log('Comparación de Mode:', mode === 'subscribe');
    console.log('Comparación de Token:', token === VERIFY_TOKEN);
    console.log('------------------------------');

    if(mode === 'subscribe' && token === VERIFY_TOKEN){
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
}

module.exports = webhookVerificationHandler;