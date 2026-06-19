// ==================== VARIÁVEIS GLOBAIS ====================
let corAtual = "#008080";
let clubeFotoBase64 = "";
let nomeGrupoAtual = "";
let cotacoesSalvas = JSON.parse(localStorage.getItem("cotacoes_isi")) || [];
let ofertasRaw = [];
let ofertaSelecionadaRaw = null;
let trechosMult = [{ id: 1, nome: "Trecho 1" }, { id: 2, nome: "Trecho 2" }];
let trechoCount = 2;

// ==================== AEROPORTOS BRASILEIROS / IATA ====================
// Usado para sugerir código IATA e preencher a cidade automaticamente.
const aeroportosBR = {
  AFL:"Alta Floresta", AJU:"Aracaju", AQA:"Araraquara", ARU:"Araçatuba", ATM:"Altamira",
  BEL:"Belém", BPG:"Barra do Garças", BRA:"Barreiras", BSB:"Brasília", BVB:"Boa Vista", BVH:"Vilhena", BYO:"Bonito",
  CAC:"Cascavel", CAU:"Caruaru", CGB:"Cuiabá", CGH:"São Paulo / Congonhas", CGR:"Campo Grande", CKS:"Carajás / Parauapebas",
  CLV:"Caldas Novas", CMG:"Corumbá", CNF:"Belo Horizonte / Confins", CWB:"Curitiba", CXJ:"Caxias do Sul", CZS:"Cruzeiro do Sul",
  DIQ:"Divinópolis", DOU:"Dourados", FLN:"Florianópolis", FOR:"Fortaleza", GIG:"Rio de Janeiro / Galeão", GNM:"Guanambi",
  GRU:"São Paulo / Guarulhos", GYN:"Goiânia", IGU:"Foz do Iguaçu", IMP:"Imperatriz", IOS:"Ilhéus", ITB:"Itaituba",
  IZA:"Juiz de Fora / Zona da Mata", JDO:"Juazeiro do Norte", JJD:"Jericoacoara / Cruz", JJG:"Jaguaruna", JOI:"Joinville", JPA:"João Pessoa",
  JPR:"Ji-Paraná", JTC:"Bauru / Arealva", LBR:"Lábrea", LDB:"Londrina", LEC:"Lençóis", MAB:"Marabá", MAO:"Manaus",
  MBZ:"Maués", MCP:"Macapá", MCZ:"Maceió", MGF:"Maringá", MII:"Marília", MNX:"Manicoré", MOC:"Montes Claros",
  MXQ:"Morro de São Paulo", NAT:"Natal", NVT:"Navegantes", OAL:"Cacoal", OPS:"Sinop", PFB:"Passo Fundo", PIN:"Parintins",
  PMG:"Ponta Porã", PMW:"Palmas", PNZ:"Petrolina", POA:"Porto Alegre", POJ:"Patos de Minas", PPB:"Presidente Prudente",
  PTO:"Pato Branco", PVH:"Porto Velho", RAO:"Ribeirão Preto", RBB:"Borba", RBR:"Rio Branco", REC:"Recife", RIA:"Santa Maria",
  ROO:"Rondonópolis", SDU:"Rio de Janeiro / Santos Dumont", SET:"Serra Talhada", SJK:"São José dos Campos", SJL:"São Gabriel da Cachoeira",
  SJP:"São José do Rio Preto", SLZ:"São Luís", SMT:"Sorriso", SSA:"Salvador", STM:"Santarém", TBT:"Tabatinga", TFF:"Tefé",
  THE:"Teresina", UBA:"Uberaba", UDI:"Uberlândia", UMU:"Umuarama", UNA:"Una / Comandatuba", URG:"Uruguaiana",
  VCP:"Campinas / Viracopos", VDC:"Vitória da Conquista", VIX:"Vitória", XAP:"Chapecó", AAX:"Araxá", GVR:"Governador Valadares",
  MEU:"Monte Dourado", PET:"Pelotas", BPS:"Porto Seguro", GEL:"Santo Ângelo", FEN:"Fernando de Noronha", IPN:"Ipatinga",
  PHB:"Parnaíba", CPV:"Campina Grande", RRJ:"Rio de Janeiro / Jacarepaguá", VAG:"Varginha"
};

function getCidadeAeroporto(codigo){
  return aeroportosBR[String(codigo||"").trim().toUpperCase()] || "";
}

function garantirDatalistAeroportos(){
  if(document.getElementById("listaAeroportosBR")) return;
  const dl = document.createElement("datalist");
  dl.id = "listaAeroportosBR";
  dl.innerHTML = Object.entries(aeroportosBR)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([codigo,cidade]) => `<option value="${codigo}" label="${codigo} - ${cidade}"></option>`)
    .join("");
  document.body.appendChild(dl);
}

function handleIataInput(inputId, cidadeId){
  const input = $(inputId);
  if(!input) return;
  input.value = String(input.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0,3);
  const cidade = getCidadeAeroporto(input.value);
  if(cidade && cidadeId && $(cidadeId)) $(cidadeId).value = cidade;
  atualizarPreview();
}


function $(id){ return document.getElementById(id); }

function log(msg, tipo="info"){
  const cores = { erro:"#fecaca", ok:"#bbf7d0", info:"#dbeafe" };
  $("logBox").insertAdjacentHTML("afterbegin", `<div style="color:${cores[tipo]};border-bottom:1px solid #253044;padding:3px 0;">[${new Date().toLocaleTimeString("pt-BR")}] ${msg}</div>`);
}

function alertHtml(tipo, texto){ return `<div class="alert alert-${tipo}">${texto}</div>`; }

async function api(path, options={}){
  const res = await fetch(path, { ...options, headers: { "Content-Type":"application/json", ...(options.headers || {}) } });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok || data.ok === false) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

function money(v, m="BRL"){ 
  let n = Number(String(v||"0").replace(",","."));
  return isNaN(n) ? `${m} ${v||""}` : n.toLocaleString("pt-BR", { style:"currency", currency:m });
}

function hora(iso){ return iso?.split("T")?.[1]?.slice(0,5) || ""; }
function hojeMaisDias(d){ let d2=new Date(); d2.setDate(d2.getDate()+d); return d2.toISOString().slice(0,10); }

function getCompanhiaImg(comp){
  let c=(comp||"").toLowerCase().trim();
  if(c.includes("qatar") || c === "qr") return "qatar.png";
  if(c.includes("latam") || c === "la" || c === "jj") return "latam.png";
  if(c.includes("gol") || c === "g3") return "gol2.png";
  if(c.includes("azul") || c === "ad") return "azul.png";
  return "";
}
function mapCarrier(c){
  let map={LA:"LATAM",JJ:"LATAM",G3:"GOL",AD:"Azul",QR:"Qatar Airways"};
  return map[(c||"").toUpperCase()]||c||"";
}
function formatarDataCurta(d){ if(!d) return ""; let dt=new Date(d); if(isNaN(dt)) return ""; let dias=["DOM","SEG","TER","QUA","QUI","SEX","SAB"], meses=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"]; return `${dias[dt.getDay()]} ${dt.getDate()} ${meses[dt.getMonth()]}`; }
function formatarDuracao(h,m){ let r=""; if(h>0) r+=h+"h"; if(m>0) r+=(r?" ":"")+m+"min"; return r||"0h"; }

// ==================== RENDERIZAR FORMULÁRIO DE VOO ====================
function renderizarFormVoo(p){
  return `<div class="row-2"><div class="form-group"><label>Data</label><input type="date" id="data_${p}" onchange="atualizarPreview()"></div><div class="form-group"><label>Companhia</label><select id="companhia_${p}" onchange="atualizarPreview()"><option value="">Selecione</option><option value="LATAM">LATAM</option><option value="GOL">GOL</option><option value="Azul">Azul</option><option value="Qatar Airways">Qatar Airways</option></select></div></div>
    <div class="row-2"><div class="form-group"><label>Origem</label><input type="text" id="origem_${p}" placeholder="FOR" maxlength="3" list="listaAeroportosBR" oninput="handleIataInput('origem_${p}','cidadeOrigem_${p}')"></div><div class="form-group"><label>Cidade Origem</label><input type="text" id="cidadeOrigem_${p}" onchange="atualizarPreview()"></div></div>
    <div class="row-2"><div class="form-group"><label>Destino</label><input type="text" id="destino_${p}" placeholder="GRU" maxlength="3" list="listaAeroportosBR" oninput="handleIataInput('destino_${p}','cidadeDestino_${p}')"></div><div class="form-group"><label>Cidade Destino</label><input type="text" id="cidadeDestino_${p}" onchange="atualizarPreview()"></div></div>
    <div class="row-3"><div class="form-group"><label>Partida</label><input type="time" id="horaPartida_${p}" onchange="atualizarPreview()"></div><div class="form-group"><label>Chegada</label><input type="time" id="horaChegada_${p}" onchange="atualizarPreview()"></div><div class="form-group"><label>+ dias</label><select id="diaSeguinte_${p}" onchange="atualizarPreview()"><option value="0">Não</option><option value="1">+1</option><option value="2">+2</option></select></div></div>
    <div class="row-3"><div class="form-group"><label>Tipo de Voo</label><select id="tipoVoo_${p}" onchange="atualizarCamposParadas('${p}'); atualizarPreview()"><option value="Direto">Direto</option><option value="1 parada">1 parada</option><option value="2 paradas">2 paradas</option><option value="3 paradas">3 paradas</option><option value="4 paradas">4 paradas</option></select></div><div class="form-group"><label>Classe</label><select id="classe_${p}" onchange="atualizarPreview()"><option value="Econômica">Econômica</option><option value="Econômica Premium">Econômica Premium</option><option value="Classe Executiva">Classe Executiva</option><option value="Primeira Classe">Primeira Classe</option></select></div><div class="form-group"><label>Duração Total</label><div class="row-2"><input type="number" id="duracaoHoras_${p}" placeholder="h" min="0" onchange="atualizarPreview()"><input type="number" id="duracaoMin_${p}" placeholder="min" min="0" onchange="atualizarPreview()"></div></div></div>
    <div class="form-group"><label>Paradas / tempo de espera (máx. 4)</label><div class="paradas-form-grid">
      <div class="parada-form-card hidden" id="paradaCard1_${p}"><strong>Parada 1</strong><input type="text" id="parada1_${p}" maxlength="3" list="listaAeroportosBR" placeholder="BSB" oninput="handleIataInput('parada1_${p}')"><div class="row-2"><input type="number" id="parada1h_${p}" placeholder="h" min="0" onchange="atualizarPreview()"><input type="number" id="parada1m_${p}" placeholder="min" min="0" onchange="atualizarPreview()"></div></div>
      <div class="parada-form-card hidden" id="paradaCard2_${p}"><strong>Parada 2</strong><input type="text" id="parada2_${p}" maxlength="3" list="listaAeroportosBR" placeholder="GRU" oninput="handleIataInput('parada2_${p}')"><div class="row-2"><input type="number" id="parada2h_${p}" placeholder="h" min="0" onchange="atualizarPreview()"><input type="number" id="parada2m_${p}" placeholder="min" min="0" onchange="atualizarPreview()"></div></div>
      <div class="parada-form-card hidden" id="paradaCard3_${p}"><strong>Parada 3</strong><input type="text" id="parada3_${p}" maxlength="3" list="listaAeroportosBR" placeholder="STM" oninput="handleIataInput('parada3_${p}')"><div class="row-2"><input type="number" id="parada3h_${p}" placeholder="h" min="0" onchange="atualizarPreview()"><input type="number" id="parada3m_${p}" placeholder="min" min="0" onchange="atualizarPreview()"></div></div>
      <div class="parada-form-card hidden" id="paradaCard4_${p}"><strong>Parada 4</strong><input type="text" id="parada4_${p}" maxlength="3" list="listaAeroportosBR" placeholder="FOR" oninput="handleIataInput('parada4_${p}')"><div class="row-2"><input type="number" id="parada4h_${p}" placeholder="h" min="0" onchange="atualizarPreview()"><input type="number" id="parada4m_${p}" placeholder="min" min="0" onchange="atualizarPreview()"></div></div>
    </div></div>
    <div class="form-group">
      <label class="bagagens-form-title">Bagagens (por adulto)</label>
      <div class="bagagens-form-grid">
        <div class="bagagem-form-card"><img src="bolsa ou mochila de mao.png" onerror="this.style.display='none'"><div class="bagagem-form-texto"><strong>Bolsa ou mochila de mão</strong><span>10kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagItem_${p}',-1,1)">−</button><input type="number" id="bagItem_${p}" value="1" min="1" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagItem_${p}',1,1)">+</button></div><small class="bagagem-status incluso">Incluso</small></div>
        <div class="bagagem-form-card"><img src="mala pequena.png" onerror="this.style.display='none'"><div class="bagagem-form-texto"><strong>Mala pequena</strong><span>12kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagMao_${p}',-1,1)">−</button><input type="number" id="bagMao_${p}" value="1" min="1" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagMao_${p}',1,1)">+</button></div><small class="bagagem-status incluso">Incluso</small></div>
        <div class="bagagem-form-card"><img src="bagagem23kg nao adicionada.png" onerror="this.style.display='none'"><div class="bagagem-form-texto"><strong>Bagagem despachada</strong><span>23kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagDesp_${p}',-1,0)">−</button><input type="number" id="bagDesp_${p}" value="0" min="0" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagDesp_${p}',1,0)">+</button></div><small class="bagagem-status opcional">Opcional</small></div>
      </div>
    </div>`;
}
// ==================== RENDERIZAR TRECHO MULTI ====================
function renderizarTrechoForm(trecho){
  let id = trecho.id;
  return `<div class="trecho-card" data-id="${id}">
    <div class="trecho-header">
      <div class="trecho-nome-wrap">
        <label>Nome do trecho</label>
        <input type="text" class="trecho-nome-input" id="nomeTrecho_${id}" value="${trecho.nome}" oninput="renomearTrecho(${id}, this.value)" placeholder="Trecho ${id}">
      </div>
      ${id > 2 ? `<button class="btn-remove-trecho" onclick="removerTrecho(${id})">Remover</button>` : '<span style="font-size:10px;color:#6c757d;">Padrão</span>'}
    </div>
    ${renderizarFormVoo(`t${id}`)}
  </div>`;
}

function renomearTrecho(id, nome){
  let trecho = trechosMult.find(t => t.id === id);
  if(!trecho) return;
  trecho.nome = String(nome || "").trim() || `Trecho ${id}`;
  atualizarPreview();
}

function renderizarTodosTrechos(){
  let container = $("trechosContainer");
  if(!container) return;
  container.innerHTML = '';
  trechosMult.forEach(t => {
    container.insertAdjacentHTML('beforeend', renderizarTrechoForm(t));
  });
  atualizarTodosCamposParadas();
}

function adicionarTrecho(){
  trechoCount++;
  trechosMult.push({ id: trechoCount, nome: `Trecho ${trechoCount}` });
  renderizarTodosTrechos();
  atualizarPreview();
}

function removerTrecho(id){
  if(id === 1 || id === 2){
    alert("Os trechos 1 e 2 são obrigatórios!");
    return;
  }
  trechosMult = trechosMult.filter(t => t.id !== id);
  renderizarTodosTrechos();
  atualizarPreview();
}

// ==================== CONTROLE DE VISIBILIDADE DAS SEÇÕES ====================
function atualizarVisibilidadeSecoes(){
  let tipo = $("tipoViagem").value;
  let secaoVolta = $("secaoVolta");
  let secaoVooInterno = $("secaoVooInterno");
  let secaoMultitrecho = $("secaoMultitrecho");
  
  if(tipo === "ida"){
    secaoVolta.classList.add("hidden");
    secaoVooInterno.classList.add("hidden");
    secaoMultitrecho.classList.add("hidden");
  } else if(tipo === "idaVolta"){
    secaoVolta.classList.remove("hidden");
    secaoVooInterno.classList.remove("hidden");
    secaoMultitrecho.classList.add("hidden");
  } else if(tipo === "multitrecho"){
    secaoVolta.classList.add("hidden");
    secaoVooInterno.classList.add("hidden");
    secaoMultitrecho.classList.remove("hidden");
  }
}

function toggleVooInterno(){
  let incluir = $("incluirVooInterno").checked;
  let container = $("vooInternoContainer");
  if(container){
    container.style.display = incluir ? 'block' : 'none';
    if(incluir && container.innerHTML === ''){
      container.innerHTML = renderizarFormVoo('interno');
    }
  }
  atualizarPreview();
}

function mudarCor(cor){
  if(!cor) return;
  corAtual = cor;
  document.documentElement.style.setProperty("--theme", cor);
  document.querySelectorAll(".color-option").forEach(el => el.classList.toggle("selected", el.style.background === cor));
  if($("corPersonalizada")) $("corPersonalizada").value = cor;
  if($("corHex")) $("corHex").value = cor;
  atualizarPreview();
}
function syncPaxManual(){ $("adultos").value=$("adultosManual").value; $("criancas").value=$("criancasManual").value; $("bebes").value=$("bebesManual").value; }
function syncPaxBusca(){ $("adultosManual").value=$("adultos").value; $("criancasManual").value=$("criancas").value; $("bebesManual").value=$("bebes").value; }

// ==================== AMADEUS ====================
async function testarAmadeus(){
  $("amadeusStatus").innerHTML=alertHtml("info","Testando...");
  try{ let data=await api("/api/health"); $("amadeusStatus").innerHTML=alertHtml("success",`Conectado. Ambiente: ${data.environment}`); log("Amadeus conectado","ok"); }
  catch(e){ $("amadeusStatus").innerHTML=alertHtml("error",e.message); log(e.message,"erro"); }
}

async function buscarVoosAmadeus(){
  syncPaxBusca();
  let o=$("buscaOrigem").value.trim().toUpperCase(), d=$("buscaDestino").value.trim().toUpperCase(), di=$("buscaDataIda").value, dv=$("buscaDataVolta").value;
  if(!o||!d||!di){ $("resultadoAmadeus").innerHTML=alertHtml("warning","Preencha origem, destino e data de ida"); return; }
  $("resultadoAmadeus").innerHTML=alertHtml("info","Buscando voos...");
  try{
    let params=new URLSearchParams({origem:o, destino:d, dataIda:di, adultos:$("adultos").value, criancas:$("criancas").value, bebes:$("bebes").value, moeda:"BRL", max:"5"});
    if(dv) params.set("dataVolta",dv);
    let resp=await api(`/api/flights/search?${params.toString()}`);
    ofertasRaw=resp.raw?.data||[];
    let offers=resp.offers||[];
    if(!offers.length){ $("resultadoAmadeus").innerHTML=alertHtml("warning","Nenhum voo encontrado"); return; }
    let html=alertHtml("success",`${offers.length} opção(ões) encontrada(s). Clique em uma para preencher o PDF.`);
    offers.forEach((off,i)=>{ 
      let seg=off.itineraries?.[0]?.segments?.[0]; 
      let last=off.itineraries?.[off.itineraries.length-1]?.segments?.slice(-1)[0]||seg; 
      let stops=(off.itineraries?.[0]?.segments?.length||1)-1;
      html+=`<div class="amadeus-offer" onclick="selecionarOfertaAmadeus(${i})"><div class="offer-top"><span>${seg?.departure?.iataCode||"?"} → ${last?.arrival?.iataCode||"?"}</span><span style="color:#008080;">${money(off.price?.total)}</span></div><div class="offer-meta"><div>✈️ ${mapCarrier(off.validatingAirlineCodes?.[0]||seg?.carrierCode)}</div><div>🕐 ${hora(seg?.departure?.at)} → ${hora(last?.arrival?.at)}</div><div>⏱️ ${(off.itineraries?.[0]?.duration||"").replace("PT","").replace("H","h ").replace("M","min")}</div><div>🛑 ${stops===0?"Direto":stops+" parada(s)"}</div></div></div>`; 
    });
    $("resultadoAmadeus").innerHTML=html;
    log(`Busca concluída: ${offers.length} opções`,"ok");
  }catch(e){ $("resultadoAmadeus").innerHTML=alertHtml("error",e.message); log(e.message,"erro"); }
}

function selecionarOfertaAmadeus(idx){
  ofertaSelecionadaRaw=ofertasRaw[idx];
  document.querySelectorAll(".amadeus-offer").forEach(el=>el.classList.remove("selected"));
  $(`offer_${idx}`)?.classList.add("selected");
  preencherCamposComOferta(ofertaSelecionadaRaw);
  atualizarPreview();
}

function preencherCamposComOferta(offer){
  if(!offer) return;
  let its=offer.itineraries||[];
  if(its[1]) $("tipoViagem").value="idaVolta";
  else $("tipoViagem").value="ida";
  atualizarVisibilidadeSecoes();
  preencherTrecho("ida",its[0],offer);
  if(its[1]) preencherTrecho("volta",its[1],offer);
  $("valorOriginal").value=money(offer.price?.total);
  $("valorPromocional").value=money(offer.price?.total);
}

function preencherTrecho(p,it,offer){
  if(!it) return;
  let segs=it.segments||[], first=segs[0], last=segs.slice(-1)[0];
  $(`data_${p}`).value=first?.departure?.at?.slice(0,10)||"";
  $(`companhia_${p}`).value=mapCarrier(offer.validatingAirlineCodes?.[0]||first?.carrierCode);
  $(`origem_${p}`).value=first?.departure?.iataCode||"";
  $(`cidadeOrigem_${p}`).value=getCidadeAeroporto(first?.departure?.iataCode)||first?.departure?.iataCode||"";
  $(`destino_${p}`).value=last?.arrival?.iataCode||"";
  $(`cidadeDestino_${p}`).value=getCidadeAeroporto(last?.arrival?.iataCode)||last?.arrival?.iataCode||"";
  $(`horaPartida_${p}`).value=hora(first?.departure?.at);
  $(`horaChegada_${p}`).value=hora(last?.arrival?.at);
  $(`diaSeguinte_${p}`).value="0";
  let stops=Math.max(0,segs.length-1);
  $(`tipoVoo_${p}`).value=stops===0?"Direto":"1 parada";
  let match=(it.duration||"").match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  $(`duracaoHoras_${p}`).value=match?.[1]||"0";
  $(`duracaoMin_${p}`).value=match?.[2]||"0";
}

async function confirmarPrecoAmadeus(){
  if(!ofertaSelecionadaRaw){ $("resultadoReserva").innerHTML=alertHtml("warning","Selecione uma oferta primeiro"); return; }
  $("resultadoReserva").innerHTML=alertHtml("info","Confirmando preço...");
  try{ let resp=await api("/api/flights/price",{method:"POST",body:JSON.stringify({flightOffer:ofertaSelecionadaRaw})}); ofertaSelecionadaRaw=resp.pricedOffer||ofertaSelecionadaRaw; preencherCamposComOferta(ofertaSelecionadaRaw); atualizarPreview(); $("resultadoReserva").innerHTML=alertHtml("success","Preço confirmado"); }catch(e){ $("resultadoReserva").innerHTML=alertHtml("error",e.message); }
}

async function criarReservaAmadeus(){
  if(!ofertaSelecionadaRaw){ $("resultadoReserva").innerHTML=alertHtml("warning","Selecione uma oferta primeiro"); return; }
  $("resultadoReserva").innerHTML=alertHtml("info","Criando reserva...");
  try{ let pass={firstName:$("passNome").value,lastName:$("passSobrenome").value,dateOfBirth:$("passNascimento").value,gender:$("passGenero").value,email:$("passEmail").value,phone:$("passTelefone").value}; let resp=await api("/api/bookings/create",{method:"POST",body:JSON.stringify({flightOffer:ofertaSelecionadaRaw,passenger:pass})}); $("orderIdConsulta").value=resp.orderId||""; $("resultadoReserva").innerHTML=alertHtml("success",`Reserva criada.<br>Order ID: ${resp.orderId}`); }catch(e){ $("resultadoReserva").innerHTML=alertHtml("error",e.message); }
}

async function consultarReservaAmadeus(){ let id=$("orderIdConsulta").value.trim(); if(!id){ $("resultadoReserva").innerHTML=alertHtml("warning","Informe o Order ID"); return; } try{ let resp=await api(`/api/bookings/${encodeURIComponent(id)}`); let order=resp.raw?.data; if(order?.flightOffers?.[0]){ ofertaSelecionadaRaw=order.flightOffers[0]; preencherCamposComOferta(ofertaSelecionadaRaw); } atualizarPreview(); $("resultadoReserva").innerHTML=alertHtml("success","Reserva consultada"); }catch(e){ $("resultadoReserva").innerHTML=alertHtml("error",e.message); } }

async function cancelarReservaAmadeus(){ let id=$("orderIdConsulta").value.trim(); if(!id||!confirm(`Cancelar a reserva ${id}?`)) return; try{ await api(`/api/bookings/${encodeURIComponent(id)}`,{method:"DELETE"}); $("resultadoReserva").innerHTML=alertHtml("success","Reserva cancelada"); }catch(e){ $("resultadoReserva").innerHTML=alertHtml("error",e.message); } }

// ==================== BAGAGENS E PARADAS ====================
function normalizarBagagens(prefixo){
  let itemEl=$(`bagItem_${prefixo}`), maoEl=$(`bagMao_${prefixo}`), despEl=$(`bagDesp_${prefixo}`);
  if(itemEl && (parseInt(itemEl.value) < 1)) itemEl.value = 1;
  if(maoEl && (parseInt(maoEl.value) < 1)) maoEl.value = 1;
  if(despEl && (parseInt(despEl.value) < 0)) despEl.value = 0;
  atualizarPreview();
}

function alterarBagagemQtd(id, delta, minimo){
  let el = $(id);
  if(!el) return;
  let valor = parseInt(el.value || minimo) + delta;
  if(valor < minimo) valor = minimo;
  el.value = valor;
  atualizarPreview();
}

function getNumeroParadas(prefixo){
  let tipo = String($(`tipoVoo_${prefixo}`)?.value || "Direto");
  let match = tipo.match(/(\d+)/);
  return Math.min(4, Math.max(0, match ? parseInt(match[1]) : 0));
}

function atualizarCamposParadas(prefixo){
  let qtd = getNumeroParadas(prefixo);
  for(let i=1; i<=4; i++){
    let card = $(`paradaCard${i}_${prefixo}`);
    if(card) card.classList.toggle("hidden", i > qtd);
  }
}

function atualizarTodosCamposParadas(){
  ["ida", "volta", "interno", ...trechosMult.map(t => `t${t.id}`)].forEach(atualizarCamposParadas);
}

function obterParadas(prefixo){
  let qtd = getNumeroParadas(prefixo);
  let paradas = [];
  for(let i=1; i<=qtd; i++){
    let codigo = String($(`parada${i}_${prefixo}`)?.value || "").trim().toUpperCase();
    if(!codigo) continue;
    let h = parseInt($(`parada${i}h_${prefixo}`)?.value || 0);
    let m = parseInt($(`parada${i}m_${prefixo}`)?.value || 0);
    if(isNaN(h) || h < 0) h = 0;
    if(isNaN(m) || m < 0) m = 0;
    paradas.push({ codigo, espera: `${h}h${m}min de espera` });
  }
  return paradas;
}

function gerarSetaParadasHTML(prefixo, tipoVoo){
  let paradas = obterParadas(prefixo);
  if(!paradas.length && tipoVoo === "Direto") return `<div class="flight-arrow">→</div><div class="flight-connection-type">Direto</div>`;
  if(!paradas.length) return `<div class="flight-arrow">→</div><div class="flight-connection-type">${tipoVoo}</div>`;
  return `<div class="stop-chain"><span class="stop-arrow">→</span>${paradas.map(p=>`<span class="stop-code">${p.codigo}</span><span class="stop-arrow">→</span>`).join("")}</div><div class="flight-connection-type">${tipoVoo}</div>`;
}

function gerarInfoParadasHTML(prefixo){
  let paradas = obterParadas(prefixo);
  if(!paradas.length) return "";
  return `<div class="paradas-info"><div class="paradas-info-title">Informações das paradas</div><div class="paradas-grid-pdf">${paradas.map((p,i)=>`<div class="parada-linha"><div><span class="parada-codigo">${p.codigo}</span> · Parada ${i+1}</div><div class="parada-espera">${p.espera || "0h0min de espera"}</div></div>`).join("")}</div></div>`;
}

function gerarBagagensHTML(prefixo, titulo){
  let item = parseInt($(`bagItem_${prefixo}`)?.value || 1);
  let mao = parseInt($(`bagMao_${prefixo}`)?.value || 1);
  let desp = parseInt($(`bagDesp_${prefixo}`)?.value || 0);
  return `<div class="bagagens-pdf"><div class="bagagens-header">Bagagens</div><div class="bagagens-subtitle">${titulo}</div><div class="bagagens-grid-pdf"><div class="bagagem-card-pdf bagagem-card-premium"><img src="bolsa ou mochila de mao.png"><div><div class="bag-title">Bolsa de mão</div><div class="bag-sub">10kg</div></div><div class="bag-qtd">${item}</div></div><div class="bagagem-card-pdf bagagem-card-premium"><img src="mala pequena.png"><div><div class="bag-title">Mala pequena</div><div class="bag-sub">12kg</div></div><div class="bag-qtd">${mao}</div></div><div class="bagagem-card-pdf bagagem-card-premium"><img src="${desp>0?'bagagem23kg adionada.png':'bagagem23kg nao adionada.png'}"><div><div class="bag-title">Bagagem despachada</div><div class="bag-sub">23kg</div></div><div class="bag-qtd">${desp}</div></div></div></div>`;
}

// ==================== CARD DE VOO ====================
function gerarCardVoo(titulo, prefixo){
  let origem = $(`origem_${prefixo}`)?.value || "";
  let cidadeOrigem = $(`cidadeOrigem_${prefixo}`)?.value || "";
  let destino = $(`destino_${prefixo}`)?.value || "";
  let cidadeDestino = $(`cidadeDestino_${prefixo}`)?.value || "";
  let data = $(`data_${prefixo}`)?.value || "";
  let horaPartida = $(`horaPartida_${prefixo}`)?.value || "";
  let horaChegada = $(`horaChegada_${prefixo}`)?.value || "";
  let diaSeg = parseInt($(`diaSeguinte_${prefixo}`)?.value || 0);
  let tipoVoo = $(`tipoVoo_${prefixo}`)?.value || "Direto";
  let duracaoH = parseInt($(`duracaoHoras_${prefixo}`)?.value || 0);
  let duracaoM = parseInt($(`duracaoMin_${prefixo}`)?.value || 0);
  let companhia = $(`companhia_${prefixo}`)?.value || "";
  let classe = $(`classe_${prefixo}`)?.value || "";
  let logo = getCompanhiaImg(companhia);
  let chegadaDisplay = diaSeg > 0 ? `${horaChegada} <span style="color:#e74c3c;">+${diaSeg}</span>` : horaChegada;
  
  if(!origem && !destino && !data){
    return `<div class="flight-card" style="opacity:.7;"><div class="flight-header"><span class="flight-type">${titulo}</span><span class="flight-date">—</span></div><div style="text-align:center;color:#6c757d;padding:15px;">✏️ Preencha os dados</div></div>`;
  }
  
  return `<div class="flight-card"><div class="flight-header"><span class="flight-type">${titulo}</span><span class="flight-date">${formatarDataCurta(data) || "—"}</span></div><div class="route-main"><div class="airport-origin"><div class="airport-code">${origem || "?"}</div><div class="airport-city">${cidadeOrigem || "—"}</div></div><div class="flight-connection">${gerarSetaParadasHTML(prefixo, tipoVoo)}</div><div class="airport-destination"><div class="airport-code">${destino || "?"}</div><div class="airport-city">${cidadeDestino || "—"}</div></div></div><div class="schedule-row"><div class="time-point"><div class="time-value">${horaPartida || "—"}</div><div class="time-label">Partida</div></div><div class="duration-middle"><div class="duration-value">${formatarDuracao(duracaoH, duracaoM)}</div><div class="duration-label">Duração</div></div><div class="time-point"><div class="time-value">${chegadaDisplay || "—"}</div><div class="time-label">Chegada</div></div></div><div class="flight-footer"><div class="airline-info">${logo ? `<img class="airline-logo-small" src="${logo}">` : ""}<span>${companhia || "Companhia"}</span></div>${classe ? `<div class="classe-info">${classe}</div>` : ""}</div>${gerarInfoParadasHTML(prefixo)}${gerarBagagensHTML(prefixo, titulo)}</div>`;
}

function gerarCardTrecho(trecho){
  let id = trecho.id;
  return gerarCardVoo(trecho.nome, `t${id}`);
}

// ==================== PREVIEW ====================
function gerarHTMLPreview(){
  let cliente = $("cliente").value;
  let cotacao = $("cotacao").value;
  let tipo = $("tipoViagem").value;
  let adultos = parseInt($("adultosManual").value) || 0;
  let criancas = parseInt($("criancasManual").value) || 0;
  let bebes = parseInt($("bebesManual").value) || 0;
  let valorOrig = $("valorOriginal").value;
  let valorPromo = $("valorPromocional").value;
  let observacoes = $("observacoes").value;
  let incluirVooInterno = $("incluirVooInterno")?.checked || false;
  
  let textoPessoas = "";
  if(adultos > 0) textoPessoas += adultos + (adultos === 1 ? " adulto" : " adultos");
  if(criancas > 0) textoPessoas += (textoPessoas ? " + " : "") + criancas + (criancas === 1 ? " criança" : " crianças");
  if(bebes > 0) textoPessoas += (textoPessoas ? " + " : "") + bebes + (bebes === 1 ? " bebê" : " bebês");
  
  let voos = "";
  if(tipo === "ida"){
    voos = gerarCardVoo("Ida", "ida");
  } else if(tipo === "idaVolta"){
    voos = gerarCardVoo("Ida", "ida");
    if(incluirVooInterno) voos += gerarCardVoo("Voo Interno", "interno");
    voos += gerarCardVoo("Volta", "volta");
  } else if(tipo === "multitrecho"){
    trechosMult.forEach(t => { voos += gerarCardTrecho(t); });
  }
  
  let fotoHtml = clubeFotoBase64 ? `<div style="text-align:center;"><img src="${clubeFotoBase64}" style="width:60px;height:60px;border-radius:50%;margin-bottom:8px;"></div>` : "";
  let nomeGrupoHtml = nomeGrupoAtual ? `<div style="text-align:center;font-size:14px;font-weight:bold;color:${corAtual};margin-bottom:10px;">${nomeGrupoAtual}</div>` : "";
  let observacoesHtml = observacoes ? `<div style="font-size:10px;margin-top:12px;padding:10px;background:#f8f9fa;border-radius:8px;"><strong>📝 Observações:</strong><br>${observacoes}</div>` : "";
  
  let totalVoos = tipo === "multitrecho" ? trechosMult.length : (tipo === "idaVolta" ? (incluirVooInterno ? 3 : 2) : 1);
  let classePdf = totalVoos >= 3 ? "pdf-3" : (totalVoos === 2 ? "pdf-2" : "pdf-1");
  let clienteHtml = cliente && cliente.trim() ? `<div style="font-size:11px;color:#6c757d;">Cliente: ${cliente}</div>` : "";
  let deHtml = valorOrig && valorOrig.trim() ? `<div class="price-original">De: ${valorOrig}</div>` : "";
  return `<div class="pdf-preview ${classePdf}"><div style="text-align:center;"><img src="isis.png" style="max-width:80px;margin-bottom:8px;"><div style="font-size:18px;font-weight:700;">${cotacao}</div>${clienteHtml}${fotoHtml}${nomeGrupoHtml}</div>${voos}<div class="benefits-row"><div class="benefit-item">✅ Taxas inclusas</div><div class="benefit-item">✅ Suporte 24h</div><div class="benefit-item">✅ ISI Viagens</div></div><div class="passengers-info">✈️ Valor referente a <strong>${textoPessoas || "1 adulto"}</strong></div><div class="price-container"><div><div style="font-size:9px;">Valor para ${textoPessoas || "1 adulto"}</div>${deHtml}</div><div><div style="font-size:9px;">Promocional:</div><div class="price-promotional">${valorPromo}</div></div></div>${observacoesHtml}<div class="warning-box"><span>⚠️ Os valores podem sofrer alterações sem aviso prévio.</span></div><div class="footer-note">📄 Gerado pela ISI Viagens.</div></div>`;
}

function atualizarPreview(){
  $("previewContainer").innerHTML = gerarHTMLPreview();
}

function gerarPDF(){
  atualizarPreview();
  window.print();
}

// ==================== SALVAR E HISTÓRICO ====================
function salvarCotacao(){
  let c = { id: Date.now(), data: new Date().toLocaleDateString("pt-BR"), cliente: $("cliente").value, cotacao: $("cotacao").value, tipoViagem: $("tipoViagem").value, valorOriginal: $("valorOriginal").value, valorPromocional: $("valorPromocional").value, nomeGrupo: $("nomeGrupo").value, html: gerarHTMLPreview() };
  cotacoesSalvas.unshift(c);
  localStorage.setItem("cotacoes_isi", JSON.stringify(cotacoesSalvas));
  atualizarListaHistorico();
  alert("✅ Cotação salva!");
}

function atualizarListaHistorico(){
  let tbody = $("listaCotacoes");
  let termo = ($("searchHistorico")?.value || "").toLowerCase();
  let filtradas = cotacoesSalvas.filter(c => (c.cliente || "").toLowerCase().includes(termo) || (c.cotacao || "").toLowerCase().includes(termo));
  if(!filtradas.length){ tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">📭 Nenhuma cotação</td></tr>`; return; }
  tbody.innerHTML = filtradas.map(c => `<tr><td><input type="checkbox" class="select-item" data-id="${c.id}"></td><td>${c.data}</td><td><strong>${c.cliente}</strong></td><td>${c.nomeGrupo||"—"}</td><td><span class="status-badge status-ida-volta">${c.tipoViagem==="idaVolta"?"Ida e Volta":"Ida"}</span></td><td><strong>${c.valorPromocional}</strong></td><td><button class="btn-generate" onclick="abrirCotacaoSalva(${c.id})">📋 Ver</button></td></tr>`).join("");
}

function abrirCotacaoSalva(id){
  let c = cotacoesSalvas.find(x => x.id === id);
  if(!c) return;
  let win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cotação</title><style>${document.querySelector('style').innerHTML}</style></head><body>${c.html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

function selecionarTodosHistorico(){ document.querySelectorAll(".select-item").forEach(el=>el.checked=$("selecionarTodos").checked); }
function excluirSelecionados(){ let ids=[...document.querySelectorAll(".select-item:checked")].map(el=>Number(el.dataset.id)); if(!ids.length) return; if(!confirm(`Excluir ${ids.length}?`)) return; cotacoesSalvas=cotacoesSalvas.filter(c=>!ids.includes(c.id)); localStorage.setItem("cotacoes_isi",JSON.stringify(cotacoesSalvas)); atualizarListaHistorico(); }
function exportarHistorico(){ if(!cotacoesSalvas.length) return; let csv="Data,Cliente,Cotação,Tipo,Grupo,Valor Original,Valor Promocional\n"; cotacoesSalvas.forEach(c=>{ csv+=`"${c.data}","${c.cliente}","${c.cotacao}","${c.tipoViagem}","${c.nomeGrupo}","${c.valorOriginal}","${c.valorPromocional}"\n`; }); let blob=new Blob(["\uFEFF"+csv],{type:"text/csv"}); let a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="cotacoes_isi.csv"; a.click(); URL.revokeObjectURL(a.href); }

function mudarAba(aba){
  $("abaCotador").classList.toggle("active", aba === "cotador");
  $("abaHistorico").classList.toggle("active", aba === "historico");
  document.querySelectorAll(".tab-btn")[0].classList.toggle("active", aba === "cotador");
  document.querySelectorAll(".tab-btn")[1].classList.toggle("active", aba === "historico");
  if(aba === "historico") atualizarListaHistorico();
  else atualizarPreview();
}

// ==================== EVENTOS E INICIALIZAÇÃO ====================
$("clubeFotoInput").addEventListener("change", function(e){
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = ev => { clubeFotoBase64 = ev.target.result; $("clubeFotoPreview").src = clubeFotoBase64; atualizarPreview(); };
  reader.readAsDataURL(file);
});

function removerFotoClube(){ clubeFotoBase64 = ""; $("clubeFotoPreview").src = ""; atualizarPreview(); }

$("nomeGrupo").addEventListener("input", e => { nomeGrupoAtual = e.target.value; atualizarPreview(); });
["cliente","cotacao","valorOriginal","valorPromocional","observacoes"].forEach(id => $(id).addEventListener("input", atualizarPreview));
$("tipoViagem").addEventListener("change", function(){
  atualizarVisibilidadeSecoes();
  atualizarPreview();
});

garantirDatalistAeroportos();
$("buscaDataIda").value = hojeMaisDias(30);
$("idaContainer").innerHTML = renderizarFormVoo("ida");
$("voltaContainer").innerHTML = renderizarFormVoo("volta");
$("vooInternoContainer").innerHTML = renderizarFormVoo("interno");
$("vooInternoContainer").style.display = "none";
renderizarTodosTrechos();

document.documentElement.style.setProperty("--theme", corAtual);
atualizarVisibilidadeSecoes();
atualizarTodosCamposParadas();
atualizarPreview();
atualizarListaHistorico();
testarAmadeus();
