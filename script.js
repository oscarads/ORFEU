/* ==========================================================
   0. FIREBASE — Conexão com a Nuvem e Autenticação
   ========================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmKZ___F5p-mYxoUDwCMm526E-BTZt3H0",
    authDomain: "orfeu-fc615.firebaseapp.com",
    databaseURL: "https://orfeu-fc615-default-rtdb.firebaseio.com",
    projectId: "orfeu-fc615",
    storageBucket: "orfeu-fc615.firebasestorage.app",
    messagingSenderId: "39013670213",
    appId: "1:39013670213:web:c2b38b81fb457093f8322c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Variável que guarda o ID secreto do usuário logado
let caminhoNuvem = null; 

/* ==========================================================
   1. VARIÁVEIS DE ESTADO
   ========================================================== */
let tempoInicio = 0, tempoAcumulado = 0, milissegundos = 0, segundos = 0, minutos = 0, horas = 0;
let intervaloId = null, modoAtual = "foco", ultimoAviso = 0, limiteMaximo = 52;
let graficoEvolucao = null, graficoSemana = null;

let tempoPorMateria = {};
let recordePorMateria = {};
let metaPorMateria = {};
let tempoPorMes = {};
let tempoPorDiaMateria = {};

/* ==========================================================
   2. CONEXÕES COM O HTML
   ========================================================== */
const somAlarme = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
somAlarme.loop = true;

const telaLogin      = document.getElementById("tela-login");
const appPrincipal   = document.getElementById("app-principal");
const btnLogin       = document.getElementById("btn-login");
const btnSair        = document.getElementById("btn-sair");

const materia        = document.getElementById("materia");
const visor          = document.getElementById("visor");
const btnIniciar     = document.getElementById("btn-iniciar");
const btnConcluir    = document.getElementById("btn-concluir");
const btnPausar      = document.getElementById("btn-pausar");
const painelDescanso = document.getElementById("painel-descanso");
const visorDescanso  = document.getElementById("visor-descanso");
const btnPularDescanso = document.getElementById("btnPularDescanso");
const painelFoco     = document.getElementById("painel-foco");

/* ==========================================================
   3. SISTEMA DE LOGIN (Google Auth)
   ========================================================== */
btnLogin.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => alert("Erro ao fazer login: " + error.message));
});

btnSair.addEventListener("click", () => {
    if(confirm("Tem certeza que deseja sair?")) signOut(auth);
});

// Fica vigiando para ver se o usuário está logado ou não
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário entrou! Pega o ID único dele para salvar na pasta certa.
        caminhoNuvem = 'usuarios/' + user.uid + '/dadosOrfeu';
        telaLogin.style.display = "none";
        appPrincipal.style.display = "block";
        btnSair.style.display = "block";
        iniciarSistema(); // Puxa os dados apenas deste usuário
    } else {
        // Ninguém logado. Mostra a tela de bloqueio.
        caminhoNuvem = null;
        telaLogin.style.display = "flex";
        appPrincipal.style.display = "none";
        btnSair.style.display = "none";
        
        // Zera as memórias da tela para não vazar dados para o próximo usuário
        tempoPorMateria = {}; recordePorMateria = {}; metaPorMateria = {}; tempoPorMes = {}; tempoPorDiaMateria = {};
    }
});

/* ==========================================================
   4. FORMATAÇÃO E MOTOR DO TEMPO
   ========================================================== */
function formatarHoraAmigavel(segundosTotais) {
    let h = Math.floor(segundosTotais / 3600), m = Math.floor((segundosTotais % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m === 0 && h === 0) return "0m";
    return `${m}m`;
}

function incrementarTempo() {
    let diferencaMs = Date.now() - tempoInicio;

    if (modoAtual === "descanso") {
        let tempoRestante = tempoAcumulado - diferencaMs;
        if (tempoRestante <= 0) {
            clearInterval(intervaloId); intervaloId = null; modoAtual = "foco";
            painelFoco.classList.remove("escondido"); painelDescanso.classList.add("escondido");
            tempoAcumulado = 0; somAlarme.play();
            alert("Descanso concluído! Hora de voltar ao foco.");
            somAlarme.pause(); somAlarme.currentTime = 0;
            return;
        }
        let totalS = Math.floor(tempoRestante / 1000);
        let h = Math.floor(totalS / 3600), m = Math.floor((totalS % 3600) / 60), s = totalS % 60;
        visorDescanso.textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
        return;
    }

    horas = Math.floor(diferencaMs / 3600000);
    minutos = Math.floor((diferencaMs % 3600000) / 60000);
    segundos = Math.floor((diferencaMs % 60000) / 1000);
    milissegundos = Math.floor((diferencaMs % 1000) / 10);

    let segundosTotais = Math.floor(diferencaMs / 1000);
    let nome = materia.value.toUpperCase(), metaAtual = metaPorMateria[nome] || 25;

   if (segundosTotais >= metaAtual * 60 && segundosTotais - ultimoAviso >= 600) {
        somAlarme.play(); 
        document.title = "⚠️ META ATINGIDA!";
        ultimoAviso = segundosTotais;

        // Dispara a Notificação de Sistema e faz o celular vibrar
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("⚠️ ORFEU: Meta Atingida!", {
                body: "Hora de focar na recuperação. Seu cérebro precisa de descanso."
            });
            // Padrão de vibração do Android: vibra 500ms, pausa 200ms, vibra 500ms
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        }

        let resposta = confirm("Meta atingida! Clique em OK para descansar ou Cancelar para continuar.");
        somAlarme.pause(); somAlarme.currentTime = 0; document.title = "ORFEU"; 
        if (resposta) btnConcluir.click();
    }
    visor.textContent = `${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}:${String(segundos).padStart(2,"0")}:${String(milissegundos).padStart(2,"0")}`;
}

/* ==========================================================
   5. RENDERIZAÇÃO DA TELA (Com Tooltip)
   ========================================================== */
function atualizarResumoRapido() {
    const painel = document.getElementById("resumo-rapido");
    if (!painel) return;

    let hoje = new Date();
    let strHoje = `${String(hoje.getDate()).padStart(2,"0")}-${String(hoje.getMonth()+1).padStart(2,"0")}-${hoje.getFullYear()}`;
    let strMes  = `${String(hoje.getMonth()+1).padStart(2,"0")}-${hoje.getFullYear()}`;
    let totalHoje = 0, totalSemana = 0, totalMes = 0;

    for (let chave in tempoPorDiaMateria) if (chave.endsWith(strHoje)) totalHoje += tempoPorDiaMateria[chave];
    for (let chave in tempoPorMes) if (chave.endsWith(strMes)) totalMes += tempoPorMes[chave];

    let diaDaSemana = hoje.getDay(), diff = hoje.getDate() - diaDaSemana + (diaDaSemana === 0 ? -6 : 1), segunda = new Date(new Date().setDate(diff));
    for (let i = 0; i < 7; i++) {
        let dAtual = new Date(segunda); dAtual.setDate(segunda.getDate() + i);
        let chaveData = `${String(dAtual.getDate()).padStart(2,"0")}-${String(dAtual.getMonth()+1).padStart(2,"0")}-${dAtual.getFullYear()}`;
        for (let chave in tempoPorDiaMateria) if (chave.endsWith(chaveData)) totalSemana += tempoPorDiaMateria[chave];
    }

    painel.innerHTML = `
        <div class="resumo-box" style="background:#e8f4f8;">
            <div style="font-size:0.85em;color:#3498db;font-weight:700;">HOJE</div>
            <div style="font-size:1.8em;color:#2c3e50;">${formatarHoraAmigavel(totalHoje)}</div>
        </div>
        <div class="resumo-box" style="background:#e8f8f5;">
            <div style="font-size:0.85em;color:#1abc9c;font-weight:700;">ESTA SEMANA</div>
            <div style="font-size:1.8em;color:#2c3e50;">${formatarHoraAmigavel(totalSemana)}</div>
        </div>
        <div class="resumo-box" style="background:#fdf2e9;">
            <div style="font-size:0.85em;color:#e67e22;font-weight:700;">ESTE MÊS</div>
            <div style="font-size:1.8em;color:#2c3e50;">${formatarHoraAmigavel(totalMes)}</div>
        </div>
    `;
}

function carregarBotoesRapidos() {
    let areaBotoes = document.getElementById("botoes-materias");
    if (!areaBotoes) return; areaBotoes.innerHTML = "";

    for (let nome in tempoPorMateria) {
        let btn = document.createElement("button");
        btn.textContent = nome;
        btn.style.cssText = "padding:8px 15px;cursor:pointer;border-radius:5px;border:1px solid #ccc;background-color:#f8f9fa;font-weight:bold;";
        
        let tTotal = formatarHoraAmigavel(tempoPorMateria[nome] || 0);
        let tRec = formatarHoraAmigavel(recordePorMateria[nome] || 0);
        btn.title = `📊 Total: ${tTotal}\n🏆 Maior Sessão: ${tRec}`;

        btn.addEventListener("click", () => { materia.value = nome; });
        btn.addEventListener("contextmenu", async (e) => {
            e.preventDefault();
            if (confirm(`Apagar histórico de "${nome}"?`)) {
                delete tempoPorMateria[nome]; delete recordePorMateria[nome]; delete metaPorMateria[nome];
                await salvarDadosNaNuvem();
                carregarBotoesRapidos(); atualizarPlacarMensal(); atualizarResumoRapido(); atualizarGraficos();
            }
        });
        areaBotoes.appendChild(btn);
    }
}

function atualizarPlacarMensal() {
    const painel = document.getElementById("placar-mensal");
    if (!painel) return; painel.innerHTML = "";

    for (let nome in tempoPorMateria) {
        let meta = metaPorMateria[nome] || 25, recordeStr = formatarHoraAmigavel(recordePorMateria[nome] || 0);
        let htmlCard = `<li style="background:white;border:1px solid #e1e8ed;border-radius:8px;padding:15px;list-style:none;">
            <strong style="color:#2c3e50;font-size:1.2em;">${nome}</strong><br>
            <span style="font-size:0.9em;color:#7f8c8d;">🏆 Recorde: <b>${recordeStr}</b> | 🎯 Meta atual: <b>${meta}min</b></span><br>
            <div style="margin-top:12px;font-size:0.9em;color:#444;background:#f8f9fa;padding:10px;border-radius:5px;border-left:3px solid #3498db;">`;

        let temHistorico = false;
        for (let chave in tempoPorMes) {
            if (chave.startsWith(nome + " - ")) {
                htmlCard += `<div style="margin-bottom:5px;">📅 <b>${chave.replace(nome + " - ", "")}</b>: ${formatarHoraAmigavel(tempoPorMes[chave])}</div>`;
                temHistorico = true;
            }
        }
        if (!temHistorico) htmlCard += `<i>Sem histórico.</i>`;
        painel.innerHTML += htmlCard + `</div></li>`;
    }
}

/* ==========================================================
   6. GRÁFICOS (Chart.js)
   ========================================================== */
function atualizarGraficos() {
    const eixoXFormatador = { callback: function(value) {
        let mins = Math.round(value * 60), h = Math.floor(mins / 60), m = mins % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`; return `${m}m`;
    }};

    const canvasMes = document.getElementById("grafico-evolucao");
    if (canvasMes && typeof Chart !== 'undefined') {
        let materias = Object.keys(tempoPorMateria), mesesSet = new Set();
        for (let chave in tempoPorMes) mesesSet.add(chave.split(" - ")[1]);
        let cores = ['#3498db','#2ecc71','#e74c3c','#f1c40f','#9b59b6'], datasetsMeses = [];
        Array.from(mesesSet).sort().forEach((mes, index) => {
            let dados = materias.map(mat => ((tempoPorMes[mat + " - " + mes] || 0) / 3600).toFixed(4));
            datasetsMeses.push({ label: mes, data: dados, backgroundColor: cores[index % cores.length], borderRadius: 4 });
        });
        if (graficoEvolucao) graficoEvolucao.destroy();
        graficoEvolucao = new Chart(canvasMes, { type: 'bar', data: { labels: materias, datasets: datasetsMeses }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatarHoraAmigavel(c.raw * 3600)}` } } }, scales: { x: { ticks: eixoXFormatador } } } });
    }

    const canvasSemana = document.getElementById("grafico-semana");
    if (canvasSemana && typeof Chart !== 'undefined') {
        let hoje = new Date(), diff = hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1), segunda = new Date(new Date().setDate(diff));
        let diasNomes = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"], materias = Object.keys(tempoPorMateria);
        let cores = ['#1abc9c','#3498db','#9b59b6','#e67e22','#e74c3c','#f1c40f','#34495e'], datasetsMaterias = [];
        materias.forEach((mat, index) => {
            let dadosDaMateria = [];
            for (let i = 0; i < 7; i++) {
                let dAtual = new Date(segunda); dAtual.setDate(segunda.getDate() + i);
                let dataStr = `${String(dAtual.getDate()).padStart(2,"0")}-${String(dAtual.getMonth()+1).padStart(2,"0")}-${dAtual.getFullYear()}`;
                dadosDaMateria.push(((tempoPorDiaMateria[`${mat} - ${dataStr}`] || 0) / 3600).toFixed(4));
            }
            datasetsMaterias.push({ label: mat, data: dadosDaMateria, backgroundColor: cores[index % cores.length], borderRadius: 2 });
        });
        if (graficoSemana) graficoSemana.destroy();
        graficoSemana = new Chart(canvasSemana, { type: 'bar', data: { labels: diasNomes, datasets: datasetsMaterias }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatarHoraAmigavel(c.raw * 3600)}` } } }, scales: { x: { stacked: true, ticks: eixoXFormatador }, y: { stacked: true } } } });
    }
}

/* ==========================================================
   7. SALVAR NA NUVEM E LOCAL (Com Rota Dinâmica)
   ========================================================== */
async function salvarDadosNaNuvem() {
    if (!caminhoNuvem) return; // Se não houver usuário logado, não salva
    const payload = { tempoPorMateria, recordePorMateria, metaPorMateria, tempoPorMes, tempoPorDiaMateria };
    try { await set(ref(db, caminhoNuvem), payload); } catch (erro) { console.error("Erro Firebase:", erro); }
    
    // O LocalStorage continua salvando offline no PC local
    localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria));
    localStorage.setItem("recordePorMateria", JSON.stringify(recordePorMateria));
    localStorage.setItem("metaPorMateria", JSON.stringify(metaPorMateria));
    localStorage.setItem("tempoPorMes", JSON.stringify(tempoPorMes));
    localStorage.setItem("tempoPorDiaMateria", JSON.stringify(tempoPorDiaMateria));
}

/* ==========================================================
   8. EVENTOS DOS BOTÕES
   ========================================================== */
btnPularDescanso.addEventListener("click", () => { clearInterval(intervaloId); intervaloId = null; modoAtual = "foco"; tempoAcumulado = 0; painelFoco.classList.remove("escondido"); painelDescanso.classList.add("escondido"); });
btnIniciar.addEventListener("click", () => { if (materia.value.trim() === "") { alert("Selecione uma matéria!"); return; } if (intervaloId === null) { tempoInicio = Date.now() - tempoAcumulado; intervaloId = setInterval(incrementarTempo, 10); } materia.disabled = true; });
btnPausar.addEventListener("click", () => { if (intervaloId !== null) { clearInterval(intervaloId); intervaloId = null; tempoAcumulado = Date.now() - tempoInicio; } });

btnConcluir.addEventListener("click", async () => {
    clearInterval(intervaloId); intervaloId = null;
    let s = segundos + (minutos * 60) + (horas * 3600), nome = materia.value.toUpperCase();
    if (s === 0) { materia.disabled = false; return; }

    let hoje = new Date(), dia = String(hoje.getDate()).padStart(2,"0"), mes = String(hoje.getMonth() + 1).padStart(2,"0"), ano = hoje.getFullYear();
    let mAtual = metaPorMateria[nome] || 25;
    if (s >= mAtual * 60 && mAtual < limiteMaximo) { let excesso = s - (mAtual * 60), incremento = Math.round(excesso / 60) + 1; metaPorMateria[nome] = Math.min(limiteMaximo, mAtual + incremento); }

    let kDia = `${nome} - ${dia}-${mes}-${ano}`; tempoPorDiaMateria[kDia] = (tempoPorDiaMateria[kDia] || 0) + s;
    let kMes = `${nome} - ${mes}-${ano}`; tempoPorMes[kMes] = (tempoPorMes[kMes] || 0) + s;
    tempoPorMateria[nome] = (tempoPorMateria[nome] || 0) + s;
    if (s > (recordePorMateria[nome] || 0)) recordePorMateria[nome] = s;

    materia.disabled = false;
    await salvarDadosNaNuvem();

    segundos = 0; minutos = 0; horas = 0; tempoAcumulado = 0; milissegundos = 0; visor.textContent = "00:00:00:00"; ultimoAviso = 0;
    carregarBotoesRapidos(); atualizarPlacarMensal(); atualizarResumoRapido(); atualizarGraficos();

    if (s >= 60) { modoAtual = "descanso"; tempoAcumulado = Math.max(1, Math.round(s * 0.20)) * 1000; tempoInicio = Date.now(); painelFoco.classList.add("escondido"); painelDescanso.classList.remove("escondido"); intervaloId = setInterval(incrementarTempo, 10); }
});

document.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); intervaloId === null ? btnIniciar.click() : btnPausar.click(); } else if (e.key === "Escape") { btnConcluir.click(); } });

/* ==========================================================
   9. EXPORTAR RELATÓRIO (.txt)
   ========================================================== */
const btnExportar = document.getElementById("btn-exportar");
if (btnExportar) { btnExportar.addEventListener("click", () => {
    let relatorio = "=========================================\n   RELATÓRIO MESTRE DE FOCO — ORFEU\n   Gerado em: " + new Date().toLocaleString("pt-BR") + "\n=========================================\n\n1. TOTAL HISTÓRICO POR MATÉRIA\n-----------------------------------------\n";
    for (let mat in tempoPorMateria) relatorio += `- ${mat}: ${formatarHoraAmigavel(tempoPorMateria[mat])}\n`;
    relatorio += "\n2. HISTÓRICO MENSAL\n-----------------------------------------\n";
    for (let chave in tempoPorMes) relatorio += `- ${chave}: ${formatarHoraAmigavel(tempoPorMes[chave])}\n`;
    relatorio += "\n3. DIÁRIO DE BORDO\n-----------------------------------------\n";
    for (let chave in tempoPorDiaMateria) relatorio += `- ${chave}: ${formatarHoraAmigavel(tempoPorDiaMateria[chave])}\n`;
    relatorio += "\n=========================================\nFim do Relatório.";
    let blob = new Blob([relatorio], { type: "text/plain;charset=utf-8" }), link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `Relatorio_ORFEU_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
});}

/* ==========================================================
   10. INICIALIZAÇÃO E DOWNLOAD DE DADOS
   ========================================================== */
async function iniciarSistema() {
   async function iniciarSistema() {
    // Pede permissão para mandar notificações no sistema (Celular e PC)
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
    
    if (!caminhoNuvem) return; 
    // ... resto do código da função que já está lá ...
}
    if (!caminhoNuvem) return; // Exige usuário logado

    try {
        const resposta = await get(child(ref(db), caminhoNuvem));
        if (resposta.exists()) {
            let d = resposta.val();
            tempoPorMateria = d.tempoPorMateria || {}; recordePorMateria = d.recordePorMateria || {}; metaPorMateria = d.metaPorMateria || {}; tempoPorMes = d.tempoPorMes || {}; tempoPorDiaMateria = d.tempoPorDiaMateria || {};
        } else {
            // Conta nova! Sincroniza o que já estava no seu PC para a nuvem
            let dMat = localStorage.getItem("tempoPorMateria");
            if (dMat) { 
                tempoPorMateria = JSON.parse(dMat); recordePorMateria = JSON.parse(localStorage.getItem("recordePorMateria") || "{}"); metaPorMateria = JSON.parse(localStorage.getItem("metaPorMateria") || "{}"); tempoPorMes = JSON.parse(localStorage.getItem("tempoPorMes") || "{}"); tempoPorDiaMateria = JSON.parse(localStorage.getItem("tempoPorDiaMateria") || "{}"); 
                await salvarDadosNaNuvem(); 
            }
        }
    } catch (erro) {
        console.warn("Offline. Usando dados locais.", erro); 
        let dMat = localStorage.getItem("tempoPorMateria");
        if (dMat) { tempoPorMateria = JSON.parse(dMat); recordePorMateria = JSON.parse(localStorage.getItem("recordePorMateria") || "{}"); metaPorMateria = JSON.parse(localStorage.getItem("metaPorMateria") || "{}"); tempoPorMes = JSON.parse(localStorage.getItem("tempoPorMes") || "{}"); tempoPorDiaMateria = JSON.parse(localStorage.getItem("tempoPorDiaMateria") || "{}"); }
    }
    carregarBotoesRapidos(); atualizarPlacarMensal(); atualizarResumoRapido(); atualizarGraficos();
}
