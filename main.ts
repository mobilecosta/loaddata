import fetch from 'node-fetch'
import axios from 'axios'

async function enviarParaTabelaP98() {
    const body = { tabela: 'CN9', pk: '10305844000102' }

    const response = await fetch('http://172.24.35.108:8037/rest/api/backoffice/Incorporador/v1/WebHookInc/', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'}
    })

    const data = await response.json()

    console.log()

}

enviarParaTabelaP98()