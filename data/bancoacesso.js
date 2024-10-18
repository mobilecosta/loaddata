// No arquivo bancoacesso.js
const { MongoClient } = require('mongodb');

// URL de conexão do MongoDB
const url = 'mongodb://localhost:27017';

// Nome do banco de dados
const dbName = 'incorporador';

const options = {
    connectTimeoutMS: 60000, 
    
  };
// Cria um cliente MongoDB
const client = new MongoClient(url,options);

// Conecta ao servidor MongoDB
async function conectar() {
    try {
        // Conecta ao cliente MongoDB
        await client.connect();
        console.log("Conectado com sucesso ao servidor MongoDB");
    } catch (error) {
        console.error("Erro ao conectar ao servidor MongoDB:", error);
    }
}

async function desconectar() {
    try {
        // Conecta ao cliente MongoDB
        await client.close();
        console.log("Desconexão com sucesso ao servidor MongoDB");
    } catch (error) {
        console.error("Erro ao desconectar ao servidor MongoDB:", error);
    }
}
module.exports = { conectar, client, desconectar };
