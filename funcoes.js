// ==================== VARIÁVEIS GLOBAIS ====================
let corAtual = "#008080";
let clubeFotoBase64 = "";
let nomeGrupoAtual = "";
let cotacoesSalvas = JSON.parse(localStorage.getItem("cotacoes_isi")) || [];
let ofertasRaw = [];
let ofertaSelecionadaRaw = null;
let trechosMult = [{ id: 1, nome: "Trecho 1" }, { id: 2, nome: "Trecho 2" }];
let trechoCount = 2;


const STORAGE_KEYS = {
  usuarioAtual: "isi_usuario_atual_v1",
  perfilEmpresa: "isi_perfil_empresa_v1",
  contas: "isi_contas_usuarios_v1",
  sessaoAtiva: "isi_sessao_ativa_v1"
};

const PERFIL_EMPRESA_PADRAO = {
  nome: "ISI VIAGENS LTDA",
  slogan: "VOAR É ISI ✈️",
  whatsapp: "",
  email: "comercial@isiviagens.com",
  site: "",
  instagram: "",
  endereco: "",
  logo: "",
  cor: "#008080",
  preparadoParaLogin: true,
  storageAtual: "localStorage"
};

const USUARIO_LOCAL_PADRAO = {
  id: "local-admin",
  nome: "Administrador",
  email: "",
  whatsapp: "",
  cargo: "Administrador",
  foto: "",
  permissao: "admin",
  empresaId: "empresa-local",
  modo: "local"
};

let usuarioAtual = carregarUsuarioAtual();
let perfilEmpresa = carregarPerfilEmpresa();
let contaCadastroFotoBase64 = "";

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


// ==================== PERFIL DA EMPRESA / LOGIN FUTURO ====================
function clonar(obj){ return JSON.parse(JSON.stringify(obj)); }

function normalizarHex(cor, fallback="#008080"){
  let c = String(cor || "").trim();
  if(!c) return fallback;
  if(!c.startsWith("#")) c = "#" + c;
  return /^#[0-9A-Fa-f]{6}$/.test(c) ? c.toUpperCase() : fallback;
}

function carregarUsuarioAtual(){
  try{
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEYS.usuarioAtual) || "null");
    return { ...clonar(USUARIO_LOCAL_PADRAO), ...(salvo || {}) };
  }catch(e){
    return clonar(USUARIO_LOCAL_PADRAO);
  }
}

function salvarUsuarioAtual(){
  localStorage.setItem(STORAGE_KEYS.usuarioAtual, JSON.stringify(usuarioAtual));
}

function marcarSessaoAtiva(){
  localStorage.setItem(STORAGE_KEYS.sessaoAtiva, usuarioAtual.id || "local-admin");
}

function existeSessaoAtiva(){
  return !!localStorage.getItem(STORAGE_KEYS.sessaoAtiva);
}

function carregarContasLocais(){
  try{
    const contas = JSON.parse(localStorage.getItem(STORAGE_KEYS.contas) || "[]");
    return Array.isArray(contas) ? contas : [];
  }catch(e){
    return [];
  }
}

function salvarContasLocais(contas){
  localStorage.setItem(STORAGE_KEYS.contas, JSON.stringify(contas || []));
}

function carregarPerfilEmpresa(){
  try{
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEYS.perfilEmpresa) || "null");
    const perfil = { ...clonar(PERFIL_EMPRESA_PADRAO), ...(salvo || {}) };
    perfil.cor = normalizarHex(perfil.cor, PERFIL_EMPRESA_PADRAO.cor);
    return perfil;
  }catch(e){
    return clonar(PERFIL_EMPRESA_PADRAO);
  }
}

function persistirPerfilEmpresa(){
  perfilEmpresa.atualizadoEm = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.perfilEmpresa, JSON.stringify(perfilEmpresa));
}

function lerPerfilDoFormulario(){
  return {
    ...perfilEmpresa,
    nome: ($("perfilEmpresaNome")?.value || "").trim() || PERFIL_EMPRESA_PADRAO.nome,
    slogan: ($("perfilEmpresaSlogan")?.value || "").trim(),
    whatsapp: ($("perfilEmpresaWhatsapp")?.value || "").trim(),
    email: ($("perfilEmpresaEmail")?.value || "").trim(),
    site: ($("perfilEmpresaSite")?.value || "").trim(),
    instagram: ($("perfilEmpresaInstagram")?.value || "").trim(),
    endereco: ($("perfilEmpresaEndereco")?.value || "").trim(),
    cor: normalizarHex($("perfilEmpresaCorHex")?.value || $("perfilEmpresaCor")?.value || perfilEmpresa.cor)
  };
}

function preencherFormularioPerfilEmpresa(){
  if(!$("perfilEmpresaNome")) return;
  $("perfilEmpresaNome").value = perfilEmpresa.nome || "";
  $("perfilEmpresaSlogan").value = perfilEmpresa.slogan || "";
  $("perfilEmpresaWhatsapp").value = perfilEmpresa.whatsapp || "";
  $("perfilEmpresaEmail").value = perfilEmpresa.email || "";
  $("perfilEmpresaSite").value = perfilEmpresa.site || "";
  $("perfilEmpresaInstagram").value = perfilEmpresa.instagram || "";
  $("perfilEmpresaEndereco").value = perfilEmpresa.endereco || "";
  $("perfilEmpresaCor").value = normalizarHex(perfilEmpresa.cor);
  $("perfilEmpresaCorHex").value = normalizarHex(perfilEmpresa.cor);
  $("perfilLogoPreview").src = perfilEmpresa.logo || montarCaminhosImagem("isis.png")[0] || "";
  if($("usuarioLocalNome")) $("usuarioLocalNome").textContent = usuarioAtual.nome || "Administrador";
  atualizarPainelConta();
}

function perfilLogoAttrs(){
  if(perfilEmpresa.logo) return `src="${escapeAttr(perfilEmpresa.logo)}"`;
  return imgAttrs("isis.png");
}

function contatoEmpresaTexto(){
  const itens = [];
  if(perfilEmpresa.whatsapp) itens.push(`WhatsApp: ${perfilEmpresa.whatsapp}`);
  if(perfilEmpresa.email) itens.push(perfilEmpresa.email);
  if(perfilEmpresa.site) itens.push(perfilEmpresa.site);
  if(perfilEmpresa.instagram) itens.push(perfilEmpresa.instagram);
  return itens.join(" · ");
}

function atualizarPreviewPerfilEmpresa(){
  if(!$("perfilPreviewEmpresa")) return;
  const temp = lerPerfilDoFormulario();
  const logo = temp.logo || perfilEmpresa.logo || montarCaminhosImagem("isis.png")[0] || "";
  const contatos = [];
  if(temp.whatsapp) contatos.push(`📱 ${temp.whatsapp}`);
  if(temp.email) contatos.push(`📧 ${temp.email}`);
  if(temp.site) contatos.push(`🌐 ${temp.site}`);
  if(temp.instagram) contatos.push(`📸 ${temp.instagram}`);
  if(temp.endereco) contatos.push(`📍 ${temp.endereco}`);

  $("perfilPreviewEmpresa").style.setProperty("--theme", temp.cor || corAtual);
  $("perfilPreviewEmpresa").innerHTML = `
    <div class="perfil-preview-top">
      <img src="${escapeAttr(logo)}" alt="Logo">
      <div>
        <div class="perfil-preview-name">${temp.nome || PERFIL_EMPRESA_PADRAO.nome}</div>
        <div class="perfil-preview-slogan">${temp.slogan || "Identidade visual da empresa"}</div>
      </div>
    </div>
    <div class="perfil-preview-contato">
      ${contatos.length ? contatos.map(c => `<div>${c}</div>`).join("") : `<div>Os dados de contato aparecerão aqui quando preenchidos.</div>`}
    </div>
  `;
}

function mostrarStatusPerfil(tipo, texto){
  if(!$("perfilStatus")) return;
  $("perfilStatus").innerHTML = alertHtml(tipo, texto);
  setTimeout(()=>{ if($("perfilStatus")) $("perfilStatus").innerHTML = ""; }, 4000);
}

function sincronizarCorPerfil(cor){
  const hex = normalizarHex(cor, perfilEmpresa.cor || "#008080");
  if($("perfilEmpresaCor")) $("perfilEmpresaCor").value = hex;
  if($("perfilEmpresaCorHex")) $("perfilEmpresaCorHex").value = hex;
  document.documentElement.style.setProperty("--theme", hex);
  atualizarPreviewPerfilEmpresa();
}

function salvarPerfilEmpresa(){
  perfilEmpresa = lerPerfilDoFormulario();
  persistirPerfilEmpresa();
  mudarCor(perfilEmpresa.cor || "#008080");
  preencherFormularioPerfilEmpresa();
  atualizarPreviewPerfilEmpresa();
  atualizarPreview();
  mostrarStatusPerfil("success", "✅ Perfil salvo. A logo e os dados já serão usados no PDF.");
}

function restaurarPerfilPadrao(){
  if(!confirm("Restaurar o perfil padrão da ISI Viagens?")) return;
  perfilEmpresa = clonar(PERFIL_EMPRESA_PADRAO);
  persistirPerfilEmpresa();
  preencherFormularioPerfilEmpresa();
  mudarCor(perfilEmpresa.cor);
  atualizarPreviewPerfilEmpresa();
  atualizarPreview();
  mostrarStatusPerfil("success", "✅ Perfil padrão restaurado.");
}

async function otimizarImagemParaBase64(file, limite = 900, qualidade = 0.86){
  const dataUrl = await new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return await new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      try{
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        const escala = Math.min(1, limite / Math.max(w, h));
        w = Math.max(1, Math.round(w * escala));
        h = Math.max(1, Math.round(h * escala));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL("image/png", qualidade));
      }catch(e){
        resolve(dataUrl);
      }
    };
    img.onerror = ()=> resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function lidarUploadLogoEmpresa(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")){
    mostrarStatusPerfil("error", "Escolha uma imagem válida para a logo.");
    return;
  }
  try{
    mostrarStatusPerfil("info", "Salvando logo...");
    perfilEmpresa.logo = await otimizarImagemParaBase64(file);
    persistirPerfilEmpresa();
    preencherFormularioPerfilEmpresa();
    atualizarPreviewPerfilEmpresa();
    atualizarPreview();
    mostrarStatusPerfil("success", "✅ Logo salva. Ela já aparecerá no PDF.");
  }catch(err){
    mostrarStatusPerfil("error", "Não consegui salvar essa imagem. Tente uma imagem menor.");
  }
}

function removerLogoEmpresa(){
  perfilEmpresa.logo = "";
  persistirPerfilEmpresa();
  preencherFormularioPerfilEmpresa();
  atualizarPreviewPerfilEmpresa();
  atualizarPreview();
  mostrarStatusPerfil("success", "✅ Logo removida. O sistema voltará a usar a logo padrão.");
}

function inicializarPerfilEmpresa(){
  if(!localStorage.getItem(STORAGE_KEYS.usuarioAtual)) salvarUsuarioAtual();
  if(!localStorage.getItem(STORAGE_KEYS.perfilEmpresa)) persistirPerfilEmpresa();
  preencherFormularioPerfilEmpresa();
  atualizarPreviewPerfilEmpresa();
}


// ==================== CONTA / LOGIN LOCAL ====================
function avatarPadraoUsuario(nome="Usuário"){
  const inicial = String(nome || "U").trim().charAt(0).toUpperCase() || "U";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${normalizarHex(corAtual || perfilEmpresa.cor || '#008080')}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#g)"/><text x="80" y="96" font-size="68" text-anchor="middle" fill="white" font-family="Arial" font-weight="900">${inicial}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function emailNormalizado(v){ return String(v || "").trim().toLowerCase(); }

async function hashSenhaLocal(senha){
  const texto = "isi-local-v1:" + String(senha || "");
  if(window.crypto?.subtle){
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  // fallback simples caso o navegador não tenha crypto.subtle
  let h = 0;
  for(let i=0;i<texto.length;i++) h = Math.imul(31, h) + texto.charCodeAt(i) | 0;
  return "fallback-" + Math.abs(h);
}

function mostrarStatusConta(tipo, texto){
  if(!$("contaStatus")) return;
  $("contaStatus").innerHTML = alertHtml(tipo, texto);
  setTimeout(()=>{ if($("contaStatus")) $("contaStatus").innerHTML = ""; }, 4500);
}

function alternarTelaConta(tela){
  const cadastro = tela === "cadastro";
  if($("contaFormLogin")) $("contaFormLogin").classList.toggle("active", !cadastro);
  if($("contaFormCadastro")) $("contaFormCadastro").classList.toggle("active", cadastro);
  if($("btnContaLogin")) $("btnContaLogin").classList.toggle("active", !cadastro);
  if($("btnContaCadastro")) $("btnContaCadastro").classList.toggle("active", cadastro);
}

function limparFormularioConta(){
  ["contaCadastroNome","contaCadastroCargo","contaCadastroEmail","contaCadastroWhatsapp","contaCadastroSenha","contaCadastroConfirmar"].forEach(id => { if($(id)) $(id).value = ""; });
  contaCadastroFotoBase64 = "";
  if($("contaCadastroFotoPreview")) $("contaCadastroFotoPreview").src = avatarPadraoUsuario("Usuário");
}

async function lidarUploadFotoConta(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")){
    mostrarStatusConta("error", "Escolha uma imagem válida para a foto do usuário.");
    return;
  }
  try{
    contaCadastroFotoBase64 = await otimizarImagemParaBase64(file, 520, 0.86);
    if($("contaCadastroFotoPreview")) $("contaCadastroFotoPreview").src = contaCadastroFotoBase64;
    mostrarStatusConta("success", "✅ Foto adicionada ao cadastro.");
  }catch(err){
    mostrarStatusConta("error", "Não consegui carregar essa foto. Tente uma imagem menor.");
  }
}

async function criarContaLocal(){
  const nome = ($("contaCadastroNome")?.value || "").trim();
  const cargo = ($("contaCadastroCargo")?.value || "Agente de viagens").trim();
  const email = emailNormalizado($("contaCadastroEmail")?.value || "");
  const whatsapp = ($("contaCadastroWhatsapp")?.value || "").trim();
  const senha = $("contaCadastroSenha")?.value || "";
  const confirmar = $("contaCadastroConfirmar")?.value || "";

  if(!nome) return mostrarStatusConta("error", "Informe o nome do usuário.");
  if(!email || !email.includes("@")) return mostrarStatusConta("error", "Informe um e-mail válido.");
  if(senha.length < 4) return mostrarStatusConta("error", "Use uma senha com pelo menos 4 caracteres para teste.");
  if(senha !== confirmar) return mostrarStatusConta("error", "As senhas não conferem.");

  const contas = carregarContasLocais();
  if(contas.some(c => emailNormalizado(c.email) === email)) return mostrarStatusConta("error", "Já existe uma conta com esse e-mail neste navegador.");

  const novaConta = {
    id: "user-" + Date.now(),
    nome,
    email,
    whatsapp,
    cargo,
    foto: contaCadastroFotoBase64 || avatarPadraoUsuario(nome),
    permissao: contas.length === 0 ? "admin" : "agente",
    empresaId: perfilEmpresa.id || "empresa-local",
    modo: "local",
    senhaHash: await hashSenhaLocal(senha),
    criadoEm: new Date().toISOString()
  };
  contas.push(novaConta);
  salvarContasLocais(contas);
  usuarioAtual = { ...clonar(USUARIO_LOCAL_PADRAO), ...novaConta };
  delete usuarioAtual.senhaHash;
  limparFormularioConta();
  alternarTelaConta("login");
  preencherFormularioPerfilEmpresa();
  mostrarStatusConta("success", "✅ Conta criada. Abrindo sistema...");
  liberarSistemaAposLogin();
}

async function entrarContaLocal(){
  const email = emailNormalizado($("contaLoginEmail")?.value || "");
  const senha = $("contaLoginSenha")?.value || "";
  if(!email || !senha) return mostrarStatusConta("error", "Informe e-mail e senha.");
  const contas = carregarContasLocais();
  const conta = contas.find(c => emailNormalizado(c.email) === email);
  if(!conta) return mostrarStatusConta("error", "Conta não encontrada neste navegador.");
  const hash = await hashSenhaLocal(senha);
  if(hash !== conta.senhaHash) return mostrarStatusConta("error", "Senha incorreta.");
  usuarioAtual = { ...clonar(USUARIO_LOCAL_PADRAO), ...conta };
  delete usuarioAtual.senhaHash;
  if($("contaLoginSenha")) $("contaLoginSenha").value = "";
  preencherFormularioPerfilEmpresa();
  mostrarStatusConta("success", "✅ Login realizado. Abrindo sistema...");
  liberarSistemaAposLogin();
}

function entrarComoAdministradorLocal(){
  usuarioAtual = clonar(USUARIO_LOCAL_PADRAO);
  preencherFormularioPerfilEmpresa();
  mostrarStatusConta("success", "✅ Entrando como Administrador local...");
  liberarSistemaAposLogin();
}

function sairContaLocal(){
  if(!confirm("Sair e voltar para a página de login?")) return;
  voltarParaPaginaLogin();
}

function usarContaLocal(id){
  const contas = carregarContasLocais();
  const conta = contas.find(c => c.id === id);
  if(!conta) return mostrarStatusConta("error", "Conta não encontrada.");
  usuarioAtual = { ...clonar(USUARIO_LOCAL_PADRAO), ...conta };
  delete usuarioAtual.senhaHash;
  preencherFormularioPerfilEmpresa();
  mostrarStatusConta("success", `✅ Usuário alterado para ${escapeHtml(usuarioAtual.nome)}.`);
  liberarSistemaAposLogin();
}

function excluirContaLocal(id){
  const contas = carregarContasLocais();
  const conta = contas.find(c => c.id === id);
  if(!conta) return;
  if(!confirm(`Excluir a conta local de ${conta.nome}?`)) return;
  const novas = contas.filter(c => c.id !== id);
  salvarContasLocais(novas);
  if(usuarioAtual.id === id) entrarComoAdministradorLocal();
  atualizarPainelConta();
  mostrarStatusConta("success", "✅ Conta removida deste navegador.");
}

function atualizarPainelConta(){
  if(!$("contaUsuarioAtualBox")) return;
  const foto = usuarioAtual.foto || avatarPadraoUsuario(usuarioAtual.nome || "Admin");
  $("contaUsuarioAtualBox").innerHTML = `
    <div class="conta-user-top">
      <img src="${escapeAttr(foto)}" alt="Foto do usuário">
      <div>
        <div class="conta-user-name">${escapeHtml(usuarioAtual.nome || "Administrador")}</div>
        <div class="conta-user-email">${escapeHtml(usuarioAtual.email || "Acesso direto / sem login real")}</div>
      </div>
    </div>
    <div class="conta-user-meta">
      <div class="conta-meta-box"><div class="conta-meta-label">Cargo</div><div class="conta-meta-value">${escapeHtml(usuarioAtual.cargo || "Administrador")}</div></div>
      <div class="conta-meta-box"><div class="conta-meta-label">Permissão</div><div class="conta-meta-value">${escapeHtml(usuarioAtual.permissao || "admin")}</div></div>
      <div class="conta-meta-box"><div class="conta-meta-label">Modo</div><div class="conta-meta-value">${escapeHtml(usuarioAtual.modo || "local")}</div></div>
      <div class="conta-meta-box"><div class="conta-meta-label">WhatsApp</div><div class="conta-meta-value">${escapeHtml(usuarioAtual.whatsapp || "—")}</div></div>
    </div>
  `;

  const lista = carregarContasLocais();
  if($("contaListaUsuarios")){
    if(!lista.length){
      $("contaListaUsuarios").innerHTML = `<div class="alert alert-info">Nenhuma conta criada ainda. Use a aba “Criar conta” para cadastrar o primeiro usuário.</div>`;
    }else{
      $("contaListaUsuarios").innerHTML = lista.map(c => `
        <div class="conta-user-item">
          <div class="conta-user-left">
            <img src="${escapeAttr(c.foto || avatarPadraoUsuario(c.nome))}" alt="Usuário">
            <div style="min-width:0;"><strong>${escapeHtml(c.nome)}</strong><span>${escapeHtml(c.email)} · ${escapeHtml(c.cargo || "Agente")}</span></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn" type="button" onclick="usarContaLocal('${escapeAttr(c.id)}')">Usar</button>
            <button class="btn-danger" type="button" onclick="excluirContaLocal('${escapeAttr(c.id)}')">Excluir</button>
          </div>
        </div>
      `).join("");
    }
  }

  if($("contaCadastroFotoPreview") && !contaCadastroFotoBase64) $("contaCadastroFotoPreview").src = avatarPadraoUsuario("Usuário");
}


function atualizarTopoUsuario(){
  const foto = usuarioAtual.foto || avatarPadraoUsuario(usuarioAtual.nome || "Administrador");
  if($("topUsuarioFoto")) $("topUsuarioFoto").src = foto;
  if($("topUsuarioNome")) $("topUsuarioNome").textContent = usuarioAtual.nome || "Administrador";
  if($("loginLogoEmpresa")) $("loginLogoEmpresa").src = perfilEmpresa.logo || montarCaminhosImagem("isis.png")[0] || "";
}

function atualizarTelaLoginApp(){
  const ativo = existeSessaoAtiva();
  if($("loginPage")) $("loginPage").classList.toggle("hidden", ativo);
  if($("appShell")) $("appShell").classList.toggle("hidden", !ativo);
  atualizarTopoUsuario();
  atualizarPainelConta();
}

function liberarSistemaAposLogin(){
  salvarUsuarioAtual();
  marcarSessaoAtiva();
  atualizarTelaLoginApp();
  mudarAba("cotador");
}

function voltarParaPaginaLogin(){
  localStorage.removeItem(STORAGE_KEYS.sessaoAtiva);
  alternarTelaConta("login");
  atualizarTelaLoginApp();
}

function inicializarContaLocal(){
  if(!localStorage.getItem(STORAGE_KEYS.usuarioAtual)) localStorage.setItem(STORAGE_KEYS.usuarioAtual, JSON.stringify(usuarioAtual));
  if($("contaCadastroFotoInput")) $("contaCadastroFotoInput").addEventListener("change", lidarUploadFotoConta);
  atualizarTelaLoginApp();
}

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

const IMG_BASES = ["/imagens/", "imagens/", "public/imagens/"];

function escapeAttr(v){
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtml(v){
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function montarCaminhosImagem(nomes){
  const listaNomes = Array.isArray(nomes) ? nomes : [nomes];
  const unicos = [];
  listaNomes.filter(Boolean).forEach(nome => {
    IMG_BASES.forEach(base => {
      const caminho = `${base}${nome}`;
      if(!unicos.includes(caminho)) unicos.push(caminho);
    });
  });
  return unicos;
}

function handleImgError(img){
  const caminhos = String(img?.dataset?.imgPaths || "")
    .split("||")
    .map(v => v.trim())
    .filter(Boolean);
  const tentativaAtual = parseInt(img?.dataset?.imgTry || "0", 10);
  const proximaTentativa = tentativaAtual + 1;

  if(caminhos[proximaTentativa]){
    img.dataset.imgTry = String(proximaTentativa);
    img.src = caminhos[proximaTentativa];
    return;
  }

  img.style.display = "none";
}

function imgAttrs(nomes){
  const caminhos = montarCaminhosImagem(nomes);
  const primeiro = caminhos[0] || "";
  const caminhosAttr = escapeAttr(caminhos.join("||"));
  return `src="${escapeAttr(primeiro)}" data-img-paths="${caminhosAttr}" data-img-try="0" onerror="handleImgError(this)"`;
}

function nomesImagemBagagem23kg(desp){
  return desp > 0
    ? ["bagagem23kg adicionada.png", "bagagem23kg adionada.png"]
    : ["bagagem23kg nao adicionada.png", "bagagem23kg nao adionada.png"];
}


// ==================== COMPANHIAS AÉREAS ====================

const COMPANHIAS_AEREAS = [
  { nome: "Aerolineas Argentinas", codigo: ["AR"], imagem: "aerolineas.png" },
  { nome: "Aeromexico", codigo: ["AM"], imagem: "aeromexico.png" },
  { nome: "Air Canada", codigo: ["AC"], imagem: "aircanada.png" },
  { nome: "Air China", codigo: ["CA"], imagem: "airchina.png" },
  { nome: "Air Europa", codigo: ["UX"], imagem: "aireuropa.png" },
  { nome: "Air France", codigo: ["AF"], imagem: "airfrance.png" },
  { nome: "Air New Zealand", codigo: ["NZ"], imagem: "airnewzealand.png" },
  { nome: "American Airlines", codigo: ["AA"], imagem: "american.png" },
  { nome: "Amaszonas", codigo: ["Z8"], imagem: "amaszonas.png" },
  { nome: "ANA", codigo: ["NH"], imagem: "ana.png" },
  { nome: "Arajet", codigo: ["DM"], imagem: "arajet.png" },
  { nome: "Avianca", codigo: ["AV"], imagem: "avianca.png" },
  { nome: "Azul", codigo: ["AD"], imagem: "azul.png" },
  { nome: "BoA", codigo: ["OB"], imagem: "boa.png" },
  { nome: "British Airways", codigo: ["BA"], imagem: "british.png" },
  { nome: "Condor", codigo: ["DE"], imagem: "condor.png" },
  { nome: "Copa Airlines", codigo: ["CM"], imagem: "copa.png" },
  { nome: "Delta", codigo: ["DL"], imagem: "delta.png" },
  { nome: "El Al", codigo: ["LY"], imagem: "elal.png" },
  { nome: "Emirates", codigo: ["EK"], imagem: "emirates.png" },
  { nome: "Ethiopian Airlines", codigo: ["ET"], imagem: "ethiopian.png" },
  { nome: "GOL", codigo: ["G3"], imagem: "gol2.png" },
  { nome: "Iberia", codigo: ["IB"], imagem: "iberia.png" },
  { nome: "ITA Airways", codigo: ["AZ"], imagem: "ita.png" },
  { nome: "Japan Airlines", codigo: ["JL"], imagem: "jal.png" },
  { nome: "JetSMART", codigo: ["JA"], imagem: "jetsmart.png" },
  { nome: "KLM", codigo: ["KL"], imagem: "klm.png" },
  { nome: "Korean Air", codigo: ["KE"], imagem: "koreanair.png" },
  { nome: "LATAM", codigo: ["LA", "JJ"], imagem: "latam.png" },
  { nome: "Lufthansa", codigo: ["LH"], imagem: "lufthansa.png" },
  { nome: "Paranair", codigo: ["ZP"], imagem: "paranair.png" },
  { nome: "Qantas", codigo: ["QF"], imagem: "qantas.png" },
  { nome: "Qatar Airways", codigo: ["QR"], imagem: "qatar.png" },
  { nome: "Royal Air Maroc", codigo: ["AT"], imagem: "royalairmaroc.png" },
  { nome: "Singapore Airlines", codigo: ["SQ"], imagem: "singapore.png" },
  { nome: "SKY Airline", codigo: ["H2"], imagem: "sky.png" },
  { nome: "South African Airways", codigo: ["SA"], imagem: "southafrican.png" },
  { nome: "Swiss", codigo: ["LX"], imagem: "swiss.png" },
  { nome: "TAAG Angola Airlines", codigo: ["DT"], imagem: "taag.png" },
  { nome: "TAP Air Portugal", codigo: ["TP"], imagem: "tap.png" },
  { nome: "Turkish Airlines", codigo: ["TK"], imagem: "turkish.png" },
  { nome: "United Airlines", codigo: ["UA"], imagem: "united.png" }
];

function getCompanhiaImg(comp){
  let c = String(comp || "").toLowerCase().trim();

  let companhia = COMPANHIAS_AEREAS.find(item => {
    let nomeConfere = item.nome.toLowerCase() === c || item.nome.toLowerCase().includes(c) || c.includes(item.nome.toLowerCase());
    let codigoConfere = item.codigo.some(cod => cod.toLowerCase() === c);
    return nomeConfere || codigoConfere;
  });

  return companhia ? companhia.imagem : "";
}

function mapCarrier(c){
  let codigo = String(c || "").toUpperCase().trim();

  let companhia = COMPANHIAS_AEREAS.find(item => 
    item.codigo.includes(codigo)
  );

  return companhia ? companhia.nome : c || "";
}

function gerarOptionsCompanhias(){
  return `
    <option value="">Selecione</option>
    ${[...COMPANHIAS_AEREAS]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(item => `
        <option value="${item.nome}">${item.nome}</option>
      `).join("")}
  `;
}


function formatarDataCurta(d){ if(!d) return ""; let dt=new Date(d); if(isNaN(dt)) return ""; let dias=["DOM","SEG","TER","QUA","QUI","SEX","SAB"], meses=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"]; return `${dias[dt.getDay()]} ${dt.getDate()} ${meses[dt.getMonth()]}`; }
function formatarDuracao(h,m){ let r=""; if(h>0) r+=h+"h"; if(m>0) r+=(r?" ":"")+m+"min"; return r||"0h"; }

// ==================== RENDERIZAR FORMULÁRIO DE VOO ====================
function renderizarFormVoo(p){
  return `<div class="row-2"><div class="form-group"><label>Data</label><input type="date" id="data_${p}" onchange="atualizarPreview()"></div><div class="form-group"><label>Companhia</label><select id="companhia_${p}" onchange="atualizarPreview()">${gerarOptionsCompanhias()}</select></div></div>
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
        <div class="bagagem-form-card"><img ${imgAttrs('bolsa ou mochila de mao.png')}><div class="bagagem-form-texto"><strong>Bolsa ou mochila de mão</strong><span>10kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagItem_${p}',-1,1)">−</button><input type="number" id="bagItem_${p}" value="1" min="1" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagItem_${p}',1,1)">+</button></div><small class="bagagem-status incluso">Incluso</small></div>
        <div class="bagagem-form-card"><img ${imgAttrs('mala pequena.png')}><div class="bagagem-form-texto"><strong>Mala pequena</strong><span>12kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagMao_${p}',-1,1)">−</button><input type="number" id="bagMao_${p}" value="1" min="1" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagMao_${p}',1,1)">+</button></div><small class="bagagem-status incluso">Incluso</small></div>
        <div class="bagagem-form-card"><img ${imgAttrs(nomesImagemBagagem23kg(0))}><div class="bagagem-form-texto"><strong>Bagagem despachada</strong><span>23kg</span></div><div class="bagagem-stepper"><button type="button" onclick="alterarBagagemQtd('bagDesp_${p}',-1,0)">−</button><input type="number" id="bagDesp_${p}" value="0" min="0" onchange="normalizarBagagens('${p}')"><button type="button" onclick="alterarBagagemQtd('bagDesp_${p}',1,0)">+</button></div><small class="bagagem-status opcional">Opcional</small></div>
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
  return `<div class="bagagens-pdf"><div class="bagagens-header">Bagagens</div><div class="bagagens-subtitle">${titulo}</div><div class="bagagens-grid-pdf"><div class="bagagem-card-pdf bagagem-card-premium"><img ${imgAttrs('bolsa ou mochila de mao.png')}><div><div class="bag-title">Bolsa de mão</div><div class="bag-sub">10kg</div></div><div class="bag-qtd">${item}</div></div><div class="bagagem-card-pdf bagagem-card-premium"><img ${imgAttrs('mala pequena.png')}><div><div class="bag-title">Mala pequena</div><div class="bag-sub">12kg</div></div><div class="bag-qtd">${mao}</div></div><div class="bagagem-card-pdf bagagem-card-premium"><img ${imgAttrs(nomesImagemBagagem23kg(desp))}><div><div class="bag-title">Bagagem despachada</div><div class="bag-sub">23kg</div></div><div class="bag-qtd">${desp}</div></div></div></div>`;
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
  
  return `<div class="flight-card"><div class="flight-header"><span class="flight-type">${titulo}</span><span class="flight-date">${formatarDataCurta(data) || "—"}</span></div><div class="route-main"><div class="airport-origin"><div class="airport-code">${origem || "?"}</div><div class="airport-city">${cidadeOrigem || "—"}</div></div><div class="flight-connection">${gerarSetaParadasHTML(prefixo, tipoVoo)}</div><div class="airport-destination"><div class="airport-code">${destino || "?"}</div><div class="airport-city">${cidadeDestino || "—"}</div></div></div><div class="schedule-row"><div class="time-point"><div class="time-value">${horaPartida || "—"}</div><div class="time-label">Partida</div></div><div class="duration-middle"><div class="duration-value">${formatarDuracao(duracaoH, duracaoM)}</div><div class="duration-label">Duração</div></div><div class="time-point"><div class="time-value">${chegadaDisplay || "—"}</div><div class="time-label">Chegada</div></div></div><div class="flight-footer"><div class="airline-info">${logo ? `<img class="airline-logo-small" ${imgAttrs(logo)}>` : ""}<span>${companhia || "Companhia"}</span></div>${classe ? `<div class="classe-info">${classe}</div>` : ""}</div>${gerarInfoParadasHTML(prefixo)}${gerarBagagensHTML(prefixo, titulo)}</div>`;
}

function gerarCardTrecho(trecho){
  let id = trecho.id;
  return gerarCardVoo(trecho.nome, `t${id}`);
}


function montarListaCamposPassageiros(){
  let adultos = Math.max(0, parseInt($("adultosManual")?.value || 0));
  let criancas = Math.max(0, parseInt($("criancasManual")?.value || 0));
  let bebes = Math.max(0, parseInt($("bebesManual")?.value || 0));
  let pets = Math.max(0, parseInt($("petsManual")?.value || 0));
  let lista = [];
  for(let i=1; i<=adultos; i++) lista.push({ tipo:"Adulto", label:`Adulto ${i}`, tipoSlug:"adulto" });
  for(let i=1; i<=criancas; i++) lista.push({ tipo:"Criança", label:`Criança ${i}`, tipoSlug:"crianca" });
  for(let i=1; i<=bebes; i++) lista.push({ tipo:"Bebê", label:`Bebê ${i}`, tipoSlug:"bebe" });
  for(let i=1; i<=pets; i++) lista.push({ tipo:"Pet", label:`Pet ${i}`, tipoSlug:"pet" });
  return lista;
}

function renderizarCamposPassageiros(){
  let container = $("camposPassageiros");
  if(!container) return;

  let valoresAtuais = [...container.querySelectorAll(".nomePassageiroInput")].map(input => ({
    nome: input.value || "",
    tipo: input.dataset.tipo || ""
  }));
  let lista = montarListaCamposPassageiros();

  if(!lista.length){
    container.innerHTML = `<div style="font-size:11px;color:#6c757d;padding:8px;background:#fff;border-radius:8px;">Informe a quantidade de passageiros e pets acima.</div>`;
    atualizarPreview();
    return;
  }

  container.innerHTML = lista.map((pax, i) => {
    const valorExistente = valoresAtuais.find(item => item.tipo === pax.label) || valoresAtuais[i] || { nome:"" };
    const placeholderNome = pax.tipo === "Pet" ? "Nome do pet" : "Nome opcional";
    return `
    <div class="passageiro-campo passageiro-campo-${pax.tipoSlug}">
      <label><span>${String(i+1).padStart(2,"0")} · ${pax.label}</span><span class="passageiro-tipo">${pax.tipo}</span></label>
      <input type="text" class="nomePassageiroInput" data-tipo="${pax.label}" data-tipo-base="${pax.tipo}" id="nomePassageiro_${i+1}" value="${valorExistente.nome || ""}" placeholder="${placeholderNome}" oninput="atualizarPreview()">
    </div>`;
  }).join("");

  atualizarPreview();
}

function obterPassageirosInformados(){
  return [...document.querySelectorAll(".nomePassageiroInput")]
    .map((input, index) => ({
      ordem: index + 1,
      nome: String(input.value || "").trim(),
      tipo: String(input.dataset.tipoBase || "Passageiro").trim(),
      label: String(input.dataset.tipo || "Passageiro").trim()
    }))
    .filter(item => item.nome);
}

function obterNomesPassageiros(){
  return obterPassageirosInformados().map(item => `${item.tipo}: ${item.nome}`);
}

function gerarPassageirosPDF(textoPessoas){
  let passageiros = obterPassageirosInformados();
  if(!passageiros.length) return "";
  return `<div class="passengers-box"><div class="pdf-section-title">Passageiros e pets</div><div class="passengers-head"><span>${passageiros.length} nome(s) informado(s)</span><span>${textoPessoas || ""}</span></div><div class="passenger-list">${passageiros.map((p)=>`<div class="passenger-pill"><span class="passenger-num">${String(p.ordem).padStart(2,"0")}</span><div style="display:flex;flex-direction:column;gap:3px;"><span class="passenger-name">${p.nome}</span><span style="display:inline-flex;align-self:flex-start;background:${p.tipo === "Pet" ? "#fff0d9" : "#e8f6f6"};color:${p.tipo === "Pet" ? "#9a5a00" : "#0b7a7a"};font-size:8px;font-weight:800;padding:2px 7px;border-radius:999px;text-transform:uppercase;letter-spacing:.4px;">${p.label}</span></div></div>`).join("")}</div></div>`;
}

// ==================== PREVIEW ====================
function gerarHTMLPreview(){
  let cliente = $("cliente").value;
  let cotacao = $("cotacao").value;
  let localizador = $("localizador")?.value || "";
  let tipo = $("tipoViagem").value;
  let adultos = parseInt($("adultosManual").value) || 0;
  let criancas = parseInt($("criancasManual").value) || 0;
  let bebes = parseInt($("bebesManual").value) || 0;
  let pets = parseInt($("petsManual")?.value || 0) || 0;
  let valorOrig = $("valorOriginal").value;
  let valorPromo = $("valorPromocional").value;
  let observacoes = $("observacoes").value;
  let incluirVooInterno = $("incluirVooInterno")?.checked || false;
  
  let textoPessoas = "";
  if(adultos > 0) textoPessoas += adultos + (adultos === 1 ? " adulto" : " adultos");
  if(criancas > 0) textoPessoas += (textoPessoas ? " + " : "") + criancas + (criancas === 1 ? " criança" : " crianças");
  if(bebes > 0) textoPessoas += (textoPessoas ? " + " : "") + bebes + (bebes === 1 ? " bebê" : " bebês");
  if(pets > 0) textoPessoas += (textoPessoas ? " + " : "") + pets + (pets === 1 ? " pet" : " pets");
  
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
  
  let fotoHtml = clubeFotoBase64 ? `<img src="${clubeFotoBase64}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid rgba(11,122,122,.14);box-shadow:0 2px 6px rgba(0,0,0,.04);background:#fff;">` : "";
  let nomeGrupoHtml = nomeGrupoAtual ? `<div style="font-size:10px;font-weight:800;color:#0b1433;letter-spacing:.1px;line-height:1.15;max-width:96px;word-break:break-word;">${nomeGrupoAtual}</div>` : "";
  let grupoDestaqueHtml = (fotoHtml || nomeGrupoHtml) ? `<div style="float:right;margin-left:8px;margin-bottom:6px;"><div style="display:flex;flex-direction:column;align-items:center;gap:4px;background:#fff;border:1px solid #e7edf3;border-radius:10px;padding:6px 8px;min-width:72px;max-width:100px;box-shadow:0 2px 6px rgba(0,0,0,.03);text-align:center;">${fotoHtml || ""}${nomeGrupoHtml || ""}</div></div>` : "";
  let observacoesHtml = observacoes ? `<div style="font-size:10px;margin-top:8px;padding:8px 10px;background:#f8f9fa;border-radius:8px;"><strong>📝 Observações:</strong><br>${observacoes}</div>` : "";
  let totalVoos = tipo === "multitrecho" ? trechosMult.length : (tipo === "idaVolta" ? (incluirVooInterno ? 3 : 2) : 1);
  let classePdf = totalVoos >= 3 ? "pdf-3" : (totalVoos === 2 ? "pdf-2" : "pdf-1");
  let clienteHtml = cliente && cliente.trim() ? `<div class="pdf-client">Cliente: ${cliente}</div>` : "";
  let localizadorHtml = localizador && localizador.trim() ? `<div class="pdf-locator"><small>Localizador</small><strong>${localizador}</strong></div>` : `<div></div>`;
  let deHtml = valorOrig && valorOrig.trim() ? `<div class="price-original">De: ${valorOrig}</div>` : "";
  let passageirosHtml = gerarPassageirosPDF(textoPessoas);

  let empresaNome = perfilEmpresa.nome || "ISI VIAGENS LTDA";
  let empresaSlogan = perfilEmpresa.slogan || "VOAR É ISI ✈️";
  let empresaContato = contatoEmpresaTexto();
  let empresaSub = empresaContato || empresaSlogan;

  return `<div class="pdf-preview pdf-reformado ${classePdf}">
    <div class="pdf-topbar">
      <div class="pdf-brand"><img ${perfilLogoAttrs()}><div><div class="pdf-brand-title">${empresaNome}</div><div class="pdf-brand-sub">${empresaSub}</div></div></div>
      <div class="pdf-title-box"><div class="pdf-main-title">${cotacao || "Passagem Aérea"}</div>${clienteHtml}</div>
      ${localizadorHtml}
    </div>
    <div class="pdf-body">
      ${grupoDestaqueHtml}
      ${passageirosHtml}
      <div class="pdf-section-title">Itinerário</div>
      ${voos}
      <div class="benefits-row"><div class="benefit-item">✅ Taxas inclusas</div><div class="benefit-item">✅ Suporte 24h</div><div class="benefit-item">✅ ${empresaNome}</div></div>
      <div class="passengers-info">✈️ Valor referente a <strong>${textoPessoas || "1 adulto"}</strong></div>
      <div class="price-container"><div><div style="font-size:9px;">Valor para ${textoPessoas || "1 adulto"}</div>${deHtml}</div><div><div style="font-size:9px;">Promocional:</div><div class="price-promotional">${valorPromo}</div></div></div>
      ${observacoesHtml}
      <div class="warning-box"><span>⚠️ Os valores podem sofrer alterações sem aviso prévio.</span></div>
      <div class="footer-note">📄 Gerado por ${empresaNome}.</div>
    </div>
  </div>`;
}

function atualizarPreview(){
  $("previewContainer").innerHTML = gerarHTMLPreview();
}

function esperarImagensPreview(timeout = 4000){
  const imagens = [...document.querySelectorAll('#previewContainer img')];
  if(!imagens.length) return Promise.resolve();

  return Promise.race([
    Promise.all(imagens.map(img => {
      if(img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        let finalizado = false;
        const encerrar = () => {
          if(finalizado) return;
          finalizado = true;
          img.removeEventListener('load', encerrar);
          img.removeEventListener('error', encerrar);
          resolve();
        };
        img.addEventListener('load', encerrar, { once:true });
        img.addEventListener('error', encerrar, { once:true });
      });
    })),
    new Promise(resolve => setTimeout(resolve, timeout))
  ]);
}

async function gerarPDF(){
  atualizarPreview();
  await esperarImagensPreview();
  setTimeout(() => window.print(), 150);
}

// ==================== SALVAR E HISTÓRICO ====================
function salvarCotacao(){
  let c = { id: Date.now(), data: new Date().toLocaleDateString("pt-BR"), empresa: perfilEmpresa.nome || "ISI Viagens", usuarioId: usuarioAtual.id || "local-admin", cliente: $("cliente").value, cotacao: $("cotacao").value, tipoViagem: $("tipoViagem").value, valorOriginal: $("valorOriginal").value, valorPromocional: $("valorPromocional").value, nomeGrupo: $("nomeGrupo").value, localizador: $("localizador")?.value || "", passageiros: obterNomesPassageiros().join("; "), html: gerarHTMLPreview() };
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
  const mapa = { perfil:"abaPerfil", cotador:"abaCotador", historico:"abaHistorico" };
  Object.entries(mapa).forEach(([chave, id]) => { if($(id)) $(id).classList.toggle("active", aba === chave); });
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.aba === aba));
  if(aba === "historico") atualizarListaHistorico();
  else if(aba === "perfil") { preencherFormularioPerfilEmpresa(); atualizarPreviewPerfilEmpresa(); }
  else atualizarPreview();
}



// ==================== PWA / APLICATIVO INSTALÁVEL ====================
let pwaDeferredPrompt = null;

function estaEmModoApp(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function atualizarStatusOnlinePWA(){
  const badge = $("appOfflineBadge");
  if(!badge) return;
  badge.classList.toggle("active", !navigator.onLine);
}

function configurarPWA(){
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js")
        .then(reg => console.log("PWA ativo:", reg.scope))
        .catch(err => console.warn("Service Worker não registrado:", err));
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwaDeferredPrompt = e;
    const btn = $("btnInstalarPWA");
    const txt = $("pwaInstallText");
    if(btn) btn.style.display = "inline-flex";
    if(txt) txt.textContent = "Este sistema já pode ser instalado como aplicativo neste dispositivo.";
  });

  window.addEventListener("appinstalled", () => {
    pwaDeferredPrompt = null;
    mostrarAvisoPWA("✅ App instalado com sucesso.");
  });

  window.addEventListener("online", atualizarStatusOnlinePWA);
  window.addEventListener("offline", atualizarStatusOnlinePWA);
  atualizarStatusOnlinePWA();

  const btn = $("btnInstalarPWA");
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  if(btn && isIOS) btn.textContent = "Ver passo a passo";
  if(estaEmModoApp() && $("pwaInstallBox")) $("pwaInstallBox").style.display = "none";
}

async function instalarPWA(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  if(isIOS || !pwaDeferredPrompt){
    mostrarAjudaInstalacaoPWA();
    return;
  }
  pwaDeferredPrompt.prompt();
  const escolha = await pwaDeferredPrompt.userChoice;
  pwaDeferredPrompt = null;
  if(escolha && escolha.outcome === "accepted") mostrarAvisoPWA("✅ Instalação iniciada.");
}

function mostrarAjudaInstalacaoPWA(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  const hint = $("pwaIosHint");
  if(hint) hint.style.display = "block";
  if(isIOS){
    alert("No iPhone:\n\n1. Abra o sistema pelo Safari\n2. Toque no botão Compartilhar\n3. Escolha ‘Adicionar à Tela de Início’\n4. Confirme em ‘Adicionar’\n\nDepois o sistema abre como aplicativo.");
  } else {
    alert("No Android/Chrome:\n\n1. Abra o link do sistema\n2. Toque em Instalar app ou no menu ⋮\n3. Escolha ‘Adicionar à tela inicial’ ou ‘Instalar app’\n\nObservação: precisa estar hospedado em HTTPS para instalar.");
  }
}

function mostrarAvisoPWA(texto){
  const antigo = document.getElementById("pwaToastAviso");
  if(antigo) antigo.remove();
  const div = document.createElement("div");
  div.id = "pwaToastAviso";
  div.textContent = texto;
  div.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:10000;background:#0f172a;color:#fff;border-radius:14px;padding:12px 14px;font-size:12px;font-weight:900;box-shadow:0 12px 30px rgba(15,23,42,.25);";
  document.body.appendChild(div);
  setTimeout(()=>div.remove(), 3500);
}

// ==================== EVENTOS E INICIALIZAÇÃO ====================
if($("perfilLogoInput")) $("perfilLogoInput").addEventListener("change", lidarUploadLogoEmpresa);
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

inicializarPerfilEmpresa();
inicializarContaLocal();
corAtual = normalizarHex(perfilEmpresa.cor || corAtual);
document.documentElement.style.setProperty("--theme", corAtual);
if($("corPersonalizada")) $("corPersonalizada").value = corAtual;
if($("corHex")) $("corHex").value = corAtual;
atualizarVisibilidadeSecoes();
atualizarTodosCamposParadas();
renderizarCamposPassageiros();
atualizarPreview();
atualizarPreviewPerfilEmpresa();
atualizarTelaLoginApp();
atualizarListaHistorico();
configurarPWA();
testarAmadeus();
