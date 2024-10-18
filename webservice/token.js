const fetch = require('node-fetch');

async function token() {
    const key = '7aLahdTVQ8Yu0NeiohQzStpIL3wa';
    const secret = 'tfXKjmzVA1MZXAmTeXO6OUZi6F0a';

    // Codifica o usuário e senha em Base64
    const basicAuth = Buffer.from(`${key}:${secret}`).toString('base64');

    try {
        console.log("Iniciando requisição de token..."); // Log para verificar se a função foi chamada

        const response = await fetch('https://apimprod.totvs.com.br/api/token?grant_type=client_credentials', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${basicAuth}`
            },
            body: new URLSearchParams({ grant_type: 'client_credentials' }) // Body com grant_type correto
        });

        //console.log(`Resposta recebida. Status: ${response.status}`); // Log do status da resposta

        if (!response.ok) {
            // Caso o status da resposta não seja OK
            throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("token [" + responseData.access_token + "]"); // Log para verificar se a função foi chamada
        //console.log("Token recebido com sucesso:", responseData); // Exibe o token recebido
        return responseData.access_token;

    } catch (error) {
        console.error("Erro ao obter o token:", error.message); // Exibe qualquer erro
    }
}

module.exports = { token };
