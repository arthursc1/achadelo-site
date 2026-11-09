// Achadelo — site. Sem framework: lê dados/ofertas.json (+ dados/mascotes.json) e monta as telas.
// Formato do dinheiro em pt-BR; nenhum estado fica no servidor.

const brl = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function carregarOfertas() {
  const resposta = await fetch("dados/ofertas.json", { cache: "no-store" });
  if (!resposta.ok) throw new Error("não consegui ler dados/ofertas.json");
  return resposta.json();
}

// O mascote é enfeite: se mascotes.json faltar ou vier quebrado, o site segue sem ele.
async function carregarMascotes() {
  try {
    const resposta = await fetch("dados/mascotes.json", { cache: "no-store" });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  }
}

function mascoteDaCategoria(mascotes, categoria) {
  return mascotes?.categorias?.[categoria] ?? null;
}

// A arte já tem o carvão da marca no fundo: alt vazio mantém a imagem decorativa
// (o nome acessível do chip continua sendo só o nome da categoria).
function imagemMascote(info, classe) {
  if (!info) return "";
  return `<img class="${classe}" src="${info.arquivo}" alt="" loading="lazy" width="512" height="512">`;
}

function cardOferta(oferta) {
  const artigo = document.createElement("a");
  artigo.className = "card";
  artigo.href = `oferta.html?id=${encodeURIComponent(oferta.id)}`;
  artigo.innerHTML = `
    <div class="foto">
      <img src="${oferta.foto}" alt="${oferta.titulo}" loading="lazy">
      <span class="selo">-${oferta.desconto}%</span>
    </div>
    <div class="texto">
      <span class="tag">${oferta.loja}</span>
      <span class="titulo">${oferta.titulo}</span>
      <span class="de">${brl(oferta.preco_antigo)}</span>
      <span class="preco">${brl(oferta.preco)}</span>
    </div>`;
  return artigo;
}

function montarVitrine(dados, mascotes) {
  const grade = document.getElementById("grade");
  const filtros = document.getElementById("filtros");
  const vazio = document.getElementById("vazio");
  const exemplo = dados.ofertas.some((o) => o.exemplo);
  if (exemplo) document.getElementById("tarja-exemplo").hidden = false;

  // o mascote só entra no filtro quando a categoria já tem oferta de verdade
  const temOferta = (id) => dados.ofertas.some((o) => o.categoria === id);

  const categorias = [{ id: "tudo", nome: "Tudo" }, ...dados.categorias];
  categorias.forEach((categoria, indice) => {
    const botao = document.createElement("button");
    botao.className = "chip";
    botao.type = "button";
    const info = temOferta(categoria.id) ? mascoteDaCategoria(mascotes, categoria.id) : null;
    botao.innerHTML = `${imagemMascote(info, "mascote-chip")}<span>${categoria.nome}</span>`;
    botao.setAttribute("aria-pressed", indice === 0 ? "true" : "false");
    botao.addEventListener("click", () => {
      filtros.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      botao.setAttribute("aria-pressed", "true");
      desenhar(categoria.id);
    });
    filtros.appendChild(botao);
  });

  function desenhar(categoria) {
    const lista = dados.ofertas
      .filter((o) => categoria === "tudo" || o.categoria === categoria)
      .sort((a, b) => Number(b.destaque) - Number(a.destaque) || b.desconto - a.desconto);
    grade.replaceChildren(...lista.map(cardOferta));
    vazio.hidden = lista.length > 0;
    if (lista.length) return;

    const info = mascoteDaCategoria(mascotes, categoria) ?? mascotes?.geral ?? null;
    const mascote = info
      ? `<div class="vazio-mascote">${imagemMascote(info, "")}<p><strong>${info.nome}</strong> — ${info.frase}</p></div>`
      : "";

    if (!dados.ofertas.length) {
      vazio.innerHTML = `${mascote}
        <strong>As primeiras ofertas estão sendo garimpadas.</strong><br>
        A marca começa por casa e cozinha: cada oferta é conferida antes de entrar aqui,
        e a data da conferência vai em toda peça.<br><br>
        Enquanto isso, me segue no Instagram: <a href="https://instagram.com/achadelo" target="_blank" rel="noopener">@achadelo</a>`;
      return;
    }
    const nome = categorias.find((c) => c.id === categoria)?.nome ?? categoria;
    vazio.innerHTML = `${mascote}
      <span>Nada em ${nome} ainda — a marca começa por casa e cozinha e amplia depois.</span>`;
  }

  desenhar("tudo");
}

function montarOferta(dados, mascotes) {
  const id = new URLSearchParams(location.search).get("id");
  const oferta = dados.ofertas.find((o) => o.id === id);
  const alvo = document.getElementById("conteudo");

  if (!oferta) {
    alvo.innerHTML = `
      <h1>Oferta não encontrada</h1>
      <p class="nota">O endereço pode ter sido copiado errado, ou a oferta saiu do ar.</p>
      <p><a class="botao" href="./">ver todas as ofertas</a></p>`;
    return;
  }

  document.title = `${oferta.titulo} — Achadelo`;
  const semLink = !oferta.link;
  const info = mascoteDaCategoria(mascotes, oferta.categoria);
  const garimpado = info
    ? `<p class="garimpado">${imagemMascote(info, "")}<span>${info.frase}</span></p>`
    : "";
  alvo.innerHTML = `
    <div class="foto">
      <img src="${oferta.foto}" alt="${oferta.titulo}">
      <span class="selo">-${oferta.desconto}%</span>
    </div>
    <div>
      <span class="tag" style="color:var(--acento);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase">${oferta.loja}</span>
      <h1>${oferta.titulo}</h1>
      <p class="de">${brl(oferta.preco_antigo)}</p>
      <p class="preco">${brl(oferta.preco)}</p>
      ${oferta.observacao ? `<p class="nota">${oferta.observacao}</p>` : ""}
      ${garimpado}
      <p style="margin:18px 0 10px">
        ${semLink
          ? `<button class="botao" type="button" disabled>link de afiliado ainda não cadastrado</button>`
          : `<a class="botao" href="${oferta.link}" rel="nofollow sponsored noopener" target="_blank">ver no ${oferta.loja}</a>`}
      </p>
      <p class="aviso-publicidade">link de afiliado · #publi</p>
      <p class="nota">Preço conferido em ${oferta.visto_em.split("-").reverse().join("/")}. Oferta de terceiro: pode acabar ou mudar de preço a qualquer momento.</p>
      ${oferta.exemplo ? `<p class="tarja-exemplo">Dados de exemplo, para avaliação do site. Preço não conferido em anúncio.</p>` : ""}
    </div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const destino = document.getElementById("conteudo")
    || document.getElementById("grade")
    || document.body;
  try {
    const [dados, mascotes] = await Promise.all([carregarOfertas(), carregarMascotes()]);
    if (document.getElementById("grade")) montarVitrine(dados, mascotes);
    else montarOferta(dados, mascotes);
  } catch (erro) {
    destino.innerHTML = `<p class="carregando">Não consegui carregar as ofertas: ${erro.message}</p>`;
  }
});
