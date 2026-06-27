// ==================== VARIÁVEIS GLOBAIS ====================
let corAtual = "#008080";
let clubeFotoBase64 = "";
let nomeGrupoAtual = "";
let cotacoesSalvas = JSON.parse(localStorage.getItem("cotacoes_isi")) || [];
let cotacaoEmEdicaoId = null;
let ofertasRaw = [];
let ofertaSelecionadaRaw = null;
let trechosMult = [{ id: 1, nome: "Trecho 1" }, { id: 2, nome: "Trecho 2" }];
let trechoCount = 2;
// Controla apenas a visualização compacta no celular. No PDF os trechos saem normalmente.
let trechosOcultosPreview = new Set();
// Controla os trechos que realmente não entram no PDF/preview final.
let trechosOcultosPDF = new Set();
let qrcodePixBase64 = "";
// Modo com login local básico, sem Firebase.
const COTAMILES_SEM_LOGIN = false;


const STORAGE_KEYS = {
  usuarioAtual: "isi_usuario_atual_v1",
  perfilEmpresa: "isi_perfil_empresa_v1",
  contas: "isi_contas_usuarios_v1",
  sessaoAtiva: "isi_sessao_ativa_v1"
};

const PERFIL_EMPRESA_PADRAO = {
  nome: "Cotamiles",
  slogan: "Cotação aérea inteligente ✈️",
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

function persistirPerfilEmpresa(syncFirebase=true){
  perfilEmpresa.atualizadoEm = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.perfilEmpresa, JSON.stringify(perfilEmpresa));
  if(syncFirebase && firebaseProntoCotamiles && firebaseAuthCotamiles?.currentUser){
    salvarPerfilFirebase().catch(err => console.warn("Não foi possível sincronizar perfil:", err));
  }
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

// ==================== SEGURANÇA / AUTENTICAÇÃO ====================
// IMPORTANTE: no GitHub Pages o código é público. Não coloque senhas, chaves privadas,
// client_secret, tokens do Amadeus ou SMTP aqui. Para produção, use Firebase Auth,
// Supabase Auth, Auth0 ou um backend próprio.
const SECURITY_CONFIG = {
  minSenha: 6,
  maxSenha: 64,
  maxTentativasLogin: 5,
  bloqueioMinutos: 15,
  twoFactorObrigatorio: false, // ativar somente quando tiver Firebase/Supabase/backend
  authProvider: "local" // login básico local
};


// ==================== FIREBASE AUTH / FIRESTORE ====================
// Configure o arquivo firebase-config.js com os dados do seu projeto.
let firebaseAppCotamiles = null;
let firebaseAuthCotamiles = null;
let firebaseDbCotamiles = null;
let firebaseProntoCotamiles = false;

function firebaseConfigValido(){ return false; }

function inicializarFirebaseCotamiles(){ return false; }

function authFirebaseAtivo(){ return false; }
function uidAtualFirebase(){ return usuarioAtual?.id || "local-admin"; }

function traduzirErroFirebase(error){
  const code = error?.code || "";
  const mapa = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "Senha fraca. Use no mínimo 12 caracteres com letra, número e símbolo.",
    "auth/invalid-credential": "E-mail ou senha incorretos. Se esse e-mail ainda não tem cadastro, clique em Criar conta.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/user-not-found": "Usuário não encontrado. Clique em Criar conta para cadastrar esse e-mail.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique a internet.",
    "auth/operation-not-allowed": "Ative Email/Senha no Firebase Authentication."
  };
  return mapa[code] || error?.message || "Não foi possível concluir a ação.";
}

async function salvarPerfilFirebase(){
  if(!firebaseDbCotamiles || !firebaseAuthCotamiles?.currentUser) return;
  const uid = firebaseAuthCotamiles.currentUser.uid;
  const perfilSeguro = { ...perfilEmpresa, atualizadoEm: new Date().toISOString() };
  await firebaseDbCotamiles.collection("usuarios").doc(uid).set({
    usuario: {
      uid,
      nome: usuarioAtual.nome || "",
      email: usuarioAtual.email || firebaseAuthCotamiles.currentUser.email || "",
      cargo: usuarioAtual.cargo || "",
      whatsapp: usuarioAtual.whatsapp || "",
      foto: usuarioAtual.foto || "",
      permissao: usuarioAtual.permissao || "agente",
      atualizadoEm: new Date().toISOString()
    },
    empresa: perfilSeguro,
    acl: usuarioAtual.acl || ["cotacao:manual"],
    authProvider: "firebase"
  }, { merge:true });
}

async function carregarPerfilFirebase(){
  if(!firebaseDbCotamiles || !firebaseAuthCotamiles?.currentUser) return;
  const uid = firebaseAuthCotamiles.currentUser.uid;
  const snap = await firebaseDbCotamiles.collection("usuarios").doc(uid).get();
  if(!snap.exists) return;
  const data = snap.data() || {};
  if(data.usuario){
    usuarioAtual = { ...usuarioAtual, ...data.usuario, id: uid, modo: "firebase" };
    salvarUsuarioAtual();
  }
  if(data.empresa){
    perfilEmpresa = { ...perfilEmpresa, ...data.empresa };
    persistirPerfilEmpresa(false);
  }
}

function observarSessaoFirebase(){ return false; }

function avaliarSenhaForte(senha=""){
  const s = String(senha || "");
  return {
    tamanho: s.length >= SECURITY_CONFIG.minSenha && s.length <= SECURITY_CONFIG.maxSenha,
    maiusculaMinuscula: true,
    numero: true,
    simbolo: true
  };
}

function senhaEhForte(senha=""){
  const s = String(senha || "");
  return s.length >= SECURITY_CONFIG.minSenha && s.length <= SECURITY_CONFIG.maxSenha;
}

function atualizarRegrasSenha(){
  const senha = $("contaCadastroSenha")?.value || "";
  const ok = senhaEhForte(senha);
  const el = $("regraTamanho");
  if(el){
    el.classList.toggle("ok", ok);
    el.classList.toggle("fail", !ok);
  }
  ["regraMaiuscula","regraNumero","regraSimbolo"].forEach(id=>{
    const item = $(id);
    if(item){ item.classList.add("ok"); item.classList.remove("fail"); }
  });
}

function chaveTentativasLogin(email){ return "cotamiles_login_attempts_" + emailNormalizado(email); }

function obterControleTentativas(email){
  try { return JSON.parse(localStorage.getItem(chaveTentativasLogin(email)) || "{}"); }
  catch(e){ return {}; }
}

function loginEstaBloqueado(email){
  const info = obterControleTentativas(email);
  if(!info.bloqueadoAte) return false;
  return Date.now() < Number(info.bloqueadoAte);
}

function registrarFalhaLogin(email){
  const key = chaveTentativasLogin(email);
  const info = obterControleTentativas(email);
  const tentativas = Number(info.tentativas || 0) + 1;
  const novo = { tentativas, atualizadoEm: Date.now() };
  if(tentativas >= SECURITY_CONFIG.maxTentativasLogin){
    novo.bloqueadoAte = Date.now() + SECURITY_CONFIG.bloqueioMinutos * 60 * 1000;
  }
  localStorage.setItem(key, JSON.stringify(novo));
  return novo;
}

function limparFalhasLogin(email){ localStorage.removeItem(chaveTentativasLogin(email)); }

function toggleVisibilidadeSenha(inputId, btn){
  const input = $(inputId);
  if(!input) return;
  const mostrar = input.type === "password";
  input.type = mostrar ? "text" : "password";
  if(btn){
    btn.classList.toggle("active", mostrar);
    btn.textContent = mostrar ? "🙈" : "👁️";
  }
}

function solicitarResetSenha(){
  const box = $("resetSenhaBox");
  if(!box) return enviarResetSenha();
  const loginEmail = emailNormalizado($("contaLoginEmail")?.value || "");
  if($("contaResetEmail") && loginEmail) $("contaResetEmail").value = loginEmail;
  box.classList.remove("hidden");
  setTimeout(()=>$("contaResetEmail")?.focus(), 50);
}

function cancelarResetSenha(){
  if($("resetSenhaBox")) $("resetSenhaBox").classList.add("hidden");
}

function entrarComGoogle(){
  mostrarStatusConta("warning", "Login com Google foi removido nesta versão básica. Use criar conta com e-mail e senha.");
}

async function enviarResetSenha(){
  const email = emailNormalizado($("contaResetEmail")?.value || $("contaLoginEmail")?.value || "");
  const novaSenha = $("contaResetNovaSenha")?.value || "";
  const confirmar = $("contaResetConfirmarSenha")?.value || "";
  if(!email || !email.includes("@")) return mostrarStatusConta("error", "Informe o e-mail da conta.");
  if(!senhaEhForte(novaSenha)) return mostrarStatusConta("error", `A nova senha precisa ter pelo menos ${SECURITY_CONFIG.minSenha} caracteres.`);
  if(novaSenha !== confirmar) return mostrarStatusConta("error", "As senhas não conferem.");

  const contas = carregarContasLocais();
  const idx = contas.findIndex(c => emailNormalizado(c.email) === email);
  if(idx < 0) return mostrarStatusConta("error", "Não existe conta local com esse e-mail neste navegador.");

  contas[idx].senhaHash = await hashSenhaLocal(novaSenha);
  contas[idx].senhaAtualizadaEm = new Date().toISOString();
  salvarContasLocais(contas);
  limparFalhasLogin(email);
  if($("contaLoginEmail")) $("contaLoginEmail").value = email;
  if($("contaLoginSenha")) $("contaLoginSenha").value = "";
  if($("contaResetNovaSenha")) $("contaResetNovaSenha").value = "";
  if($("contaResetConfirmarSenha")) $("contaResetConfirmarSenha").value = "";
  cancelarResetSenha();
  alternarTelaConta("login");
  mostrarStatusConta("success", "✅ Senha redefinida neste navegador. Agora entre com a nova senha.");
}

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
  atualizarRegrasSenha();
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
  if(!senhaEhForte(senha)) return mostrarStatusConta("error", `Use uma senha com pelo menos ${SECURITY_CONFIG.minSenha} caracteres.`);
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
    criadoEm: new Date().toISOString(),
    acl: ["cotacao:manual", "perfil:editar", "historico:ver"]
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
  if(loginEstaBloqueado(email)) return mostrarStatusConta("error", `Muitas tentativas. Aguarde ${SECURITY_CONFIG.bloqueioMinutos} minutos e tente novamente.`);

  const contas = carregarContasLocais();
  const conta = contas.find(c => emailNormalizado(c.email) === email);
  if(!conta){
    if($("contaCadastroEmail")) $("contaCadastroEmail").value = email;
    alternarTelaConta("cadastro");
    return mostrarStatusConta("warning", "Esse usuário ainda não existe neste navegador. Crie a conta para esse e-mail.");
  }
  const hash = await hashSenhaLocal(senha);
  if(hash !== conta.senhaHash){
    const falha = registrarFalhaLogin(email);
    if(falha.bloqueadoAte) return mostrarStatusConta("error", `Senha incorreta. Login bloqueado por ${SECURITY_CONFIG.bloqueioMinutos} minutos.`);
    return mostrarStatusConta("error", "Senha incorreta.");
  }
  limparFalhasLogin(email);
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
  preencherPerfilRapido();
}

function preencherPerfilRapido(){
  const foto = usuarioAtual.foto || avatarPadraoUsuario(usuarioAtual.nome || "Administrador");
  if($("perfilRapidoFotoPreview")) $("perfilRapidoFotoPreview").src = foto;
  if($("perfilRapidoLogoPreview")) $("perfilRapidoLogoPreview").src = perfilEmpresa.logo || montarCaminhosImagem("isis.png")[0] || "";
  if($("perfilRapidoUsuarioNome")) $("perfilRapidoUsuarioNome").value = usuarioAtual.nome || "";
  if($("perfilRapidoUsuarioCargo")) $("perfilRapidoUsuarioCargo").value = usuarioAtual.cargo || "";
  if($("perfilRapidoEmpresaNome")) $("perfilRapidoEmpresaNome").value = perfilEmpresa.nome || "";
  if($("perfilRapidoEmpresaSlogan")) $("perfilRapidoEmpresaSlogan").value = perfilEmpresa.slogan || "";
  if($("perfilRapidoEmpresaEmail")) $("perfilRapidoEmpresaEmail").value = perfilEmpresa.email || "";
  if($("perfilRapidoEmpresaWhatsapp")) $("perfilRapidoEmpresaWhatsapp").value = perfilEmpresa.whatsapp || "";
  if($("perfilRapidoEmpresaCor")) $("perfilRapidoEmpresaCor").value = normalizarHex(perfilEmpresa.cor || corAtual);
}

function abrirPerfilRapido(){
  preencherPerfilRapido();
  if($("perfilRapidoBackdrop")) $("perfilRapidoBackdrop").classList.add("active");
}

function fecharPerfilRapido(ev){
  if(ev && ev.target && ev.currentTarget && ev.target !== ev.currentTarget) return;
  if($("perfilRapidoBackdrop")) $("perfilRapidoBackdrop").classList.remove("active");
}

async function lidarUploadFotoPerfilRapido(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")) return;
  usuarioAtual.foto = await otimizarImagemParaBase64(file, 700, 0.86);
  salvarUsuarioAtual();
  if(firebaseAuthCotamiles?.currentUser){
    await firebaseAuthCotamiles.currentUser.updateProfile({ photoURL: usuarioAtual.foto }).catch(()=>{});
    salvarPerfilFirebase().catch(()=>{});
  }
  atualizarTopoUsuario();
}

async function lidarUploadLogoPerfilRapido(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")) return;
  perfilEmpresa.logo = await otimizarImagemParaBase64(file, 900, 0.86);
  persistirPerfilEmpresa();
  preencherFormularioPerfilEmpresa();
  atualizarTopoUsuario();
  atualizarPreview();
  if($("perfilRapidoStatus")) $("perfilRapidoStatus").innerHTML = alertHtml("success", "✅ Logo da empresa atualizada. Ela já aparecerá no PDF.");
}

function salvarPerfilRapido(){
  usuarioAtual.nome = ($("perfilRapidoUsuarioNome")?.value || usuarioAtual.nome || "Administrador").trim();
  usuarioAtual.cargo = ($("perfilRapidoUsuarioCargo")?.value || usuarioAtual.cargo || "Administrador").trim();
  salvarUsuarioAtual();
  if(firebaseAuthCotamiles?.currentUser){
    firebaseAuthCotamiles.currentUser.updateProfile({ displayName: usuarioAtual.nome, photoURL: usuarioAtual.foto || "" }).catch(()=>{});
  }

  perfilEmpresa.nome = ($("perfilRapidoEmpresaNome")?.value || perfilEmpresa.nome || "Cotamiles").trim();
  perfilEmpresa.slogan = ($("perfilRapidoEmpresaSlogan")?.value || "").trim();
  perfilEmpresa.email = ($("perfilRapidoEmpresaEmail")?.value || "").trim();
  perfilEmpresa.whatsapp = ($("perfilRapidoEmpresaWhatsapp")?.value || "").trim();
  perfilEmpresa.cor = normalizarHex($("perfilRapidoEmpresaCor")?.value || perfilEmpresa.cor || corAtual);
  persistirPerfilEmpresa();
  mudarCor(perfilEmpresa.cor);
  preencherFormularioPerfilEmpresa();
  atualizarTopoUsuario();
  atualizarPreview();
  if($("perfilRapidoStatus")) $("perfilRapidoStatus").innerHTML = alertHtml("success", "✅ Perfil salvo. O nome da empresa já será usado no PDF.");
  setTimeout(()=>{ fecharPerfilRapido(); if($("perfilRapidoStatus")) $("perfilRapidoStatus").innerHTML = ""; }, 900);
}

function atualizarTelaLoginApp(){
  const ativo = existeSessaoAtiva();
  if($("loginPage")) $("loginPage").classList.toggle("hidden", ativo);
  if($("appShell")) $("appShell").classList.toggle("hidden", !ativo);
  if($("firebaseLoginStatus")){
    $("firebaseLoginStatus").textContent = "🔐 Login básico local";
    $("firebaseLoginStatus").className = "firebase-status-badge is-ok";
  }
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
  if($("perfilRapidoFotoInput")) $("perfilRapidoFotoInput").addEventListener("change", lidarUploadFotoPerfilRapido);
  if($("perfilRapidoLogoInput")) $("perfilRapidoLogoInput").addEventListener("change", lidarUploadLogoPerfilRapido);
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

function minutosDoHorario(valor){
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})$/);
  if(!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if(h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function calcularDuracaoTrecho(prefixo, atualizar=true){
  const partidaEl = $(`horaPartida_${prefixo}`);
  const chegadaEl = $(`horaChegada_${prefixo}`);
  const diasEl = $(`diaSeguinte_${prefixo}`);
  const horasEl = $(`duracaoHoras_${prefixo}`);
  const minEl = $(`duracaoMin_${prefixo}`);

  const partida = minutosDoHorario(partidaEl?.value || "");
  const chegada = minutosDoHorario(chegadaEl?.value || "");

  if(partida === null || chegada === null){
    if(atualizar) atualizarPreview();
    return;
  }

  let dias = parseInt(diasEl?.value || "0", 10) || 0;

  // Se a chegada for menor que a partida, considera automaticamente chegada no dia seguinte.
  if(chegada < partida && dias === 0){
    dias = 1;
    if(diasEl) diasEl.value = "1";
  }

  let totalMinutos = (chegada + (dias * 24 * 60)) - partida;
  if(totalMinutos < 0) totalMinutos = 0;

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  if(horasEl) horasEl.value = String(horas);
  if(minEl) minEl.value = String(minutos);

  if(atualizar) atualizarPreview();
}

function calcularDuracaoTrechosAtivos(){
  const tipo = $("tipoViagem")?.value || "ida";
  const incluirVooInterno = $("incluirVooInterno")?.checked || false;
  obterPrefixosAtivosViagem(tipo, incluirVooInterno).forEach(prefixo => calcularDuracaoTrecho(prefixo, false));
}

function formatarLocalizadorValor(valor){
  return String(valor || "").toUpperCase().replace(/[^A-Z0-9\/\-]/g, "").slice(0, 40);
}
function formatarLocalizadorInput(input){
  if(!input) return;
  input.value = formatarLocalizadorValor(input.value);
}
function obterNomeTrecho(prefixo, fallback="Trecho"){
  if(String(prefixo || "").startsWith("t")){
    const id = parseInt(String(prefixo).slice(1));
    const trecho = trechosMult.find(t => t.id === id);
    return trecho?.nome || fallback || `Trecho ${id}`;
  }
  const el = $(`nomeTrecho_${prefixo}`);
  return (el?.value || fallback || "Trecho").trim();
}
function obterLocalizadorTrecho(prefixo){
  return formatarLocalizadorValor($(`localizador_${prefixo}`)?.value || "");
}
function formatarNumeroVooValor(valor){
  let v = String(valor || "").trim().replace(/\s+/g, " ");
  if(!v) return "";
  v = v.toUpperCase().replace(/[^A-Z0-9\s\-]/g, "").trim();
  v = v.replace(/^VOO\s*/i, "").trim();
  return v ? `Voo ${v}` : "";
}
function formatarNumeroVooInput(input){
  if(!input) return;
  input.value = String(input.value || "").toUpperCase().replace(/[^A-Z0-9\s\-]/g, "").replace(/\s+/g, " ").slice(0, 30);
}
function obterNumeroVooTrecho(prefixo){
  return formatarNumeroVooValor($(`numeroVoo_${prefixo}`)?.value || "");
}
function obterPrefixosAtivosViagem(tipo, incluirVooInterno){
  if(tipo === "ida") return ["ida"];
  if(tipo === "idaVolta") return ["ida", ...(incluirVooInterno ? ["interno"] : []), "volta"];
  if(tipo === "multitrecho") return trechosMult.map(t => `t${t.id}`);
  return [];
}
function tituloDoPrefixo(prefixo){
  if(prefixo === "ida") return obterNomeTrecho("ida", "Ida");
  if(prefixo === "volta") return obterNomeTrecho("volta", "Volta");
  if(prefixo === "interno") return obterNomeTrecho("interno", "Voo Interno");
  if(String(prefixo).startsWith("t")){
    const id = parseInt(String(prefixo).slice(1));
    const trecho = trechosMult.find(t => t.id === id);
    return trecho?.nome || `Trecho ${id}`;
  }
  return "Trecho";
}
function gerarResumoLocalizadores(prefixos){
  const geral = formatarLocalizadorValor($("localizador")?.value || "");
  if(geral) return geral;
  const itens = (prefixos || [])
    .map(prefixo => obterLocalizadorTrecho(prefixo))
    .filter(Boolean);
  if(!itens.length) return "";
  // No localizador grande do topo, mostra somente os códigos, sem “Ida/Volta”.
  return itens.join("/");
}

// ==================== RENDERIZAR FORMULÁRIO DE VOO ====================
function renderizarFormVoo(p){
  return `<div class="row-3"><div class="form-group"><label>Localizador do trecho (opcional)</label><input type="text" id="localizador_${p}" placeholder="Ex: CURBHS" maxlength="30" oninput="formatarLocalizadorInput(this); atualizarPreview()"></div><div class="form-group"><label>Número do voo (opcional)</label><input type="text" id="numeroVoo_${p}" placeholder="Ex: voo LA3456" maxlength="30" oninput="formatarNumeroVooInput(this); atualizarPreview()"></div><div class="form-group"><label>Companhia</label><select id="companhia_${p}" onchange="atualizarPreview()">${gerarOptionsCompanhias()}</select></div></div>
    <div class="form-group"><label>Data</label><input type="date" id="data_${p}" onchange="atualizarPreview()"></div>
    <div class="row-2"><div class="form-group"><label>Origem</label><input type="text" id="origem_${p}" placeholder="FOR" maxlength="3" list="listaAeroportosBR" oninput="handleIataInput('origem_${p}','cidadeOrigem_${p}')"></div><div class="form-group"><label>Cidade Origem</label><input type="text" id="cidadeOrigem_${p}" onchange="atualizarPreview()"></div></div>
    <div class="row-2"><div class="form-group"><label>Destino</label><input type="text" id="destino_${p}" placeholder="GRU" maxlength="3" list="listaAeroportosBR" oninput="handleIataInput('destino_${p}','cidadeDestino_${p}')"></div><div class="form-group"><label>Cidade Destino</label><input type="text" id="cidadeDestino_${p}" onchange="atualizarPreview()"></div></div>
    <div class="row-3"><div class="form-group"><label>Partida</label><input type="time" id="horaPartida_${p}" oninput="calcularDuracaoTrecho('${p}')" onchange="calcularDuracaoTrecho('${p}')"></div><div class="form-group"><label>Chegada</label><input type="time" id="horaChegada_${p}" oninput="calcularDuracaoTrecho('${p}')" onchange="calcularDuracaoTrecho('${p}')"></div><div class="form-group"><label>+ dias</label><select id="diaSeguinte_${p}" onchange="calcularDuracaoTrecho('${p}')"><option value="0">Não</option><option value="1">+1</option><option value="2">+2</option></select></div></div>
    <div class="row-3"><div class="form-group"><label>Tipo de Voo</label><select id="tipoVoo_${p}" onchange="atualizarCamposParadas('${p}'); atualizarPreview()"><option value="Direto">Direto</option><option value="1 parada">1 parada</option><option value="2 paradas">2 paradas</option><option value="3 paradas">3 paradas</option><option value="4 paradas">4 paradas</option></select></div><div class="form-group"><label>Classe</label><select id="classe_${p}" onchange="atualizarPreview()"><option value="Econômica">Econômica</option><option value="Econômica Premium">Econômica Premium</option><option value="Classe Executiva">Classe Executiva</option><option value="Primeira Classe">Primeira Classe</option></select></div><div class="form-group"><label>Duração Total</label><div class="row-2"><input type="number" id="duracaoHoras_${p}" placeholder="h" min="0" oninput="atualizarPreview()" onchange="atualizarPreview()"><input type="number" id="duracaoMin_${p}" placeholder="min" min="0" oninput="atualizarPreview()" onchange="atualizarPreview()"></div></div></div>
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
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
        <label class="eye-toggle-row" style="padding:6px 8px;font-size:10px;"><input type="checkbox" id="mostrarTrecho_t${id}" checked onchange="toggleOcultarTrechoPDF('t${id}', !this.checked)"> 👁️ PDF</label>
        ${id > 2 ? `<button class="btn-remove-trecho" onclick="removerTrecho(${id})">Remover</button>` : '<span style="font-size:10px;color:#6c757d;">Padrão</span>'}
      </div>
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
  trechosMult.forEach(t => sincronizarCheckboxTrechoPDF(`t${t.id}`));
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
  trechosOcultosPDF.delete(`t${id}`);
  trechosOcultosPreview.delete(`t${id}`);
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
function syncPaxManual(){
  if($("adultos") && $("adultosManual")) $("adultos").value=$("adultosManual").value;
  if($("criancas") && $("criancasManual")) $("criancas").value=$("criancasManual").value;
  if($("bebes") && $("bebesManual")) $("bebes").value=$("bebesManual").value;
}
function syncPaxBusca(){
  if($("adultosManual") && $("adultos")) $("adultosManual").value=$("adultos").value;
  if($("criancasManual") && $("criancas")) $("criancasManual").value=$("criancas").value;
  if($("bebesManual") && $("bebes")) $("bebesManual").value=$("bebes").value;
}

// ==================== AMADEUS ====================
async function testarAmadeus(){
  if($("amadeusStatus")) $("amadeusStatus").innerHTML = alertHtml("info", "Cotação automatizada em desenvolvimento. Amadeus/API desativado por enquanto.");
}

async function buscarVoosAmadeus(){
  syncPaxBusca();
  let o=$("buscaOrigem").value.trim().toUpperCase(), d=$("buscaDestino").value.trim().toUpperCase(), di=$("buscaDataIda").value, dv=$("buscaDataVolta").value;
  if(!o||!d||!di){ $("resultadoAmadeus").innerHTML=alertHtml("warning","Preencha origem, destino e data de ida"); return; }
  $("resultadoAmadeus").innerHTML=alertHtml("info","Cotação automatizada em desenvolvimento. Use a cotação manual por enquanto."); return;
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
  if(trechosOcultosPDF.has(prefixo)){
    return `<div class="flight-card trecho-hidden-pdf no-print" data-preview-prefixo="${escapeAttr(prefixo)}"><div class="flight-header"><span class="flight-type">${escapeHtml(titulo)}</span><span class="flight-date">Oculto no PDF</span>${botoesPreviewTrecho(prefixo, titulo)}</div></div>`;
  }
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
  let numeroVooTrecho = obterNumeroVooTrecho(prefixo);
  let localizadorTrecho = obterLocalizadorTrecho(prefixo);
  let vooBadge = numeroVooTrecho ? `<span class="trecho-voo-badge">${escapeHtml(numeroVooTrecho)}</span>` : "";
  let locBadge = localizadorTrecho ? `<span class="trecho-locator-badge">${escapeHtml(localizadorTrecho)}</span>` : "";
  let logo = getCompanhiaImg(companhia);
  let chegadaDisplay = diaSeg > 0 ? `${horaChegada} <span style="color:#e74c3c;">+${diaSeg}</span>` : horaChegada;
  let oculto = trechosOcultosPreview.has(prefixo);
  let classeOculto = oculto ? " mobile-collapsed" : "";
  let ferramentas = botoesPreviewTrecho(prefixo, titulo);
  
  if(!origem && !destino && !data){
    return `<div class="flight-card mobile-editable${classeOculto}" data-preview-prefixo="${escapeAttr(prefixo)}"><div class="flight-header"><span class="flight-type">${escapeHtml(titulo)}</span><span class="flight-date">—</span>${ferramentas}</div><div class="mobile-card-content"><div style="text-align:center;color:#6c757d;padding:15px;">✏️ Preencha os dados</div></div></div>`;
  }
  
  return `<div class="flight-card mobile-editable${classeOculto}" data-preview-prefixo="${escapeAttr(prefixo)}"><div class="flight-header"><span class="flight-type">${escapeHtml(titulo)}</span><span class="flight-date">${formatarDataCurta(data) || "—"}</span>${ferramentas}</div><div class="mobile-card-content"><div class="route-main"><div class="airport-origin"><div class="airport-code">${origem || "?"}</div><div class="airport-city">${cidadeOrigem || "—"}</div></div><div class="flight-connection">${gerarSetaParadasHTML(prefixo, tipoVoo)}</div><div class="airport-destination"><div class="airport-code">${destino || "?"}</div><div class="airport-city">${cidadeDestino || "—"}</div></div></div><div class="schedule-row"><div class="time-point"><div class="time-value">${horaPartida || "—"}</div><div class="time-label">Partida</div></div><div class="duration-middle"><div class="duration-value">${formatarDuracao(duracaoH, duracaoM)}</div><div class="duration-label">Duração</div></div><div class="time-point"><div class="time-value">${chegadaDisplay || "—"}</div><div class="time-label">Chegada</div></div></div><div class="flight-footer"><div class="airline-info">${logo ? `<img class="airline-logo-small" ${imgAttrs(logo)}>` : ""}<span>${companhia || "Companhia"}</span>${vooBadge}${locBadge}</div>${classe ? `<div class="classe-info">${classe}</div>` : ""}</div>${gerarInfoParadasHTML(prefixo)}${gerarBagagensHTML(prefixo, titulo)}</div></div>`;
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


// ==================== PREVIEW INTERATIVO NO CELULAR ====================
function garantirPreviewEditor(){
  let modal = document.getElementById("previewEditorBackdrop");
  if(modal) return modal;
  modal = document.createElement("div");
  modal.id = "previewEditorBackdrop";
  modal.className = "preview-editor-backdrop";
  modal.innerHTML = `
    <div class="preview-editor-sheet" role="dialog" aria-modal="true" aria-label="Editar preview">
      <div class="preview-editor-handle"></div>
      <div class="preview-editor-top">
        <div>
          <div class="preview-editor-kicker">Edição rápida</div>
          <h3 id="previewEditorTitle">Editar</h3>
        </div>
        <button type="button" class="preview-editor-close" onclick="fecharEditorPreview()">×</button>
      </div>
      <div id="previewEditorBody" class="preview-editor-body"></div>
      <div class="preview-editor-actions">
        <button type="button" class="btn-secondary" onclick="fecharEditorPreview()">Cancelar</button>
        <button type="button" class="btn-generate" id="previewEditorSaveBtn">Salvar alterações</button>
      </div>
    </div>`;
  modal.addEventListener("click", (e)=>{ if(e.target === modal) fecharEditorPreview(); });
  document.body.appendChild(modal);
  return modal;
}

function fecharEditorPreview(){
  let modal = document.getElementById("previewEditorBackdrop");
  if(modal) modal.classList.remove("active");
}

function opcoesSelectDoCampo(id, fallback=[]){
  const el = $(id);
  if(el && el.tagName === "SELECT"){
    return [...el.options].map(o => ({ value:o.value, label:o.textContent }));
  }
  return fallback;
}

function campoEditorHTML(campo){
  const el = $(campo.id);
  const valor = el ? (el.type === "checkbox" ? el.checked : el.value) : (campo.value || "");
  const label = escapeHtml(campo.label || campo.id);
  const tipo = campo.type || (el?.tagName === "SELECT" ? "select" : (el?.type || "text"));
  const extraClass = campo.full ? " preview-field-full" : "";
  const attrs = `data-target-id="${escapeAttr(campo.id)}" ${campo.prefixo ? `data-prefixo="${escapeAttr(campo.prefixo)}"` : ""}`;

  if(tipo === "select"){
    const opts = campo.options || opcoesSelectDoCampo(campo.id);
    return `<label class="preview-field${extraClass}"><span>${label}</span><select ${attrs} ${campo.onchange || ""}>${opts.map(o => `<option value="${escapeAttr(o.value)}" ${String(o.value) === String(valor) ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select></label>`;
  }
  if(tipo === "textarea"){
    return `<label class="preview-field preview-field-full"><span>${label}</span><textarea rows="3" ${attrs}>${escapeHtml(valor || "")}</textarea></label>`;
  }
  if(tipo === "checkbox"){
    return `<label class="preview-field preview-field-check preview-field-full"><input type="checkbox" ${attrs} ${valor ? "checked" : ""}><span>${label}</span></label>`;
  }
  return `<label class="preview-field${extraClass}"><span>${label}</span><input type="${escapeAttr(tipo)}" value="${escapeAttr(valor || "")}" ${campo.maxlength ? `maxlength="${campo.maxlength}"` : ""} ${campo.min !== undefined ? `min="${campo.min}"` : ""} ${campo.placeholder ? `placeholder="${escapeAttr(campo.placeholder)}"` : ""} ${campo.list ? `list="${escapeAttr(campo.list)}"` : ""} ${attrs}></label>`;
}

function getTituloPrefixo(prefixo, fallback){
  if(prefixo === "ida") return obterNomeTrecho("ida", "Ida");
  if(prefixo === "volta") return obterNomeTrecho("volta", "Volta");
  if(prefixo === "interno") return obterNomeTrecho("interno", "Voo Interno");
  if(String(prefixo).startsWith("t")){
    const id = parseInt(String(prefixo).slice(1));
    const trecho = trechosMult.find(t => t.id === id);
    return trecho?.nome || fallback || `Trecho ${id}`;
  }
  return fallback || "Trecho";
}

function previewEditorAtualizarParadas(prefixo, valorTipo){
  const modal = document.getElementById("previewEditorBackdrop");
  if(!modal) return;
  const match = String(valorTipo || "Direto").match(/(\d+)/);
  const qtd = Math.min(4, Math.max(0, match ? parseInt(match[1]) : 0));
  modal.querySelectorAll(`[data-preview-parada-prefixo="${CSS.escape(prefixo)}"]`).forEach(card => {
    const n = parseInt(card.dataset.previewParadaNumero || "0");
    card.classList.toggle("hidden", n > qtd);
  });
}

function montarCamposTrechoPreview(prefixo){
  const campos = [];
  const idTrecho = String(prefixo).startsWith("t") ? parseInt(String(prefixo).slice(1)) : null;
  if(idTrecho) campos.push({ id:`nomeTrecho_${idTrecho}`, label:"Nome do trecho", type:"text", full:true });
  else campos.push({ id:`nomeTrecho_${prefixo}`, label:"Nome do trecho", type:"text", full:true });
  campos.push(
    { id:`localizador_${prefixo}`, label:"Localizador do trecho", type:"text", maxlength:30, full:true },
    { id:`numeroVoo_${prefixo}`, label:"Número do voo", type:"text", maxlength:30, placeholder:"voo LA3456" },
    { id:`data_${prefixo}`, label:"Data", type:"date" },
    { id:`companhia_${prefixo}`, label:"Companhia", type:"select", options: opcoesSelectDoCampo(`companhia_${prefixo}`), full:true },
    { id:`origem_${prefixo}`, label:"Origem", type:"text", maxlength:3, list:"listaAeroportosBR", placeholder:"FOR" },
    { id:`cidadeOrigem_${prefixo}`, label:"Cidade origem", type:"text" },
    { id:`destino_${prefixo}`, label:"Destino", type:"text", maxlength:3, list:"listaAeroportosBR", placeholder:"GRU" },
    { id:`cidadeDestino_${prefixo}`, label:"Cidade destino", type:"text" },
    { id:`horaPartida_${prefixo}`, label:"Partida", type:"time" },
    { id:`horaChegada_${prefixo}`, label:"Chegada", type:"time" },
    { id:`diaSeguinte_${prefixo}`, label:"+ dias", type:"select", options: opcoesSelectDoCampo(`diaSeguinte_${prefixo}`) },
    { id:`tipoVoo_${prefixo}`, label:"Tipo de voo", type:"select", options: opcoesSelectDoCampo(`tipoVoo_${prefixo}`), onchange:`onchange="previewEditorAtualizarParadas('${prefixo}', this.value)"` },
    { id:`classe_${prefixo}`, label:"Classe", type:"select", options: opcoesSelectDoCampo(`classe_${prefixo}`) },
    { id:`duracaoHoras_${prefixo}`, label:"Duração h", type:"number", min:0 },
    { id:`duracaoMin_${prefixo}`, label:"Duração min", type:"number", min:0 },
    { id:`bagItem_${prefixo}`, label:"Bolsa 10kg", type:"number", min:1 },
    { id:`bagMao_${prefixo}`, label:"Mala 12kg", type:"number", min:1 },
    { id:`bagDesp_${prefixo}`, label:"Despachada 23kg", type:"number", min:0 }
  );
  return campos;
}

function montarParadasEditor(prefixo){
  let html = `<div class="preview-field-full preview-editor-subtitle">Paradas e tempo de espera</div>`;
  for(let i=1; i<=4; i++){
    html += `<div class="preview-parada-card" data-preview-parada-prefixo="${escapeAttr(prefixo)}" data-preview-parada-numero="${i}">
      <strong>Parada ${i}</strong>
      <div class="preview-editor-grid mini">
        ${campoEditorHTML({ id:`parada${i}_${prefixo}`, label:"Aeroporto", type:"text", maxlength:3, list:"listaAeroportosBR", placeholder:"BSB" })}
        ${campoEditorHTML({ id:`parada${i}h_${prefixo}`, label:"h", type:"number", min:0 })}
        ${campoEditorHTML({ id:`parada${i}m_${prefixo}`, label:"min", type:"number", min:0 })}
      </div>
    </div>`;
  }
  return html;
}

function abrirEditorTrechoPreview(prefixo, titulo){
  const modal = garantirPreviewEditor();
  const nome = getTituloPrefixo(prefixo, titulo);
  $("previewEditorTitle").textContent = `Editar ${nome}`;
  const campos = montarCamposTrechoPreview(prefixo);
  $("previewEditorBody").innerHTML = `<div class="preview-editor-grid">${campos.map(campoEditorHTML).join("")}${montarParadasEditor(prefixo)}</div>`;
  $("previewEditorSaveBtn").onclick = () => salvarEditorPreview("trecho", prefixo);
  modal.classList.add("active");
  const tipoAtual = $(`tipoVoo_${prefixo}`)?.value || "Direto";
  previewEditorAtualizarParadas(prefixo, tipoAtual);
}

function abrirEditorGeralPreview(tipo){
  const modal = garantirPreviewEditor();
  let titulo = "Editar informações";
  let campos = [];
  let extra = "";

  if(tipo === "info"){
    titulo = "Editar dados gerais";
    campos = [
      { id:"cliente", label:"Cliente", type:"text" },
      { id:"cotacao", label:"Nome da cotação", type:"text" },
      { id:"tipoViagem", label:"Tipo de viagem", type:"select", options: opcoesSelectDoCampo("tipoViagem"), full:true },
      { id:"incluirVooInterno", label:"Incluir voo interno", type:"checkbox" },
      { id:"nomeGrupo", label:"Nome do grupo/time", type:"text", full:true }
    ];
  } else if(tipo === "passageiros"){
    titulo = "Editar passageiros";
    campos = [
      { id:"adultosManual", label:"Adultos", type:"number", min:0 },
      { id:"criancasManual", label:"Crianças", type:"number", min:0 },
      { id:"bebesManual", label:"Bebês", type:"number", min:0 },
      { id:"petsManual", label:"Pets", type:"number", min:0 }
    ];
    const nomes = [...document.querySelectorAll(".nomePassageiroInput")].map(input => ({ id:input.id, label:input.dataset.tipo || "Nome", type:"text", full:true }));
    if(nomes.length){
      extra = `<div class="preview-field-full preview-editor-subtitle">Nomes opcionais</div>${nomes.map(campoEditorHTML).join("")}`;
    }
  } else if(tipo === "valores"){
    titulo = "Editar valores";
    campos = [
      { id:"mostrarPagamento", label:"Mostrar pagamento no PDF", type:"checkbox" },
      { id:"valorOriginal", label:"Valor original / De", type:"text" },
      { id:"valorPromocional", label:"Valor no Pix / Por", type:"text" },
      { id:"parcelasCartao", label:"Parcelas no cartão", type:"number", min:1 },
      { id:"valorParcelaCartao", label:"Valor de cada parcela", type:"text" },
      { id:"observacoes", label:"Observações", type:"textarea", full:true }
    ];
  } else if(tipo === "tema"){
    titulo = "Editar tema";
    campos = [
      { id:"corPersonalizada", label:"Cor do PDF", type:"color" },
      { id:"corHex", label:"Código da cor", type:"text" }
    ];
  }

  $("previewEditorTitle").textContent = titulo;
  $("previewEditorBody").innerHTML = `<div class="preview-editor-grid">${campos.map(campoEditorHTML).join("")}${extra}</div>`;
  $("previewEditorSaveBtn").onclick = () => salvarEditorPreview(tipo, "");
  modal.classList.add("active");
}

function salvarEditorPreview(tipo, prefixo){
  const modal = document.getElementById("previewEditorBackdrop");
  if(!modal) return;
  const campos = [...modal.querySelectorAll("[data-target-id]")];

  campos.forEach(input => {
    const id = input.dataset.targetId;
    const alvo = $(id);
    if(!alvo) return;
    let valor = input.type === "checkbox" ? input.checked : input.value;
    if(input.type === "text" && /^(origem|destino|parada\d)_/.test(id)) valor = String(valor || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0,3);
    if(input.type === "checkbox") alvo.checked = !!valor;
    else alvo.value = valor;
  });

  // Preenche automaticamente cidades quando um código IATA conhecido for editado no preview.
  campos.forEach(input => {
    const id = input.dataset.targetId || "";
    const m = id.match(/^(origem|destino)_(.+)$/);
    if(m){
      const prefixoCampo = m[2];
      const cidadeId = m[1] === "origem" ? `cidadeOrigem_${prefixoCampo}` : `cidadeDestino_${prefixoCampo}`;
      const cidade = getCidadeAeroporto($(id)?.value || "");
      const cidadeEl = $(cidadeId);
      if(cidade && cidadeEl && !modal.querySelector(`[data-target-id="${CSS.escape(cidadeId)}"]`)?.value) cidadeEl.value = cidade;
    }
  });

  if(tipo === "tema"){
    const cor = $("corHex")?.value || $("corPersonalizada")?.value || corAtual;
    mudarCor(cor);
  }
  if(tipo === "info"){
    atualizarVisibilidadeSecoes();
    if($("nomeGrupo")) nomeGrupoAtual = $("nomeGrupo").value;
    if($("incluirVooInterno")) toggleVooInterno();
  }
  if(tipo === "passageiros"){
    syncPaxManual();
    renderizarCamposPassageiros();
  }
  if(tipo === "trecho"){
    if(String(prefixo).startsWith("t")){
      const idTrecho = parseInt(String(prefixo).slice(1));
      const trecho = trechosMult.find(t => t.id === idTrecho);
      if(trecho && $(`nomeTrecho_${idTrecho}`)) trecho.nome = $(`nomeTrecho_${idTrecho}`).value || `Trecho ${idTrecho}`;
    }
    // Não recalcula a duração aqui para permitir ajuste manual em caso de fuso horário.
    normalizarBagagens(prefixo);
    atualizarCamposParadas(prefixo);
  }

  atualizarTodosCamposParadas();
  atualizarPreview();
  fecharEditorPreview();
}

function toggleOcultarTrechoPreview(prefixo){
  if(trechosOcultosPreview.has(prefixo)) trechosOcultosPreview.delete(prefixo);
  else trechosOcultosPreview.add(prefixo);
  atualizarPreview();
}

function sincronizarCheckboxTrechoPDF(prefixo){
  const cb = $(`mostrarTrecho_${prefixo}`);
  if(cb) cb.checked = !trechosOcultosPDF.has(prefixo);
}
function toggleOcultarTrechoPDF(prefixo, forcarOculto){
  const deveOcultar = typeof forcarOculto === "boolean" ? forcarOculto : !trechosOcultosPDF.has(prefixo);
  if(deveOcultar) trechosOcultosPDF.add(prefixo);
  else trechosOcultosPDF.delete(prefixo);
  sincronizarCheckboxTrechoPDF(prefixo);
  atualizarPreview();
}

function toggleMobileConfigPanel(){
  const painel = document.querySelector(".config-panel");
  if(!painel) return;
  painel.classList.toggle("mobile-open");
  if(painel.classList.contains("mobile-open")){
    painel.scrollIntoView({ behavior:"smooth", block:"start" });
  }
}

function botoesPreviewTrecho(prefixo, titulo){
  const oculto = trechosOcultosPreview.has(prefixo);
  const ocultoPDF = trechosOcultosPDF.has(prefixo);
  return `<div class="preview-edit-tools no-print">
    <button type="button" class="preview-edit-btn" onclick="abrirEditorTrechoPreview('${escapeAttr(prefixo)}','${escapeAttr(titulo)}')">✏️ Editar</button>
    <button type="button" class="preview-collapse-btn" onclick="toggleOcultarTrechoPreview('${escapeAttr(prefixo)}')">${oculto ? "👁️ Expandir" : "− Recolher"}</button>
    <button type="button" class="preview-collapse-btn" onclick="toggleOcultarTrechoPDF('${escapeAttr(prefixo)}')">${ocultoPDF ? "👁️ Mostrar PDF" : "🙈 Ocultar PDF"}</button>
  </div>`;
}

function ferramentasGlobaisPreview(){
  return `<div class="preview-global-actions no-print">
    <button type="button" onclick="abrirEditorGeralPreview('info')">📋 Info</button>
    <button type="button" onclick="abrirEditorGeralPreview('passageiros')">👥 Passageiros</button>
    <button type="button" onclick="abrirEditorGeralPreview('valores')">💰 Pagamento</button>
    <button type="button" onclick="togglePagamentoPDF()">👁️ Pagamento PDF</button>
    <button type="button" onclick="abrirEditorGeralPreview('tema')">🎨 Tema</button>
    <button type="button" onclick="toggleMobileConfigPanel()">⚙️ Formulário</button>
  </div>`;
}


function togglePagamentoPDF(){
  const el = $("mostrarPagamento");
  if(!el) return;
  el.checked = !el.checked;
  atualizarPreview();
}

function gerarPagamentoHTML(textoPessoas, valorOrig, valorPix, parcelasCartao, valorParcelaCartao){
  const mostrar = $("mostrarPagamento")?.checked !== false;
  if(!mostrar){
    return `<div class="no-print" style="margin:8px 0;padding:8px 10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:800;">🙈 Pagamento oculto no PDF.</div>`;
  }
  const deHtml = valorOrig && String(valorOrig).trim() ? `<div class="price-original">De: ${escapeHtml(valorOrig)}</div>` : "";
  const pix = String(valorPix || "").trim() || "Consultar";
  const parcelas = Math.max(1, parseInt(parcelasCartao || 1));
  const parcela = String(valorParcelaCartao || "").trim();
  const cartaoHtml = parcela ? `<div class="payment-card-line">cartão por <strong>${parcelas}x de ${escapeHtml(parcela)}</strong></div>` : "";
  const qrHtml = qrcodePixBase64 ? `<div class="payment-qr-box"><img src="${qrcodePixBase64}" alt="QR Code Pix"><span>QR Code Pix</span></div>` : "";
  return `<div class="passengers-info">✈️ Valor referente a <strong>${textoPessoas || "1 adulto"}</strong></div>
    <div class="price-container payment-container">
      <div class="payment-details">
        <div style="font-size:9px;">Valor para ${textoPessoas || "1 adulto"}</div>
        ${deHtml}
        <div class="payment-kicker">Por</div>
        <div class="payment-pix-line">por ${escapeHtml(pix)} <span style="font-size:12px;font-weight:850;">no Pix</span></div>
        ${cartaoHtml}
      </div>
      ${qrHtml}
    </div>`;
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
  let parcelasCartao = $("parcelasCartao")?.value || "";
  let valorParcelaCartao = $("valorParcelaCartao")?.value || "";
  let observacoes = $("observacoes").value;
  let incluirVooInterno = $("incluirVooInterno")?.checked || false;
  
  let textoPessoas = "";
  if(adultos > 0) textoPessoas += adultos + (adultos === 1 ? " adulto" : " adultos");
  if(criancas > 0) textoPessoas += (textoPessoas ? " + " : "") + criancas + (criancas === 1 ? " criança" : " crianças");
  if(bebes > 0) textoPessoas += (textoPessoas ? " + " : "") + bebes + (bebes === 1 ? " bebê" : " bebês");
  if(pets > 0) textoPessoas += (textoPessoas ? " + " : "") + pets + (pets === 1 ? " pet" : " pets");
  
  const prefixosAtivos = obterPrefixosAtivosViagem(tipo, incluirVooInterno);
  let voos = "";
  if(tipo === "ida"){
    voos = gerarCardVoo(obterNomeTrecho("ida", "Ida"), "ida");
  } else if(tipo === "idaVolta"){
    voos = gerarCardVoo(obterNomeTrecho("ida", "Ida"), "ida");
    if(incluirVooInterno) voos += gerarCardVoo(obterNomeTrecho("interno", "Voo Interno"), "interno");
    voos += gerarCardVoo(obterNomeTrecho("volta", "Volta"), "volta");
  } else if(tipo === "multitrecho"){
    trechosMult.forEach(t => { voos += gerarCardTrecho(t); });
  }
  
  // Foto/nome do grupo no topo central do orçamento — solto, sem quadrado branco.
  nomeGrupoAtual = ($("nomeGrupo")?.value || nomeGrupoAtual || "").trim();
  let fotoHtml = clubeFotoBase64 ? `<img class="grupo-top-foto" src="${escapeAttr(clubeFotoBase64)}" alt="Grupo/Clube">` : "";
  let nomeGrupoHtml = nomeGrupoAtual ? `<div class="grupo-top-nome">${escapeHtml(nomeGrupoAtual)}</div>` : "";
  let grupoTopHtml = (fotoHtml || nomeGrupoHtml) ? `<div class="grupo-top-orcamento">${fotoHtml || ""}${nomeGrupoHtml || ""}</div>` : "";
  let observacoesHtml = observacoes ? `<div style="font-size:10px;margin-top:8px;padding:8px 10px;background:#f8f9fa;border-radius:8px;"><strong>📝 Observações:</strong><br>${escapeHtml(observacoes).replace(/\n/g,"<br>")}</div>` : "";
  let totalVoos = Math.max(1, prefixosAtivos.filter(prefixo => !trechosOcultosPDF.has(prefixo)).length);
  let classePdf = totalVoos >= 3 ? "pdf-3" : (totalVoos === 2 ? "pdf-2" : "pdf-1");
  let clienteHtml = cliente && cliente.trim() ? `<div class="pdf-client">Cliente: ${escapeHtml(cliente)}</div>` : "";
  let resumoLocalizadores = gerarResumoLocalizadores(prefixosAtivos);
  // Localizador grande removido do topo: os códigos aparecem somente ao lado da companhia em cada trecho.
  let localizadorHtml = "";
  let passageirosHtml = gerarPassageirosPDF(textoPessoas);
  let pagamentoHtml = gerarPagamentoHTML(textoPessoas, valorOrig, valorPromo, parcelasCartao, valorParcelaCartao);

  let empresaNome = perfilEmpresa.nome || "Cotamiles";
  let empresaSlogan = perfilEmpresa.slogan || "Cotação aérea inteligente ✈️";
  let empresaContato = contatoEmpresaTexto();
  let empresaSub = empresaContato || empresaSlogan;

  const temaPdf = normalizarHex(corAtual || perfilEmpresa.cor || "#008080");

  return `<div class="pdf-preview pdf-reformado ${classePdf}" style="--theme:${escapeAttr(temaPdf)};--theme2:${escapeAttr(temaPdf)};">
    ${ferramentasGlobaisPreview()}
    <div class="pdf-topbar">
      <div class="pdf-brand"><img ${perfilLogoAttrs()}><div><div class="pdf-brand-title">${escapeHtml(empresaNome)}</div><div class="pdf-brand-sub">${escapeHtml(empresaSub)}</div></div></div>
      <div class="pdf-title-box"><div class="pdf-main-title">${escapeHtml(cotacao || "Passagem Aérea")}</div>${clienteHtml}${grupoTopHtml}</div>
      <div class="pdf-topbar-spacer"></div>
    </div>
    <div class="pdf-body">
      ${passageirosHtml}
      <div class="pdf-section-title">Itinerário</div>
      ${voos}
      <div class="benefits-row"><div class="benefit-item">✅ Taxas inclusas</div><div class="benefit-item">✅ Suporte 24h</div><div class="benefit-item">✅ ${empresaNome}</div></div>
      ${pagamentoHtml}
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

  const previewEl = $("previewContainer");
  if(!previewEl){
    alert("Não encontrei o preview para gerar o PDF.");
    return;
  }

  // Gera o PDF somente com o orçamento/preview, sem imprimir perfil, menu, formulário ou o site inteiro.
  const iframeAntigo = document.getElementById("iframeImpressaoPreviewCotamiles");
  if(iframeAntigo) iframeAntigo.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "iframeImpressaoPreviewCotamiles";
  iframe.title = "PDF da cotação";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const estilos = Array.from(document.querySelectorAll("style")).map(s => s.innerHTML).join("\n");
  const baseHref = document.baseURI || window.location.href;
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${escapeAttr(baseHref)}">
  <title>Orçamento</title>
  <style>${estilos}</style>
  <style>
    @page { size:A4; margin:5mm; }
    html, body { background:#fff !important; margin:0 !important; padding:0 !important; width:100% !important; min-height:auto !important; overflow:visible !important; }
    body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .print-preview-wrapper { width:100% !important; margin:0 auto !important; padding:0 !important; background:#fff !important; }
    .no-print, .preview-global-actions, .preview-edit-tools, .preview-editor-backdrop, .tabs, .config-panel, .preview-header, .app-tabs, .perfil-rapido-backdrop { display:none !important; }
    #previewContainer { display:block !important; width:100% !important; padding:0 !important; margin:0 !important; }
    .pdf-preview { margin:0 auto !important; box-shadow:none !important; }
    .pdf-topbar { grid-template-columns:1fr 1.15fr 1fr !important; }
    .pdf-title-box { text-align:center !important; }
    @media print {
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; overflow:visible !important; }
      .print-preview-wrapper, #previewContainer { display:block !important; }
      .no-print, .preview-global-actions, .preview-edit-tools, .preview-editor-backdrop { display:none !important; }
      .pdf-preview { page-break-inside:avoid !important; break-inside:avoid-page !important; page-break-after:avoid !important; break-after:avoid-page !important; }
    }
  </style>
  <script>
    function handleImgError(img){
      var caminhos = String((img && img.dataset && img.dataset.imgPaths) || "").split("||").map(function(v){ return v.trim(); }).filter(Boolean);
      var tentativaAtual = parseInt((img && img.dataset && img.dataset.imgTry) || "0", 10);
      var proximaTentativa = tentativaAtual + 1;
      if(caminhos[proximaTentativa]){
        img.dataset.imgTry = String(proximaTentativa);
        img.src = caminhos[proximaTentativa];
        return;
      }
      if(img) img.style.display = "none";
    }
  <\/script>
</head>
<body class="imprimindo-pdf">
  <div class="print-preview-wrapper">
    <div id="previewContainer">${previewEl.innerHTML}</div>
  </div>
</body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;
  const limpar = () => setTimeout(() => iframe.remove(), 1200);
  const imagens = Array.from(doc.querySelectorAll("img"));
  const aguardarImagens = Promise.race([
    Promise.all(imagens.map(img => {
      if(img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        const encerrar = () => resolve();
        img.addEventListener("load", encerrar, { once:true });
        img.addEventListener("error", encerrar, { once:true });
      });
    })),
    new Promise(resolve => setTimeout(resolve, 4000))
  ]);

  await aguardarImagens;
  setTimeout(() => {
    try{
      win.focus();
      win.print();
    }finally{
      limpar();
    }
  }, 200);
}

// ==================== SALVAR E HISTÓRICO ====================
function tipoViagemLabel(tipo){
  const mapa = { ida:"Só ida", idaVolta:"Ida e volta", multitrecho:"Multitrecho" };
  return mapa[tipo] || tipo || "—";
}

function pegarValorCampo(id, fallback=""){
  const el = $(id);
  if(!el) return fallback;
  if(el.type === "checkbox") return !!el.checked;
  return el.value ?? fallback;
}

function montarTextoPessoasHistorico(totalPax={}){
  const adultos = parseInt(totalPax.adultos || 0) || 0;
  const criancas = parseInt(totalPax.criancas || 0) || 0;
  const bebes = parseInt(totalPax.bebes || 0) || 0;
  const pets = parseInt(totalPax.pets || 0) || 0;
  let texto = "";
  if(adultos > 0) texto += adultos + (adultos === 1 ? " adulto" : " adultos");
  if(criancas > 0) texto += (texto ? " + " : "") + criancas + (criancas === 1 ? " criança" : " crianças");
  if(bebes > 0) texto += (texto ? " + " : "") + bebes + (bebes === 1 ? " bebê" : " bebês");
  if(pets > 0) texto += (texto ? " + " : "") + pets + (pets === 1 ? " pet" : " pets");
  return texto || "—";
}

function coletarParadasHistorico(prefixo){
  const qtd = getNumeroParadas(prefixo);
  const paradas = [];
  for(let i=1; i<=qtd; i++){
    const codigo = String($(`parada${i}_${prefixo}`)?.value || "").trim().toUpperCase();
    const h = Math.max(0, parseInt($(`parada${i}h_${prefixo}`)?.value || 0) || 0);
    const m = Math.max(0, parseInt($(`parada${i}m_${prefixo}`)?.value || 0) || 0);
    if(!codigo && h === 0 && m === 0) continue;
    paradas.push({
      ordem: i,
      codigo: codigo || `Parada ${i}`,
      cidade: codigo ? getCidadeAeroporto(codigo) : "",
      horas: h,
      minutos: m,
      espera: `${h}h${m}min de espera`
    });
  }
  return paradas;
}

function coletarDadosTrechoHistorico(prefixo){
  const origem = String(pegarValorCampo(`origem_${prefixo}`) || "").toUpperCase();
  const destino = String(pegarValorCampo(`destino_${prefixo}`) || "").toUpperCase();
  const companhia = pegarValorCampo(`companhia_${prefixo}`);
  const classe = pegarValorCampo(`classe_${prefixo}`);
  const data = pegarValorCampo(`data_${prefixo}`);
  const numeroVoo = obterNumeroVooTrecho(prefixo);
  const localizador = obterLocalizadorTrecho(prefixo);
  const duracaoH = parseInt(pegarValorCampo(`duracaoHoras_${prefixo}`, 0)) || 0;
  const duracaoM = parseInt(pegarValorCampo(`duracaoMin_${prefixo}`, 0)) || 0;
  const bagItem = parseInt(pegarValorCampo(`bagItem_${prefixo}`, 0)) || 0;
  const bagMao = parseInt(pegarValorCampo(`bagMao_${prefixo}`, 0)) || 0;
  const bagDesp = parseInt(pegarValorCampo(`bagDesp_${prefixo}`, 0)) || 0;
  const diaSeguinte = parseInt(pegarValorCampo(`diaSeguinte_${prefixo}`, 0)) || 0;
  const tipoVoo = pegarValorCampo(`tipoVoo_${prefixo}`, "Direto");
  const paradas = coletarParadasHistorico(prefixo);
  return {
    prefixo,
    nome: tituloDoPrefixo(prefixo),
    origem,
    destino,
    cidadeOrigem: pegarValorCampo(`cidadeOrigem_${prefixo}`),
    cidadeDestino: pegarValorCampo(`cidadeDestino_${prefixo}`),
    data,
    dataFormatada: formatarDataCurta(data) || "—",
    horaPartida: pegarValorCampo(`horaPartida_${prefixo}`),
    horaChegada: pegarValorCampo(`horaChegada_${prefixo}`),
    diaSeguinte,
    tipoVoo,
    numeroParadas: getNumeroParadas(prefixo),
    duracaoHoras: duracaoH,
    duracaoMinutos: duracaoM,
    duracao: formatarDuracao(duracaoH, duracaoM),
    companhia,
    classe,
    numeroVoo,
    localizador,
    bagagens: { item: bagItem, mao: bagMao, desp: bagDesp },
    paradas,
    ocultoPDF: trechosOcultosPDF.has(prefixo),
    logoCompanhia: getCompanhiaImg(companhia)
  };
}

function coletarTrechosHistorico(){
  const tipo = pegarValorCampo("tipoViagem", "ida");
  const incluirVooInterno = pegarValorCampo("incluirVooInterno", false);
  return obterPrefixosAtivosViagem(tipo, incluirVooInterno).map(coletarDadosTrechoHistorico);
}

function montarResumoTrechosTexto(trechos){
  const ativos = (trechos || []).filter(t => !t.ocultoPDF);
  if(!ativos.length) return "Nenhum trecho visível";
  return ativos.map(t => {
    const rota = `${t.origem || "?"} → ${t.destino || "?"}`;
    const data = t.dataFormatada && t.dataFormatada !== "—" ? ` · ${t.dataFormatada}` : "";
    const horario = (t.horaPartida || t.horaChegada) ? ` · ${t.horaPartida || "—"}-${t.horaChegada || "—"}${t.diaSeguinte ? ` +${t.diaSeguinte}` : ""}` : "";
    const voo = t.numeroVoo ? ` · ${t.numeroVoo}` : "";
    const loc = t.localizador ? ` · ${t.localizador}` : "";
    const comp = t.companhia ? ` · ${t.companhia}` : "";
    return `${t.nome}: ${rota}${data}${horario}${comp}${voo}${loc}`;
  }).join(" | ");
}

function montarObjetoCotacaoAtual(base = {}){
  // Atualiza tudo antes de montar o registro, para o histórico guardar exatamente o preview correto.
  if($("nomeGrupo")) nomeGrupoAtual = ($("nomeGrupo").value || "").trim();
  atualizarPreview();
  const previewSnapshot = $("previewContainer")?.innerHTML || gerarHTMLPreview();
  const trechos = coletarTrechosHistorico();
  const passageirosDetalhados = obterPassageirosInformados();
  const passageirosLista = passageirosDetalhados.map(item => `${item.tipo}: ${item.nome}`);
  const totalPax = {
    adultos: parseInt($("adultosManual")?.value || 0) || 0,
    criancas: parseInt($("criancasManual")?.value || 0) || 0,
    bebes: parseInt($("bebesManual")?.value || 0) || 0,
    pets: parseInt($("petsManual")?.value || 0) || 0
  };
  const textoPessoas = montarTextoPessoasHistorico(totalPax);
  const valorOriginal = $("valorOriginal")?.value || "";
  const valorPromocional = $("valorPromocional")?.value || "";
  const parcelasCartao = $("parcelasCartao")?.value || "";
  const valorParcelaCartao = $("valorParcelaCartao")?.value || "";
  const mostrarPagamento = $("mostrarPagamento")?.checked !== false;
  const agora = new Date();
  const id = base.id || Date.now();

  return {
    ...base,
    id,
    data: base.data || agora.toLocaleDateString("pt-BR"),
    hora: base.hora || agora.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
    criadoEm: base.criadoEm || agora.toISOString(),
    editadoEm: base.id ? agora.toISOString() : "",
    empresa: perfilEmpresa.nome || "ISI Viagens",
    empresaSnapshot: {
      nome: perfilEmpresa.nome || "Cotamiles",
      slogan: perfilEmpresa.slogan || "",
      contato: contatoEmpresaTexto(),
      logo: perfilEmpresa.logo || "",
      cor: normalizarHex(corAtual || perfilEmpresa.cor || "#008080")
    },
    usuarioId: usuarioAtual.id || "local-admin",
    usuarioNome: usuarioAtual.nome || "Administrador",
    cliente: $("cliente")?.value || "",
    cotacao: $("cotacao")?.value || "",
    tipoViagem: $("tipoViagem")?.value || "ida",
    tipoViagemLabel: tipoViagemLabel($("tipoViagem")?.value || "ida"),
    incluirVooInterno: $("incluirVooInterno")?.checked || false,
    valorOriginal,
    valorPromocional,
    parcelasCartao,
    valorParcelaCartao,
    mostrarPagamento,
    pagamento: {
      valorOriginal,
      pix: valorPromocional,
      parcelasCartao,
      valorParcelaCartao,
      mostrarPagamento,
      qrcodePix: qrcodePixBase64 || ""
    },
    nomeGrupo: $("nomeGrupo")?.value || "",
    grupo: { nome: $("nomeGrupo")?.value || "", foto: clubeFotoBase64 || "" },
    localizador: $("localizador")?.value || "",
    localizadoresTrechos: trechos.map(t => t.localizador).filter(Boolean).join("/"),
    passageiros: passageirosLista.join("; "),
    passageirosLista,
    passageirosDetalhados,
    totalPax,
    textoPessoas,
    trechos,
    resumoTrechos: montarResumoTrechosTexto(trechos),
    observacoes: $("observacoes")?.value || "",
    cor: normalizarHex(corAtual || perfilEmpresa.cor || "#008080"),
    temFotoGrupo: !!clubeFotoBase64,
    temQRCodePix: !!qrcodePixBase64,
    html: previewSnapshot,
    previewHTML: previewSnapshot
  };
}

function salvarCotacao(forcarNova=false){
  const editando = !!cotacaoEmEdicaoId && !forcarNova;
  const idx = editando ? cotacoesSalvas.findIndex(x => Number(x.id) === Number(cotacaoEmEdicaoId)) : -1;
  const base = idx >= 0 ? cotacoesSalvas[idx] : {};
  const c = montarObjetoCotacaoAtual(editando ? base : {});

  if(editando && idx >= 0){
    cotacoesSalvas[idx] = c;
    localStorage.setItem("cotacoes_isi", JSON.stringify(cotacoesSalvas));
    atualizarListaHistorico();
    atualizarBannerModoEdicao(c);
    alert("✅ Cotação editada e atualizada no histórico!");
    return;
  }

  cotacaoEmEdicaoId = null;
  cotacoesSalvas.unshift(c);
  localStorage.setItem("cotacoes_isi", JSON.stringify(cotacoesSalvas));
  atualizarListaHistorico();
  atualizarBannerModoEdicao(null);
  alert("✅ Cotação salva no histórico com todos os detalhes!");
}

function salvarComoNovaCotacao(){
  cotacaoEmEdicaoId = null;
  salvarCotacao(true);
}

function cancelarEdicaoCotacao(){
  cotacaoEmEdicaoId = null;
  atualizarBannerModoEdicao(null);
  avisarAcao("Edição cancelada. O formulário continua preenchido.");
}

function normalizarCotacaoHistorico(c){
  c = c || {};
  if(!c.trechos) c.trechos = [];
  if(!Array.isArray(c.trechos)) c.trechos = [];
  if(!c.tipoViagemLabel) c.tipoViagemLabel = tipoViagemLabel(c.tipoViagem);
  if(!c.localizadoresTrechos) c.localizadoresTrechos = c.localizador || c.trechos.map(t => t.localizador).filter(Boolean).join("/");
  if(!c.totalPax) c.totalPax = { adultos:"—", criancas:"—", bebes:"—", pets:"—" };
  if(!c.textoPessoas || c.textoPessoas === "—") c.textoPessoas = montarTextoPessoasHistorico(c.totalPax);
  if(!Array.isArray(c.passageirosDetalhados)){
    c.passageirosDetalhados = Array.isArray(c.passageirosLista)
      ? c.passageirosLista.map((txt, idx) => {
          const partes = String(txt || "").split(":");
          return { ordem: idx + 1, tipo: (partes[0] || "Passageiro").trim(), label: (partes[0] || "Passageiro").trim(), nome: partes.slice(1).join(":").trim() || String(txt || "") };
        }).filter(p => p.nome)
      : [];
  }
  if(!c.pagamento){
    c.pagamento = {
      valorOriginal: c.valorOriginal || "",
      pix: c.valorPromocional || "",
      parcelasCartao: c.parcelasCartao || "",
      valorParcelaCartao: c.valorParcelaCartao || "",
      mostrarPagamento: c.mostrarPagamento !== false,
      qrcodePix: ""
    };
  }
  if(!c.grupo) c.grupo = { nome: c.nomeGrupo || "", foto: "" };
  if(!c.nomeGrupo && c.grupo?.nome) c.nomeGrupo = c.grupo.nome;
  if(!c.cor) c.cor = c.empresaSnapshot?.cor || corAtual || "#008080";
  c.trechos = c.trechos.map(t => ({
    prefixo: t.prefixo || "",
    nome: t.nome || "Trecho",
    origem: t.origem || "",
    destino: t.destino || "",
    cidadeOrigem: t.cidadeOrigem || "",
    cidadeDestino: t.cidadeDestino || "",
    data: t.data || "",
    dataFormatada: t.dataFormatada || formatarDataCurta(t.data) || "—",
    horaPartida: t.horaPartida || "",
    horaChegada: t.horaChegada || "",
    diaSeguinte: parseInt(t.diaSeguinte || 0) || 0,
    tipoVoo: t.tipoVoo || ((t.paradas || []).length ? `${(t.paradas || []).length} parada(s)` : "Direto"),
    duracao: t.duracao || "",
    companhia: t.companhia || "",
    classe: t.classe || "",
    numeroVoo: t.numeroVoo || formatarNumeroVooValor(t.numeroVooRaw || t.voo || ""),
    localizador: t.localizador || "",
    bagagens: t.bagagens || { item:"—", mao:"—", desp:"—" },
    paradas: Array.isArray(t.paradas) ? t.paradas : [],
    ocultoPDF: !!t.ocultoPDF,
    logoCompanhia: t.logoCompanhia || getCompanhiaImg(t.companhia || "")
  }));
  if(!c.resumoTrechos) c.resumoTrechos = montarResumoTrechosTexto(c.trechos);
  if(!c.html && c.previewHTML) c.html = c.previewHTML;
  return c;
}

function textoPagamentoHistorico(c){
  const p = c.pagamento || {};
  if(p.mostrarPagamento === false || c.mostrarPagamento === false) return "Pagamento oculto no PDF";
  const de = (p.valorOriginal || c.valorOriginal) ? `De: ${p.valorOriginal || c.valorOriginal}` : "De: —";
  const pix = (p.pix || c.valorPromocional) ? `Pix: ${p.pix || c.valorPromocional}` : "Pix: —";
  const parcelas = p.parcelasCartao || c.parcelasCartao || "";
  const valorParcela = p.valorParcelaCartao || c.valorParcelaCartao || "";
  const cartao = valorParcela ? `Cartão: ${parcelas || 1}x de ${valorParcela}` : "Cartão: —";
  return `${de} · ${pix} · ${cartao}`;
}

function historicoPaxHTML(c){
  const pax = c.totalPax || {};
  const resumo = `ADT ${pax.adultos ?? "—"} · CHD ${pax.criancas ?? "—"} · BB ${pax.bebes ?? "—"} · PET ${pax.pets ?? "—"}`;
  const nomes = (c.passageirosDetalhados || [])
    .map(p => `<span class="hist-chip">${escapeHtml(p.label || p.tipo || "Pax")}: ${escapeHtml(p.nome || "")}</span>`)
    .join("");
  return `<div class="hist-info-box"><div class="hist-info-label">Passageiros</div><div class="hist-info-value">${escapeHtml(c.textoPessoas || resumo)}</div><div class="hist-badges hist-badges-tight">${nomes || `<span class="hist-chip hist-muted">Sem nomes informados</span>`}</div></div>`;
}

function linhaTrechoHistorico(t){
  const rota = `${escapeHtml(t.origem || "?")} → ${escapeHtml(t.destino || "?")}`;
  const cidades = [t.cidadeOrigem, t.cidadeDestino].filter(Boolean).map(escapeHtml).join(" → ");
  const chegada = `${escapeHtml(t.horaChegada || "—")}${t.diaSeguinte ? ` <strong class="hist-plus-dia">+${t.diaSeguinte}</strong>` : ""}`;
  const loc = t.localizador ? `<span class="hist-chip hist-loc">${escapeHtml(t.localizador)}</span>` : `<span class="hist-chip hist-muted">Sem localizador</span>`;
  const voo = t.numeroVoo ? `<span class="hist-chip">${escapeHtml(t.numeroVoo)}</span>` : "";
  const oculto = t.ocultoPDF ? `<span class="hist-chip hist-muted">Oculto no PDF</span>` : "";
  const b = t.bagagens || {};
  const bagagens = `<span class="hist-chip">10kg: ${escapeHtml(b.item ?? "—")}</span><span class="hist-chip">12kg: ${escapeHtml(b.mao ?? "—")}</span><span class="hist-chip">23kg: ${escapeHtml(b.desp ?? "—")}</span>`;
  const paradasLista = (t.paradas || []).length
    ? (t.paradas || []).map(p => `<span class="hist-chip">${escapeHtml(p.codigo || "Parada")} ${p.espera ? `· ${escapeHtml(p.espera)}` : ""}</span>`).join("")
    : `<span class="hist-chip">Direto</span>`;
  return `<div class="hist-trecho-line">
    <div class="hist-trecho-main"><strong>${escapeHtml(t.nome || "Trecho")}</strong><span>${rota}</span></div>
    ${cidades ? `<div class="hist-trecho-cidades">${cidades}</div>` : ""}
    <div class="hist-trecho-meta">
      <span>${escapeHtml(t.dataFormatada || formatarDataCurta(t.data) || "—")}</span>
      <span>${escapeHtml(t.horaPartida || "—")} → ${chegada}</span>
      <span>Duração: ${escapeHtml(t.duracao || "—")}</span>
      <span>${escapeHtml(t.tipoVoo || "Direto")}</span>
      ${t.companhia ? `<span>${escapeHtml(t.companhia)}</span>` : `<span>Companhia: —</span>`}
      ${t.classe ? `<span>${escapeHtml(t.classe)}</span>` : `<span>Classe: —</span>`}
      ${voo}${loc}${oculto}
    </div>
    <div class="hist-trecho-section"><small>Paradas</small><div class="hist-badges hist-badges-tight">${paradasLista}</div></div>
    <div class="hist-trecho-section"><small>Bagagens</small><div class="hist-badges hist-badges-tight">${bagagens}</div></div>
  </div>`;
}

function camposBuscaHistorico(c){
  return [
    c.cliente, c.cotacao, c.nomeGrupo, c.valorOriginal, c.valorPromocional, c.parcelasCartao, c.valorParcelaCartao,
    c.localizadoresTrechos, c.resumoTrechos, c.tipoViagemLabel, c.usuarioNome, c.observacoes,
    ...(c.passageirosDetalhados || []).map(p => `${p.tipo} ${p.nome}`),
    ...(c.trechos || []).flatMap(t => [t.nome,t.origem,t.destino,t.cidadeOrigem,t.cidadeDestino,t.companhia,t.classe,t.localizador,t.tipoVoo,t.dataFormatada,t.horaPartida,t.horaChegada,...(t.paradas || []).map(p => `${p.codigo} ${p.espera}`)])
  ].join(" ").toLowerCase();
}

function atualizarListaHistorico(){
  let tbody = $("listaCotacoes");
  if(!tbody) return;
  let termo = ($("searchHistorico")?.value || "").toLowerCase();
  let filtradas = cotacoesSalvas.map(normalizarCotacaoHistorico).filter(c => camposBuscaHistorico(c).includes(termo));

  if(!filtradas.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">📭 Nenhuma cotação salva</td></tr>`;
    return;
  }

  tbody.innerHTML = filtradas.map(c => {
    const trechosHtml = c.trechos?.length ? c.trechos.map(linhaTrechoHistorico).join("") : `<div class="hist-trecho-line">${escapeHtml(c.resumoTrechos || "Sem trechos salvos")}</div>`;
    const p = c.pagamento || {};
    const badges = [
      c.localizadoresTrechos ? `<span class="hist-chip hist-loc">Localizadores: ${escapeHtml(c.localizadoresTrechos)}</span>` : `<span class="hist-chip hist-muted">Sem localizador</span>`,
      c.temFotoGrupo || c.grupo?.foto ? `<span class="hist-chip">Foto do grupo</span>` : "",
      c.temQRCodePix || p.qrcodePix ? `<span class="hist-chip">QR Pix</span>` : "",
      c.mostrarPagamento === false || p.mostrarPagamento === false ? `<span class="hist-chip hist-muted">Pagamento oculto</span>` : ""
    ].filter(Boolean).join("");
    const grupoNome = c.nomeGrupo || c.grupo?.nome || "Sem grupo";
    const valorTopo = p.pix || c.valorPromocional || "—";
    const parcelaTopo = (p.valorParcelaCartao || c.valorParcelaCartao) ? `${p.parcelasCartao || c.parcelasCartao || 1}x de ${p.valorParcelaCartao || c.valorParcelaCartao}` : "";

    return `<tr class="historico-row-detalhado">
      <td><input type="checkbox" class="select-item" data-id="${c.id}"></td>
      <td colspan="6">
        <div class="hist-card" style="--theme:${escapeAttr(c.cor || "#008080")};">
          <div class="hist-card-top">
            <div>
              <div class="hist-date">${escapeHtml(c.data || "—")} ${c.hora ? `às ${escapeHtml(c.hora)}` : ""} ${c.usuarioNome ? `· ${escapeHtml(c.usuarioNome)}` : ""}</div>
              <div class="hist-title">${escapeHtml(c.cotacao || "Cotação")} ${c.cliente ? `· ${escapeHtml(c.cliente)}` : ""}</div>
              <div class="hist-subtitle">${escapeHtml(grupoNome)} · ${escapeHtml(c.tipoViagemLabel || tipoViagemLabel(c.tipoViagem))}</div>
            </div>
            <div class="hist-price"><span>${escapeHtml(valorTopo)}</span><small>${escapeHtml(parcelaTopo)}</small></div>
          </div>
          <div class="hist-info-grid">
            <div class="hist-info-box"><div class="hist-info-label">Cliente</div><div class="hist-info-value">${escapeHtml(c.cliente || "—")}</div></div>
            <div class="hist-info-box"><div class="hist-info-label">Grupo / Clube</div><div class="hist-info-value">${escapeHtml(grupoNome)}</div></div>
            <div class="hist-info-box"><div class="hist-info-label">Pagamento</div><div class="hist-info-value">${escapeHtml(textoPagamentoHistorico(c))}</div></div>
            ${historicoPaxHTML(c)}
          </div>
          <div class="hist-badges">${badges}</div>
          <div class="hist-trechos">${trechosHtml}</div>
          ${c.observacoes ? `<div class="hist-observacoes"><strong>Observações:</strong> ${escapeHtml(c.observacoes)}</div>` : ""}
          <div class="hist-bottom">
            <span>${escapeHtml(c.resumoTrechos || "")}</span>
            <div class="hist-actions">
              <button class="btn-secondary" onclick="editarCotacaoSalva(${c.id})">✏️ Editar</button>
              <button class="btn-generate" onclick="abrirCotacaoSalva(${c.id})">📄 Ver PDF</button>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function documentoImpressaoPreview(html, titulo="Cotação"){
  const estilos = Array.from(document.querySelectorAll("style")).map(s => s.innerHTML).join("\n");
  const baseHref = document.baseURI || window.location.href;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${escapeAttr(baseHref)}">
  <title>${escapeHtml(titulo)}</title>
  <style>${estilos}</style>
  <style>
    @page { size:A4; margin:5mm; }
    html, body { background:#fff !important; margin:0 !important; padding:0 !important; width:100% !important; min-height:auto !important; overflow:visible !important; }
    body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .print-preview-wrapper { width:100% !important; margin:0 auto !important; padding:0 !important; background:#fff !important; }
    .no-print, .preview-global-actions, .preview-edit-tools, .preview-editor-backdrop, .tabs, .config-panel, .preview-header, .app-tabs, .perfil-rapido-backdrop, .historico-container { display:none !important; }
    #previewContainer { display:block !important; width:100% !important; padding:0 !important; margin:0 !important; }
    .pdf-preview { margin:0 auto !important; box-shadow:none !important; }
    .pdf-topbar { grid-template-columns:1fr 1.15fr 1fr !important; }
    .pdf-title-box { text-align:center !important; }
    @media print {
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; overflow:visible !important; }
      .print-preview-wrapper, #previewContainer { display:block !important; }
      .no-print, .preview-global-actions, .preview-edit-tools, .preview-editor-backdrop { display:none !important; }
      .pdf-preview { page-break-inside:avoid !important; break-inside:avoid-page !important; page-break-after:avoid !important; break-after:avoid-page !important; }
    }
  </style>
  <script>
    function handleImgError(img){
      var caminhos = String((img && img.dataset && img.dataset.imgPaths) || "").split("||").map(function(v){ return v.trim(); }).filter(Boolean);
      var tentativaAtual = parseInt((img && img.dataset && img.dataset.imgTry) || "0", 10);
      var proximaTentativa = tentativaAtual + 1;
      if(caminhos[proximaTentativa]){
        img.dataset.imgTry = String(proximaTentativa);
        img.src = caminhos[proximaTentativa];
        return;
      }
      if(img) img.style.display = "none";
    }
  <\/script>
</head>
<body class="imprimindo-pdf">
  <div class="print-preview-wrapper"><div id="previewContainer">${html}</div></div>
  <script>
    function handleImgError(img){
      var caminhos = String((img && img.dataset && img.dataset.imgPaths) || "").split("||").map(function(v){ return v.trim(); }).filter(Boolean);
      var tentativaAtual = parseInt((img && img.dataset && img.dataset.imgTry) || "0", 10);
      var proximaTentativa = tentativaAtual + 1;
      if(caminhos[proximaTentativa]){
        img.dataset.imgTry = String(proximaTentativa);
        img.src = caminhos[proximaTentativa];
        return;
      }
      if(img) img.style.display = "none";
    }
    function esperarImagensHistorico(timeout){
      var imgs = Array.prototype.slice.call(document.querySelectorAll("img"));
      if(!imgs.length) return Promise.resolve();
      return Promise.race([
        Promise.all(imgs.map(function(img){
          if(img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(function(resolve){
            var fim = function(){ resolve(); };
            img.addEventListener("load", fim, { once:true });
            img.addEventListener("error", fim, { once:true });
          });
        })),
        new Promise(function(resolve){ setTimeout(resolve, timeout || 4500); })
      ]);
    }
    window.onload = function(){
      esperarImagensHistorico(4500).then(function(){ setTimeout(function(){ window.print(); }, 250); });
    };
  <\/script>
</body>
</html>`;
}

function abrirCotacaoSalva(id){
  const encontrado = cotacoesSalvas.find(x => Number(x.id) === Number(id));
  if(!encontrado) return;
  let c = normalizarCotacaoHistorico(encontrado);
  const html = c.html || c.previewHTML;
  if(!html){
    alert("Essa cotação antiga não tem o preview salvo. Salve novamente a cotação para gerar o PDF pelo histórico.");
    return;
  }
  const win = window.open("", "_blank");
  if(!win){ alert("O navegador bloqueou a janela do PDF. Libere pop-ups para ver a cotação."); return; }
  win.document.open();
  win.document.write(documentoImpressaoPreview(html, c.cotacao || "Cotação"));
  win.document.close();
}


function setValorCampoHistorico(id, valor){
  const el = $(id);
  if(!el) return;
  el.value = valor ?? "";
}
function setCheckboxHistorico(id, valor){
  const el = $(id);
  if(!el) return;
  el.checked = !!valor;
}
function setSelectHistorico(id, valor){
  const el = $(id);
  if(!el) return;
  const v = valor ?? "";
  if(v && ![...el.options].some(opt => opt.value === v)){
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  }
  el.value = v;
}
function tipoVooHistorico(t){
  const qtd = Array.isArray(t.paradas) ? t.paradas.length : 0;
  if(t.tipoVoo && ["Direto","1 parada","2 paradas","3 paradas","4 paradas"].includes(t.tipoVoo)) return t.tipoVoo;
  if(qtd <= 0) return "Direto";
  return qtd === 1 ? "1 parada" : `${Math.min(4, qtd)} paradas`;
}
function extrairEsperaHistorico(parada){
  const hDireto = parseInt(parada?.horas ?? parada?.hora ?? 0);
  const mDireto = parseInt(parada?.minutos ?? parada?.minuto ?? 0);
  if(!isNaN(hDireto) || !isNaN(mDireto)) return { h: isNaN(hDireto) ? 0 : hDireto, m: isNaN(mDireto) ? 0 : mDireto };
  const txt = String(parada?.espera || "");
  const mh = txt.match(/(\d+)\s*h/i);
  const mm = txt.match(/(\d+)\s*min/i);
  return { h: mh ? parseInt(mh[1]) : 0, m: mm ? parseInt(mm[1]) : 0 };
}
function aplicarTrechoNoFormulario(t, prefixoDestino){
  const prefixo = prefixoDestino || t.prefixo || "ida";
  if(prefixo === "ida" || prefixo === "volta" || prefixo === "interno") setValorCampoHistorico(`nomeTrecho_${prefixo}`, t.nome || tituloDoPrefixo(prefixo));

  setValorCampoHistorico(`localizador_${prefixo}`, t.localizador || "");
  setValorCampoHistorico(`numeroVoo_${prefixo}`, t.numeroVoo || "");
  setValorCampoHistorico(`data_${prefixo}`, t.data || "");
  setValorCampoHistorico(`origem_${prefixo}`, t.origem || "");
  setValorCampoHistorico(`cidadeOrigem_${prefixo}`, t.cidadeOrigem || getCidadeAeroporto(t.origem || "") || "");
  setValorCampoHistorico(`destino_${prefixo}`, t.destino || "");
  setValorCampoHistorico(`cidadeDestino_${prefixo}`, t.cidadeDestino || getCidadeAeroporto(t.destino || "") || "");
  setValorCampoHistorico(`horaPartida_${prefixo}`, t.horaPartida || "");
  setValorCampoHistorico(`horaChegada_${prefixo}`, t.horaChegada || "");
  setSelectHistorico(`diaSeguinte_${prefixo}`, String(t.diaSeguinte || 0));
  setSelectHistorico(`tipoVoo_${prefixo}`, tipoVooHistorico(t));
  setSelectHistorico(`classe_${prefixo}`, t.classe || "Econômica");
  setSelectHistorico(`companhia_${prefixo}`, t.companhia || "");
  const durH = t.duracaoHoras ?? (String(t.duracao || "").match(/(\d+)\s*h/i)?.[1] || 0);
  const durM = t.duracaoMinutos ?? (String(t.duracao || "").match(/(\d+)\s*min/i)?.[1] || 0);
  setValorCampoHistorico(`duracaoHoras_${prefixo}`, durH || "");
  setValorCampoHistorico(`duracaoMin_${prefixo}`, durM || "");
  const b = t.bagagens || {};
  setValorCampoHistorico(`bagItem_${prefixo}`, b.item ?? 1);
  setValorCampoHistorico(`bagMao_${prefixo}`, b.mao ?? 1);
  setValorCampoHistorico(`bagDesp_${prefixo}`, b.desp ?? 0);

  atualizarCamposParadas(prefixo);
  for(let i=1; i<=4; i++){
    const parada = (t.paradas || [])[i-1] || {};
    const espera = extrairEsperaHistorico(parada);
    setValorCampoHistorico(`parada${i}_${prefixo}`, parada.codigo || "");
    setValorCampoHistorico(`parada${i}h_${prefixo}`, parada.codigo ? espera.h : "");
    setValorCampoHistorico(`parada${i}m_${prefixo}`, parada.codigo ? espera.m : "");
  }
  if(t.ocultoPDF) trechosOcultosPDF.add(prefixo);
  else trechosOcultosPDF.delete(prefixo);
  sincronizarCheckboxTrechoPDF(prefixo);
  normalizarBagagens(prefixo);
}
function prepararMultitrechosParaEdicao(trechos){
  const lista = Array.isArray(trechos) && trechos.length ? trechos : [];
  trechosMult = lista.map((t, idx) => {
    const id = String(t.prefixo || "").startsWith("t") ? (parseInt(String(t.prefixo).slice(1)) || idx + 1) : idx + 1;
    return { id, nome: t.nome || `Trecho ${id}` };
  });
  while(trechosMult.length < 2){
    const id = trechosMult.length + 1;
    trechosMult.push({ id, nome:`Trecho ${id}` });
  }
  trechoCount = Math.max(2, ...trechosMult.map(t => t.id));
  renderizarTodosTrechos();
  lista.forEach((t, idx) => {
    const item = trechosMult[idx];
    const prefixo = item ? `t${item.id}` : (t.prefixo || `t${idx+1}`);
    aplicarTrechoNoFormulario(t, prefixo);
    const nomeInput = $(`nomeTrecho_${String(prefixo).replace(/^t/, "")}`);
    if(nomeInput) nomeInput.value = t.nome || tituloDoPrefixo(prefixo);
  });
}
function preencherPassageirosDaCotacao(c){
  const pax = c.totalPax || {};
  setValorCampoHistorico("adultosManual", parseInt(pax.adultos || 0) || 0);
  setValorCampoHistorico("criancasManual", parseInt(pax.criancas || 0) || 0);
  setValorCampoHistorico("bebesManual", parseInt(pax.bebes || 0) || 0);
  setValorCampoHistorico("petsManual", parseInt(pax.pets || 0) || 0);
  renderizarCamposPassageiros();
  const nomes = Array.isArray(c.passageirosDetalhados) ? c.passageirosDetalhados : [];
  nomes.forEach((paxInfo, idx) => {
    const input = $(`nomePassageiro_${idx+1}`);
    if(input) input.value = paxInfo.nome || "";
  });
}
function atualizarBannerModoEdicao(c){
  const existente = $("edicaoCotacaoBanner");
  if(existente) existente.remove();
  if(!cotacaoEmEdicaoId) return;
  const alvo = $("formularioCelular") || document.querySelector(".config-panel");
  if(!alvo) return;
  const div = document.createElement("div");
  div.id = "edicaoCotacaoBanner";
  div.className = "alert alert-warning no-print";
  div.style.cssText = "margin-bottom:12px;font-size:12px;font-weight:800;line-height:1.45;";
  div.innerHTML = `✏️ Editando orçamento salvo${c?.cotacao ? `: <strong>${escapeHtml(c.cotacao)}</strong>` : ""}. Altere os campos, veja o preview e clique em <strong>Salvar</strong> para atualizar o histórico.<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;"><button type="button" class="btn-generate" onclick="salvarCotacao()">💾 Atualizar histórico</button><button type="button" class="btn-secondary" onclick="salvarComoNovaCotacao()">📄 Salvar como nova</button><button type="button" class="btn-secondary" onclick="cancelarEdicaoCotacao()">Cancelar edição</button></div>`;
  alvo.insertAdjacentElement("afterend", div);
}
function editarCotacaoSalva(id){
  const encontrado = cotacoesSalvas.find(x => Number(x.id) === Number(id));
  if(!encontrado){ alert("Cotação não encontrada no histórico."); return; }
  const c = normalizarCotacaoHistorico(JSON.parse(JSON.stringify(encontrado)));

  cotacaoEmEdicaoId = c.id;
  setValorCampoHistorico("cliente", c.cliente || "");
  setValorCampoHistorico("cotacao", c.cotacao || "Passagem Aérea");
  setSelectHistorico("tipoViagem", c.tipoViagem || "ida");
  setValorCampoHistorico("valorOriginal", c.pagamento?.valorOriginal || c.valorOriginal || "");
  setValorCampoHistorico("valorPromocional", c.pagamento?.pix || c.valorPromocional || "");
  setValorCampoHistorico("parcelasCartao", c.pagamento?.parcelasCartao || c.parcelasCartao || "");
  setValorCampoHistorico("valorParcelaCartao", c.pagamento?.valorParcelaCartao || c.valorParcelaCartao || "");
  setCheckboxHistorico("mostrarPagamento", c.pagamento?.mostrarPagamento !== false && c.mostrarPagamento !== false);
  setValorCampoHistorico("observacoes", c.observacoes || "");
  setValorCampoHistorico("nomeGrupo", c.nomeGrupo || c.grupo?.nome || "");
  nomeGrupoAtual = c.nomeGrupo || c.grupo?.nome || "";
  clubeFotoBase64 = c.grupo?.foto || "";
  if($("clubeFotoPreview")) $("clubeFotoPreview").src = clubeFotoBase64 || "";
  qrcodePixBase64 = c.pagamento?.qrcodePix || "";
  if($("qrcodePixPreview")) $("qrcodePixPreview").src = qrcodePixBase64 || "";
  mudarCor(c.cor || c.empresaSnapshot?.cor || corAtual || "#008080");

  preencherPassageirosDaCotacao(c);
  trechosOcultosPDF = new Set();
  trechosOcultosPreview = new Set();

  const tipo = c.tipoViagem || "ida";
  const temInterno = !!c.incluirVooInterno || (c.trechos || []).some(t => t.prefixo === "interno");
  setCheckboxHistorico("incluirVooInterno", temInterno);
  atualizarVisibilidadeSecoes();
  toggleVooInterno();

  if(tipo === "multitrecho"){
    prepararMultitrechosParaEdicao(c.trechos || []);
  }else{
    const ordemPadrao = tipo === "ida" ? ["ida"] : ["ida", ...(temInterno ? ["interno"] : []), "volta"];
    ordemPadrao.forEach((prefixo, idx) => {
      const trecho = (c.trechos || []).find(t => t.prefixo === prefixo) || (c.trechos || [])[idx];
      if(trecho) aplicarTrechoNoFormulario(trecho, prefixo);
    });
  }

  atualizarTodosCamposParadas();
  ["ida","volta","interno", ...trechosMult.map(t => `t${t.id}`)].forEach(sincronizarCheckboxTrechoPDF);
  atualizarPreview();
  atualizarBannerModoEdicao(c);
  mudarAba("cotador");
  setTimeout(() => {
    const alvo = $("formularioCelular") || $("previewContainer");
    if(alvo) alvo.scrollIntoView({ behavior:"smooth", block:"start" });
  }, 80);
  avisarAcao("Cotação carregada para edição. Ajuste os campos e gere o PDF novamente.");
}

function selecionarTodosHistorico(){ document.querySelectorAll(".select-item").forEach(el=>el.checked=$("selecionarTodos")?.checked); }
function excluirSelecionados(){ let ids=[...document.querySelectorAll(".select-item:checked")].map(el=>Number(el.dataset.id)); if(!ids.length) return; if(!confirm(`Excluir ${ids.length}?`)) return; cotacoesSalvas=cotacoesSalvas.filter(c=>!ids.includes(Number(c.id))); localStorage.setItem("cotacoes_isi",JSON.stringify(cotacoesSalvas)); atualizarListaHistorico(); }
function valorCSV(v){ return `"${String(v ?? "").replaceAll('"','""')}"`; }
function exportarHistorico(){
  if(!cotacoesSalvas.length) return;
  let csv="Data,Hora,Usuário,Cliente,Cotação,Tipo,Grupo,Passageiros,Adultos,Crianças,Bebês,Pets,Valor Original,Pix,Parcelas,Valor Parcela,Pagamento Visível,Localizadores,Resumo,Observações,Trechos detalhados\n";
  cotacoesSalvas.map(normalizarCotacaoHistorico).forEach(c=>{
    const pax = c.totalPax || {};
    const p = c.pagamento || {};
    const trechosDetalhados = (c.trechos || []).map(t => {
      const b = t.bagagens || {};
      const paradas = (t.paradas || []).map(pa => `${pa.codigo} ${pa.espera || ""}`).join(" / ");
      return `${t.nome}: ${t.origem}-${t.destino}; ${t.cidadeOrigem || ""}-${t.cidadeDestino || ""}; ${t.dataFormatada || ""}; ${t.horaPartida || ""}-${t.horaChegada || ""}${t.diaSeguinte ? ` +${t.diaSeguinte}` : ""}; ${t.companhia || ""}; ${t.classe || ""}; ${t.numeroVoo || ""}; LOC ${t.localizador || ""}; ${t.tipoVoo || ""}; Duração ${t.duracao || ""}; Bag 10kg:${b.item ?? ""} 12kg:${b.mao ?? ""} 23kg:${b.desp ?? ""}; Paradas ${paradas || "Direto"}`;
    }).join(" | ");
    const linha = [
      c.data,c.hora,c.usuarioNome,c.cliente,c.cotacao,c.tipoViagemLabel,c.nomeGrupo || c.grupo?.nome,c.textoPessoas,
      pax.adultos,pax.criancas,pax.bebes,pax.pets,
      p.valorOriginal || c.valorOriginal,p.pix || c.valorPromocional,p.parcelasCartao || c.parcelasCartao,p.valorParcelaCartao || c.valorParcelaCartao,
      (p.mostrarPagamento === false || c.mostrarPagamento === false) ? "Não" : "Sim",
      c.localizadoresTrechos,c.resumoTrechos,c.observacoes,trechosDetalhados
    ].map(valorCSV).join(",");
    csv += linha + "\n";
  });
  let blob=new Blob(["\uFEFF"+csv],{type:"text/csv"}); let a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="cotacoes_isi_historico_completo.csv"; a.click(); URL.revokeObjectURL(a.href);
}

function mudarAba(aba){
  const mapa = { perfil:"abaPerfil", cotador:"abaCotador", automatico:"abaAutomatico", historico:"abaHistorico" };
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



function irParaFormularioMobile(){
  const painel = document.querySelector('.config-panel');
  const alvo = document.getElementById('formularioCelular') || painel;
  if(painel) painel.classList.add('mobile-open');
  if(alvo) alvo.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ==================== EVENTOS E INICIALIZAÇÃO ====================
if($("perfilLogoInput")) $("perfilLogoInput").addEventListener("change", lidarUploadLogoEmpresa);
if($("clubeFotoInput")) $("clubeFotoInput").addEventListener("change", function(e){
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = ev => { clubeFotoBase64 = ev.target.result; $("clubeFotoPreview").src = clubeFotoBase64; atualizarPreview(); };
  reader.readAsDataURL(file);
});

function removerFotoClube(){ clubeFotoBase64 = ""; if($("clubeFotoPreview")) $("clubeFotoPreview").src = ""; atualizarPreview(); }

async function lidarUploadQRCodePix(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")){
    alert("Escolha uma imagem válida para o QR Code do Pix.");
    return;
  }
  qrcodePixBase64 = await otimizarImagemParaBase64(file, 700, 0.9);
  if($("qrcodePixPreview")) $("qrcodePixPreview").src = qrcodePixBase64;
  atualizarPreview();
}
function removerQRCodePix(){
  qrcodePixBase64 = "";
  if($("qrcodePixPreview")) $("qrcodePixPreview").src = "";
  if($("qrcodePixInput")) $("qrcodePixInput").value = "";
  atualizarPreview();
}
if($("qrcodePixInput")) $("qrcodePixInput").addEventListener("change", lidarUploadQRCodePix);

if($("nomeGrupo")) $("nomeGrupo").addEventListener("input", e => { nomeGrupoAtual = e.target.value; atualizarPreview(); });
["cliente","cotacao","localizador","valorOriginal","valorPromocional","parcelasCartao","valorParcelaCartao","observacoes","nomeTrecho_ida","nomeTrecho_volta","nomeTrecho_interno"].forEach(id => { if($(id)) $(id).addEventListener("input", atualizarPreview); });
if($("mostrarPagamento")) $("mostrarPagamento").addEventListener("change", atualizarPreview);
if($("tipoViagem")) $("tipoViagem").addEventListener("change", function(){
  atualizarVisibilidadeSecoes();
  atualizarPreview();
});

garantirDatalistAeroportos();
if($("buscaDataIda")) $("buscaDataIda").value = hojeMaisDias(30);
if($("idaContainer")) $("idaContainer").innerHTML = renderizarFormVoo("ida");
if($("voltaContainer")) $("voltaContainer").innerHTML = renderizarFormVoo("volta");
if($("vooInternoContainer")) $("vooInternoContainer").innerHTML = renderizarFormVoo("interno");
if($("vooInternoContainer")) $("vooInternoContainer").style.display = "none";
renderizarTodosTrechos();

inicializarPerfilEmpresa();
inicializarContaLocal();
corAtual = normalizarHex(perfilEmpresa.cor || corAtual);
document.documentElement.style.setProperty("--theme", corAtual);
if($("corPersonalizada")) $("corPersonalizada").value = corAtual;
if($("corHex")) $("corHex").value = corAtual;
atualizarVisibilidadeSecoes();
atualizarTodosCamposParadas();
["ida","volta","interno"].forEach(sincronizarCheckboxTrechoPDF);
renderizarCamposPassageiros();
atualizarPreview();
atualizarPreviewPerfilEmpresa();
atualizarTelaLoginApp();
atualizarListaHistorico();
configurarPWA();
atualizarRegrasSenha();
// Amadeus/API automatizada desativada por enquanto.
