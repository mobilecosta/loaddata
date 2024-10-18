const inquirer = require('inquirer').default;

async function solicitarCNPJ() {
    try {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'cnpj',
                message: 'Informe o CNPJ:',
                validate: function (input) {
                    if (input.length !== 14) {
                        return 'O CNPJ deve ter 14 dígitos.';
                    }
                    return true;
                }
            }
        ]);

        console.log(`CNPJ informado: ${answers.cnpj}`);
        //return answers.cnpj;
    } catch (error) {
        console.error('Erro:', error);
    }
}

module.exports = { solicitarCNPJ };
//solicitarCNPJ();