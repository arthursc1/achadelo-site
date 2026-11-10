// Achadelo — espaços de publicidade (AdSense).
//
// Três lugares reservados: banner no alto (dentro do cabeçalho) e duas colunas
// laterais em telas largas. Nada é carregado enquanto site/ads.json estiver com
// "ativo": false — assim o site não faz requisição ao Google nem mostra espaço
// vazio antes da aprovação.
//
// Quando as unidades existirem: preencha "slots" no ads.json e mude "ativo" para
// true. Nada mais precisa ser tocado.

const LATERAIS = [
  { chave: "lateral-esquerda", classe: "anuncio-esq" },
  { chave: "lateral-direita", classe: "anuncio-dir" },
];

function criarBloco(cliente, slot) {
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.dataset.adClient = cliente;
  ins.dataset.adSlot = slot;
  ins.dataset.adFormat = "auto";
  ins.dataset.fullWidthResponsive = "true";
  return ins;
}

function criarLaterais(cliente, config) {
  for (const { chave, classe } of LATERAIS) {
    const slot = config.slots?.[chave];
    if (!slot) continue;
    const coluna = document.createElement("aside");
    coluna.className = `anuncio anuncio-lateral ${classe}`;
    coluna.setAttribute("aria-label", "publicidade");
    coluna.appendChild(criarBloco(cliente, slot));
    document.body.appendChild(coluna);
  }
}

function criarTopo(cliente, config) {
  const slot = config.slots?.topo;
  if (!slot) return;
  const alvo = document.querySelector("[data-anuncio='topo']");
  if (!alvo) return;
  alvo.appendChild(criarBloco(cliente, slot));
  alvo.classList.add("preenchido");
}

// O AdSense marca o bloco como "unfilled" quando não tem anúncio para servir.
// Nesse caso o espaço encolhe, em vez de deixar um retângulo vazio.
function colapsarVazios() {
  document.querySelectorAll(".anuncio ins.adsbygoogle").forEach((ins) => {
    if (ins.getAttribute("data-ad-status") === "unfilled") {
      ins.closest(".anuncio")?.classList.add("sem-anuncio");
    }
  });
}

async function iniciar() {
  let config;
  try {
    const resposta = await fetch("ads.json", { cache: "no-store" });
    config = await resposta.json();
  } catch (erro) {
    return; // sem configuração, sem anúncio — o site segue normal
  }

  if (!config?.ativo || !config?.cliente) return;
  const temSlot = Object.values(config.slots || {}).some((s) => s && String(s).trim() !== "");
  if (!temSlot) return;

  document.body.classList.add("tem-anuncios");
  criarTopo(config.cliente, config);
  criarLaterais(config.cliente, config);

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.cliente}`;
  document.head.appendChild(script);

  document.querySelectorAll("ins.adsbygoogle").forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (erro) { /* bloqueador de anúncio */ }
  });

  setInterval(colapsarVazios, 1500);
}

document.addEventListener("DOMContentLoaded", iniciar);
