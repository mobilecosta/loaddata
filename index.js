const reader = require('xlsx');
const fs = require('fs');
const path = './/plan//planilha_matriz//tabelas.xlsx';
    
const { conectar, desconectar } = require('./data/bancoacesso');
const { inserirDocumento } = require('./data/inserirdados');

const { lerArquivosDoDiretorio, files } = require('./utils/lerdiretorio');
const directoryPath = './/plan//';
const { wswebhook } = require('./webservice/wswebhook');
const { forIn } = require('lodash');
const datahoraExecucao = getCurrentDateTime();
const readline = require('readline');
const { solicitarCNPJ } = require('./src/inquirer');
const { token } = require('./webservice/token')

// Função principal para ler e validar os dados da planilha

async function processarPlanilha(planilhaImportar, nomePlanilha, cnpj) {
    
    try {

        const access_token  = await token(); // Agora apenas o access_token é retornado


        const workbook1 = reader.readFile(planilhaImportar);
        const workbook2 = reader.readFile(path);
        
        const sheets1 = workbook1.SheetNames;
        let numeroRegistros = 0;
        let numeroRetorno = 0;

        
        //tratar primeiro a planilha para retirar as virgulas para não quebrar o json
        for (const sheetName of sheets1) {
            const sheet = workbook1.Sheets[sheetName];

            // Aqui você percorre cada célula da planilha e faz o tratamento necessário
            const range = reader.utils.decode_range(sheet['!ref']);

            for (let R = range.s.r; R <= range.e.r; ++R) { // Percorre as linhas
                for (let C = range.s.c; C <= range.e.c; ++C) { // Percorre as colunas
                    const cell_address = { c: C, r: R };
                    const cell_ref = reader.utils.encode_cell(cell_address);
                    const cell = sheet[cell_ref];
                    
                    // Se estamos na primeira linha (os cabeçalhos) algumas planilhas estão chegando com espaços a esquerda no nome da coluna
                    if (R === 0 && cell && typeof cell.v === 'string') {
                        // Remove espaços à direita e à esquerda
                        cell.v = cell.v.trim();
                    }

                    if (cell && typeof cell.v === 'string' && cell.v.includes(',')) {
                        // Substitua vírgulas por pontos nos valores numéricos
                        if (!isNaN(cell.v.replace(',', '.'))) {
                            cell.v = cell.v.replace(',', '.');
                        } else {
                            // Caso não seja número, apenas remove as vírgulas
                            cell.v = cell.v.replace(/,/g, '');
                        }
                    }
                }
            }
        }

        for (const sheetName of sheets1) {
            const data1 = reader.utils.sheet_to_json(workbook1.Sheets[sheetName]);
            numeroRegistros = 0;

            const documentosParaInserir = []; 
            let tamanhoReferencia = null;
            let colunasReferencia = null;
            
            // Validar cada linha da planilha
            for (const row of data1) {
                
                let jsonDataCorrigido = {};
                for (let key in row) {
                    let trimmedKey = key.trim();  // Remove os espaços ao redor da chave
                    jsonDataCorrigido[trimmedKey] = row[key];  // Adiciona ao novo objeto
                }

                // Verificar o número de chaves na linha atual
                const tamanhoAtual = Object.keys(jsonDataCorrigido).length;
                const chavesAtuais = Object.keys(jsonDataCorrigido);
                // Se é a primeira linha, definir o tamanho de referência
                if (tamanhoReferencia === null && colunasReferencia === null) {
                    tamanhoReferencia = tamanhoAtual;
                    colunasReferencia = chavesAtuais;
                }

                 // Verificar se o tamanho da linha atual é igual ao de referência
                if (tamanhoAtual !== tamanhoReferencia) {
                    // Verificar se as colunas são as mesmas
                    const colunasDiferentes = colunasReferencia.filter(coluna => !chavesAtuais.includes(coluna));
                    
                     // Adicionar as colunas faltantes com um valor padrão (ex: null)
                     colunasDiferentes.forEach(colunaFaltante => {
                        jsonDataCorrigido[colunaFaltante] =  ' ';  // ou '' se preferir uma string vazia
                    });
                }

                const validationResult = validarCampos(sheetName, jsonDataCorrigido, workbook2);
                
                
                if (validationResult.isvalid) {
                    jsonDataCorrigido.validado = true;
                    numeroRetorno++;
                } else {
                    jsonDataCorrigido.validado = false;
                }

                if (!isStringVazia(validationResult.statusTexto)) {
                    jsonDataCorrigido.statusTexto = validationResult.statusTexto;
                }

                numeroRegistros++;
                
        // Adicionar o objeto corrigido ao array de documentos para inserir
        documentosParaInserir.push(jsonDataCorrigido);
                
                if (!isStringVazia(validationResult.statusTexto) && validationResult.statusTexto.length > 0) {
                    if (!validationResult.isvalid) {
                        // Salvar log de erro
                        salvarLogExecucao(sheetName, numeroRegistros, jsonDataCorrigido.statusTexto, 'Erro na linha da planilha', nomePlanilha, datahoraExecucao,false);
                    } else {
                        salvarLogExecucao(sheetName, numeroRegistros, jsonDataCorrigido.statusTexto, 'Aviso de correção na linha da planilha', nomePlanilha, datahoraExecucao,false);
                    }
                } else {
                    salvarLogExecucao(sheetName, numeroRegistros, 'Sucesso!!!', 'Executado com sucesso!!!', nomePlanilha, datahoraExecucao,false);
                }
            }

            salvarLogExecucao('Tabela '+sheetName+' processada, '+numeroRegistros+' registros processados na planilha', ' ', 'Sucesso!!!', ' ', ' ', datahoraExecucao,true);
            
            console.log('Tabela '+sheetName+' processada, '+numeroRegistros+' registros processados na planilha');
            
            //iniciar(documentosParaInserir);
            // Enviar cada item corrigido para o web service
            for (const res of documentosParaInserir) {
                wswebhook(sheetName, res, cnpj, access_token);
                await sleep(100);  // Pausa para evitar excesso de chamadas
            }
            /*for (res of data1) {
                wswebhook(sheetName,res,cnpj,access_token);
                await sleep(100);
                //console.log(res);
            }*/
        }

        console.log('Registros processados!!! Iniciando envio dos dados para o webhook!!!');
        

        return numeroRetorno;
    } catch (error) {
        console.error("Erro ao processar planilha:", error);
    }
}

// Função para validar os campos de uma linha da planilha
function validarCampos(sheetName, rowData, workbook) {

    let isvalid = true;
    let statusTexto = ' ';
    let retorno = true;
    let statusRetorno = ' ';

    const sheets2 = workbook.SheetNames;

    var guiaPlanilha = 0;

    const sheetReferenciada = sheetName;

    if (!sheets2.includes(sheetName)) {
        console.log(`Tabela '${sheetName}' não encontrada na planilha matriz - `);
        return {
            isvalid:false,
            statusTexto:`Tabela '${sheetName}' não encontrada na planilha matriz - `
        };
    }
    // Percorra a planilha de modelo dos itens
    for (let i = 0; i < sheets2.length; i++) {
        const nomeSheet = sheets2[i];
        
        if (nomeSheet === sheetReferenciada) {
            guiaPlanilha = i;
            break;
        }
    }

    //Abre a planilha Matriz com as tabelas e campos a serem validados. 
    const sheet2 = workbook.Sheets[workbook.SheetNames[guiaPlanilha]];
    const data2 = reader.utils.sheet_to_json(sheet2);

    for (const foundRow of data2) {
        const campo = foundRow.CAMPO.replace(/\s+/g, ''); //foundRow.CAMPO;
        const tamanho = foundRow.TAMANHO;
        const pesquisa = foundRow.PESQUISA;
        const validacaoProtheus = foundRow.VALIDAP;
        const campoObrigatorio = foundRow.OBRIGATORIO;
        const campoVazio = foundRow.VAZIO;
        
        let tipo = foundRow.TIPO;
        let conteudoFixo = foundRow.FIXO;
        let conteudo = tipo === "N" && rowData[campo] === undefined  ? rowData[` ${campo} `] : rowData[campo];
        let tipoDado = typeof(conteudo);
        let tamanhoEnviado = 0;

        if (conteudo === undefined) {
            if (campoObrigatorio !== undefined && campoObrigatorio == "S") {
                statusRetorno += `Campo '${campo}' não encontrado na planilha \n`;
                retorno = false;
                continue;
            } else {
                conteudo =' ';
                rowData[campo] = conteudo;
            }
        }

        if ( tipoDado === 'string') {
            if ( conteudo.includes(',')) {
                conteudo = conteudo.replace(',',' ');
                rowData[campo] = conteudo;
            }

            conteudo = retira_acentos(conteudo);
            rowData[campo] = conteudo;
        }
        
        if ( tipoDado === 'number' & (validacaoProtheus === 'DTOS' | validacaoProtheus === 'PADRAO')) {
            if (conteudo < 1500000) { 
                conteudo = excelDateToJSDate(conteudo);
            } else {
                conteudo = conteudo.toString();
            }
            tipoDado = 'string';
        }

        if ( tipoDado === 'number' & tipo === 'C') {
            conteudo = conteudo.toString();
            tipoDado = 'string';
            rowData[campo] = conteudo;
        }

        if (!isStringVazia(validacaoProtheus)) {
            
            switch (validacaoProtheus) {
                case "FIXO":
                    
                    let conteudoOk = true ;

                    if (typeof(conteudo) == typeof(conteudoFixo)) {
                        conteudoOk = conteudo === conteudoFixo;
                    } else {
                        if (tipo === "C") {
                            conteudoOk = conteudo.toString === conteudoFixo.toString;
                        } else if(tipo === "N") {
                            conteudoOk = parseInt(conteudo) === parseInt(conteudoFixo);
                        } else {
                            conteudoOk = conteudo === conteudoFixo;
                        }
                    }
                    

                    if(!conteudoOk) {
                        statusRetorno += `Conteudo invalido no campo '${campo}' conteudo enviado '${conteudo}' conteudo corrigido '${conteudoFixo}'\n`;
                        rowData[campo] = conteudoFixo;
                        conteudo = conteudoFixo;
                    }
                    break;
                case "STRZERO":
                    if (tipoDado === 'number') { 
                        tamanhoEnviado = conteudo.toString();
                        tamanhoEnviado = tamanhoEnviado.length;
                    } else {
                        tamanhoEnviado = conteudo.length;
                    }
                    
                    if (tamanhoEnviado < tamanho) {
                        if(!isStringVazia(conteudoFixo)) {
                            conteudo = preencherZerosEsquerda(conteudo, conteudoFixo);
                        } else {
                            conteudo = preencherZerosEsquerda(conteudo, tamanho);
                        }

                        statusRetorno += `Faltou completar zeros a esquerda no campo '${campo}', este será alterado para '${conteudo}'\n`;

                        rowData[campo] = conteudo
                    }
                    break;
                case "DTOS":
                    if (!validarDataAAAAMMDD(conteudo)) {
                        if ( tipoDado === 'string') {
                            if (conteudo.includes("/")) {
                                const dateFormato = conteudo.split('/');
                                let cano = dateFormato[2];
                                
                                if (cano.length === 2) {
                                    cano = "20"+cano; 
                                    conteudo = cano+dateFormato[1]+dateFormato[0];
                                
                                } else {
                                    conteudo = dateFormato[2]+dateFormato[1]+dateFormato[0];
                                }
                                //quando dateFormato[2] vier com 2 caracteres acrescentar 20
                                rowData[campo] = conteudo;
                            } else if (conteudo.includes("-")) {
                                conteudo = conteudo.replace('-','');
                                if (conteudo.includes("-")) {
                                    conteudo = conteudo.replace('-','');
                                }
                                rowData[campo] = conteudo;
                            }
                            if (!validarDataAAAAMMDD(conteudo)) {
                                retorno = false;
                                statusRetorno += `Campo data '${campo}' com valor inválido, deverá ser corrigido e carregado novamente. \n`;
                            }
                        } else {
                            //retorno = false;
                            //statusRetorno += `Campo data '${campo}' com valor inválido, deverá ser corrigido e carregado novamente. \n`;
                            rowData[campo] = conteudo;
                        }
                        
                    } else {
                        //retorno = false;
                        //statusRetorno += `Campo data '${campo}' com valor inválido, deverá ser corrigido e carregado novamente. \n`;
                        rowData[campo] = conteudo;
                    }
                    
                    break;
                case "VAZIO":
                    if(!isStringVazia(conteudo)) {
                        statusRetorno += `O campo '${campo}' deve estar vazio, conteúdo sendo alterado na linha \n`;

                        rowData[campo] = ' '
                    }
                    break;
                case "NUMERO":

                    if (conteudo !== 0) {
                        if (conteudo.toString().includes(',')) {
                            conteudo = conteudo.toString().replace(',','.');
                            rowData[campo] = conteudo;
                        }
                    }
                    break;
                case "MAX":
                    if (conteudo.length > tamanho) {
                        conteudo = conteudo.substring(0, tamanho);
                        rowData[campo] = conteudo;
                    }
                    break;
                case "PADRAO":
                    if (conteudo.includes("-")) {
                        //Tratamento para Campos de formato padrao (com conteúdo convertido para data)
                        if (conteudoFixo == 'MM/AAAA') {
                            conteudo = conteudo.split('-')[1]+"/"+conteudo.split('-')[0];
                        }
                        
                        rowData[campo] = conteudo;
                    }
                    break;
                default:
                    break;
            }

        }
    }

    return {
        isvalid:retorno,
        statusTexto:statusRetorno
    };
}

// Função para salvar log de erro
function salvarLogExecucao(sheetName, linha, expectedLength, tipoMensagem, planilha, datahoraExecucao, logExecucao) {
    //const logMessage = `Erro na planilha "${sheetName}". No campo "${column}" conteúdo "${value}" erro apresentado ${expectedLength}.`;
    if (logExecucao) {
        const logMessage = `"${sheetName} ${expectedLength} `;
        fs.appendFileSync(directoryPath+`logs//log_execucao_geral_${datahoraExecucao}.txt`, logMessage + '\n');
    } else {
        const logMessage = `"${tipoMensagem} ${sheetName}". Na linha "${linha}" resultado \n ${expectedLength}.`;
        fs.appendFileSync(directoryPath+`logs//log_execucao_planilha_${planilha}_${datahoraExecucao}.txt`, logMessage + '\n');
    }
}

//Ler a planilha principal com as informações de cada campo
//planilha Matriz com as tabelas e campos a serem validados.
//Jogar em array para validar os campos depois
//Não esta utilizando por enquanto, deixei aqui apenas para guardar o exemplo
function lerPlanilha(path) {
    const workbook = reader.readFile(path);
    const sheets = workbook.SheetNames;
    const linhas = [];

    for (const sheetName of sheets) {
        const data = reader.utils.sheet_to_json(workbook.Sheets[sheetName]);
        for (const row of data) {
            linhas.push(row);
        }
    }

    return linhas;
}

// Função para capturar entrada do usuário no terminal
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// Chamar a função principal para processar a planilha
lerArquivosDoDiretorio(directoryPath)
    .then(files => {
        
        const arrayArquivos = files;
        //const cnpj = solicitarCNPJ();
        let numeroProcessados = 0;
        
        for(const contador of arrayArquivos) {
            const contemTxt = contador.includes('xls');

            if (contemTxt) {
                console.log(`Leitura do arquivo ${contador}`);
                let texto = ' ' ;
                numeroProcessados += processarPlanilha(directoryPath+contador,contador);
                if (numeroProcessados > 0) {
                    texto = 'Executado com sucesso!!!';
                } else {
                    texto = 'Nao executado';
                }
                salvarLogExecucao(`Leitura do arquivo ${contador}`, ' ', 'Sucesso!!!', ' ', ' ', datahoraExecucao,true);
            }
            
        }

        //salvarLogExecucao(`Total de registros processados '${numeroProcessados}'`, ' ', 'Sucesso!!!', ' ', ' ', datahoraExecucao,true);
        console.log(`Total de registros processados '${numeroProcessados}'`);
            
    })
    .catch(err => {
        console.error("Erro ao ler os arquivos do diretório:", err);
    });

// Função principal para chamada do processo de gravação no banco
/*async function iniciar(documentosParaInserir) {
    try {
        // Conecte-se ao banco de dados MongoDB
        await conectar();

        // Insira os documentos no banco de dados
        await inserirDocumento('incorporador', documentosParaInserir);

        // Outras operações, se necessário...
    } catch (error) {
        console.error("Erro ao iniciar o processo:", error);
    } finally {
        // Feche a conexão com o banco de dados, se necessário...
        //await desconectar();
    }
}
*/
//Validar se o campo de validação do protheus não esta vazio para colocar o tratamento no conteudo
function isStringVazia(str) {
    // Verifica se a string é null ou undefined
    if (str == null) {
        return true;
    } else {
        return false;
    }
}

//Função strzero protheus
function preencherZerosEsquerda(str, totalLength) {
    return String(str).padStart(totalLength, '0');
}

//validar se a data informada no campo esta ok
function validarDataAAAAMMDD(data) {
    // Verifica se a string tem exatamente 8 caracteres
    if (data.length !== 8) {
        return false;
    }

    // Extrai o ano, mês e dia da string
    const ano = parseInt(data.substring(0, 4), 10);
    const mes = parseInt(data.substring(4, 6), 10) - 1; // Os meses no objeto Date são 0-indexados (0-11)
    const dia = parseInt(data.substring(6, 8), 10);

    // Verifica se os valores extraídos são números válidos
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) {
        return false;
    }

    // Cria um objeto Date com os valores extraídos
    const dataObj = new Date(ano, mes, dia);

    // Verifica se a data no objeto Date corresponde à data fornecida
    return (
        dataObj.getFullYear() === ano &&
        dataObj.getMonth() === mes &&
        dataObj.getDate() === dia
    );
}

// Função para validar data na planilha quando o script le como numero

/* function excelDateToJSDate(excelDate) {
    const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
    const convertedDate = date.toISOString().split('T')[0];
    return convertedDate;
} */

function excelDateToJSDate(excelDate) {
    const epochStart = new Date(Date.UTC(1899, 11, 30)); // 30 de dezembro de 1899 é a base correta
    const date = new Date(epochStart.getTime() + (excelDate * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

// Função para obter a data e hora atuais formatadas
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function retira_acentos(str) {

    com_acento = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŔÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŕ";
    sem_acento = "AAAAAAACEEEEIIIIDNOOOOOOUUUUYRsBaaaaaaaceeeeiiiionoooooouuuuybyr";
    novastr="";
    for(i=0; i<str.length; i++) {
        troca=false;
        for (a=0; a<com_acento.length; a++) {
            if (str.substr(i,1)==com_acento.substr(a,1)) {
                novastr+=sem_acento.substr(a,1);
                troca=true;
                break;
            }
        }
        if (troca==false) {
            novastr+=str.substr(i,1);
        }
    }
    return novastr;
}