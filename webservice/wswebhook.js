const fetch = require('node-fetch');
const retry = require('async-retry');

async function wswebhook(tabela, res, cnpj, token) {
    const data = { table: tabela, pk: '07363764001081', fields: res };
    //07363764001081  // 27231185000282 
    if (!isValidJSON(JSON.stringify(data))) {
        console.error("Invalid JSON data:", data);
        return;
    }
    
    // Define usuário e senha
    const username = 'SP01\\ws.devintegrador';
    const password = 'Y8#2T;Cg,sQ{';   

    // Codifica o usuário e senha em Base64
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    try {
        await retry(async (bail) => {
            const response = await fetch('http://172.24.35.119:8032/rest/api/backoffice/Incorporador/v1/WebHookInc/', {
            //const response = await fetch('https://tidevops.totvs.com.br:4434/protheus/backoffice/v1/incorporador/WebHookInc', {
            //const response = await fetch('http://172.24.35.117:8048/api/backoffice/Incorporador/v1/WebHookInc/', {
            //const response = await fetch('https://prewscorp.totvs.com.br/api/backoffice/Incorporador/v1/WebHookInc/', {
            //const response = await fetch('http://172.24.35.100:8048/api/backoffice/Incorporador/v1/WebHookInc/', {
            //const response = await fetch('https://apimprod.totvs.com.br/api/protheus-backoffice-integramais/v1.0/WebHookInc', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${basicAuth}`  //Pre Producao
                    //"Authorization": `Bearer ${token}`       //Producao
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                //throw new Error(`Non-ok response: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            //console.log("Success:", responseData);
        }, {
            retries: 10, // Numero de retries
            minTimeout: 1000, // Minimum delay between retries (in ms)
            maxTimeout: 21000, // Maximum delay between retries (in ms)
            onRetry: (error, attempt) => {
                //console.log(`Retrying... Attempt ${attempt}. Error:`, error.message);
            }
        });
    } catch (error) {
        //console.error("Error:", error.message);
    }
}

// Função para verificar se o JSON é válido
function isValidJSON(jsonString) {
    try {
        JSON.parse(jsonString);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = { wswebhook };