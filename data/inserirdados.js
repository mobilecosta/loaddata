const { client, dbName } = require('./bancoacesso');
// Função para inserir um documento em uma coleção específica
async function inserirDocumento(collectionName, documents) {
    try {
        // Seleciona o banco de dados
        const db = client.db(dbName);

        // Seleciona a coleção onde os documentos serão inseridos
        const collection = db.collection(collectionName);

        // Insere os documentos na coleção
        const result = await collection.insertMany(documents);

        console.log(`Documentos inseridos na coleção ${collectionName}`);
    } catch (error) {
        console.error("Erro ao inserir documentos:", error);
    }
}

module.exports = { inserirDocumento };
