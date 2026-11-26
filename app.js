// Achadelo — site. Sem framework: lê dados/ofertas.json (+ dados/mascotes.json) e monta as telas.
// Formato do dinheiro em pt-BR; nenhum estado fica no servidor.

const brl = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DOMINIO = "https://achadelo.com.br";

// O Search Console acusou "cópia sem página canônica selecionada pelo usuário": as
// páginas de oferta saem todas do mesmo HTML, então quem diz qual URL é a boa é esta
// função, chamada com a URL da oferta que está sendo montada.
function declararCanonica(url) {
  const alvo = `${DOMINIO}${url}`;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = alvo;
  return alvo;
}

function declararMeta(nome, conteudo, atributo = "name") {
  if (!conteudo) return;
  let meta = document.querySelector(`meta[${atributo}="${nome}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(atributo, nome);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", conteudo);
}

// Casca sem oferta (id ausente ou desconhecido) não tem conteúdo próprio: além de
// não competir com a vitrine no índice, ela não deve aparecer na busca.
function marcarSemIndice() {
  declararCanonica("/");
  declararMeta("robots", "noindex, follow");
}


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

// O cartão leva direto para a página estática da oferta (/oferta/<id>/): existe de
// verdade no repositório, com o conteúdo no HTML — antes apontava para o endereço de
// JavaScript (oferta.html?id=…), que era uma casca só.
function cardOferta(oferta) {
  const artigo = document.createElement("a");
  // oferta com cupom ganha brilho na borda e o aviso: o preço cheio continua sendo
  // o principal, porque o cupom é condicional (pode não estar mais disponível)
  artigo.className = oferta.preco_cupom ? "card com-cupom" : "card";
  artigo.href = `oferta/${encodeURIComponent(oferta.id)}/`;
  artigo.innerHTML = `
    <div class="foto">
      <img src="${oferta.foto}" alt="${oferta.titulo}" loading="lazy">
      <span class="selo">-${oferta.desconto}%</span>
      ${oferta.preco_cupom ? '<span class="selo-cupom">possível cupom</span>' : ""}
    </div>
    <div class="texto">
      <span class="tag">${oferta.loja}</span>
      <span class="titulo">${oferta.titulo}</span>
      <span class="de">${brl(oferta.preco_antigo)}</span>
      <span class="preco">${brl(oferta.preco)}</span>
      ${oferta.preco_cupom
        ? `<span class="aviso-cupom">possível cupom disponível: ${brl(oferta.preco_cupom)}</span>`
        : ""}
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
    marcarSemIndice();
    return;
  }

  // Cada oferta agora tem página estática própria (/oferta/<id>/), com título, preço,
  // foto e dados estruturados já no HTML — o Google não precisa mais executar
  // JavaScript para ver a oferta. Este endereço antigo só leva o visitante até lá.
  const estatica = `oferta/${encodeURIComponent(oferta.id)}/`;
  declararCanonica(`/oferta/${encodeURIComponent(oferta.id)}/`);
  document.title = `${oferta.titulo} — Achadelo`;
  alvo.innerHTML = `<p class="carregando">abrindo <a href="${estatica}">${oferta.titulo}</a>…</p>`;
  location.replace(estatica);
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
