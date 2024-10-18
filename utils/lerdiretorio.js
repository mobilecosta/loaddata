const fs = require('fs');
const path = require('path');

const directoryPath = 'C://_Migração//Totvs';

// Função para ler arquivos de um diretório e retornar um array com os nomes dos arquivos
function lerArquivosDoDiretorio(diretorio) {
    return new Promise((resolve, reject) => {
        fs.readdir(diretorio, (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(files);
        });
    });
}

// Chamada da função para ler os arquivos do diretório
lerArquivosDoDiretorio(directoryPath)
    .then(files => {
        //console.log("Arquivos do diretório:");
        //console.log(files);
    })
    .catch(err => {
        console.error("Erro ao ler os arquivos do diretório:", err);
    });

module.exports = { lerArquivosDoDiretorio };