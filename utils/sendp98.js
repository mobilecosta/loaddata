export function enviarTotvs() {
const data = { table: 'CN9', pk: '10305844000102'  };

fetch('http://172.24.35.108:8037/rest/api/backoffice/Incorporador/v1/WebHookInc/', {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
})
  .then((response) => response.json())
  .then((data) => {
    console.log("Success:", data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
}