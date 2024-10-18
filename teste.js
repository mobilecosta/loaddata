
function trazerRepositorios() {
  axios.get(`https://api.github.com/users/alexandre.venancio/repos`)
    .then((response) => {
      const repos = response.data;
      console.log(repos);
      var lista = document.querySelector("#repos");
      for (i in repos) {
        console.log(repos[i]);
        var elemento = document.createElement("li");
        elemento.innerHTML = JSON.stringify(repos[i].url);
        lista.appendChild(elemento);
      }
    })
    .catch((error) => console.error(error));
}