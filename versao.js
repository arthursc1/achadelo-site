// Versão do site — fonte única.
//
// O número aparece no cabeçalho de todas as páginas, marcado com [data-versao].
// Para subir a versão: mude a linha abaixo E registre a mudança no CHANGELOG.md.
// Nunca escreva a versão direto no HTML: ela sai de sincronia em uma semana.
const VERSAO_SITE = "1.6.0";

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-versao]").forEach((el) => {
    el.textContent = VERSAO_SITE;
  });
});
