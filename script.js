/* ==========================================================
   0. FIREBASE — Conexão com a Nuvem
   ========================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

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

/* ==========================================================
   1. VARIÁVEIS DE ESTADO
   ========================================================== */
let tempoInicio    = 0;
let tempoAcumulado = 0;
let milissegundos  = 0;
let segundos       = 0;
let minutos        = 0;
let horas          = 0;
let intervaloId    = null;
let modoAtual      = "foco";
let ultimoAviso    = 0;
let limiteMaximo   = 52;

let graficoEvolucao = null;
let graficoSemana   = null;

let tempoPorMateria    = {};
let recordePorMateria  = {};
let metaPorMateria     = {};
let tempoPorMes        = {};
let tempoPorDiaMateria = {};

/* ==========================================================
   2. CONEXÕES COM O HTML
   ========================================================== */
const somAlarme = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
somAlarme.loop = true;

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
   3. FORMATAÇÃO DE TEMPO
   ========================================================== */
function formatarHoraAmigavel(segundosTotais) {
    let h = Math.floor(segundosTotais / 3600);
    let m = Math.floor((segundosTotais % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m === 0 && h === 0) return "0m";
    return `${m}m`;
}

/* ==========================================================
   4. MOTOR DO TEMPO — roda a cada 10ms
   ========================================================== */
function incrementarTempo() {
    let diferencaMs = Date.now() - tempoInicio;

    // MODO DESCANSO — timer regressivo
    if (modoAtual === "descanso") {
        let tempoRestante = tempoAcumulado - diferencaMs;

        if (tempoRestante <= 0) {
            clearInterval(intervaloId);
            intervaloId = null;
            modoAtual = "foco";
            painelFoco.classList.remove("escondido");
            painelDescanso.classList.add("escondido");
            tempoAcumulado = 0;
            somAlarme.play();
            alert("Descanso concluído! Hora de voltar ao foco.");
            somAlarme.pause();
            somAlarme.currentTime = 0;
            return;
        }

        let totalS = Math.floor(tempoRestante / 1000);
        let h = Math.floor(totalS / 3600);
        let m = Math.floor((totalS % 3600) / 60);
        let s = totalS % 60;
        visorDescanso.textContent = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
        return;
    }

    // MODO FOCO — timer progressivo
    horas        = Math.floor(diferencaMs / 3600000);
    minutos      = Math.floor((diferencaMs % 3600000) / 60000);
    segundos     = Math.floor((diferencaMs % 60000) / 1000);
    milissegundos = Math.floor((diferencaMs % 1000) / 10);

    let segundosTotais = Math.floor(diferencaMs / 1000);
    let nome     = materia.value.toUpperCase();
    let metaAtual = metaPorMateria[nome] || 25;

    // Alerta quando bate a meta (máximo 1 alerta a cada 10 minutos)
    if (segundosTotais >= metaAtual * 60 && segundosTotais - ultimoAviso >= 600) {
        somAlarme.play();
        document.title = "⚠️ META ATINGIDA!";
        let resposta = confirm("Meta atingida! Clique em OK para descansar ou Cancelar para continuar.");
        somAlarme.pause();
        somAlarme.currentTime = 0;
        document.title = "ORFEU";
        ultimoAviso = segundosTotais;
        if (resposta) btnConcluir.click();
    }

    visor.textContent = `${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}:${String(segundos).padStart(2,"0")}:${String(milissegundos).padStart(2,"0")}`;
}

/* ==========================================================
   5. RENDERIZAÇÃO DA TELA
   ========================================================== */
function atualizarResumoRapido() {
    const painel = document.getElementById("resumo-rapido");
    if (!painel) return;

    let hoje   = new Date();
    let strHoje = `${String(hoje.getDate()).padStart(2,"0")}/${String(hoje.getMonth()+1).padStart(2,"0")}/${hoje.getFullYear()}`;
    let strMes  = `${String(hoje.getMonth()+1).padStart(2,"0")}/${hoje.getFullYear()}`;

    let totalHoje = 0, totalSemana = 0, totalMes = 0;

    for (let chave in tempoPorDiaMateria) {
        if (chave.endsWith(strHoje)) totalHoje += tempoPorDiaMateria[chave];
    }
    for (let chave in tempoPorMes) {
        if (chave.endsWith(strMes)) totalMes += tempoPorMes[chave];
    }

    let diaDaSemana = hoje.getDay();
    let diff = hoje.getDate() - diaDaSemana + (diaDaSemana === 0 ? -6 : 1);
    let segunda = new Date(new Date().setDate(diff));

    for (let i = 0; i < 7; i++) {
        let dAtual = new Date(segunda);
        dAtual.setDate(segunda.getDate() + i);
        let chaveData = `${String(dAtual.getDate()).padStart(2,"0")}/${String(dAtual.getMonth()+1).padStart(2,"0")}/${dAtual.getFullYear()}`;
        for (let chave in tempoPorDiaMateria) {
            if (chave.endsWith(chaveData)) totalSemana += tempoPorDiaMateria[chave];
        }
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
    if (!areaBotoes) return;
    areaBotoes.innerHTML = "";

    for (let nome in tempoPorMateria) {
        let btn = document.createElement("button");
        btn.textContent = nome;
        btn.style.cssText = "padding:8px 15px;cursor:pointer;border-radius:5px;border:1px solid #ccc;background-color:#f8f9fa;font-weight:bold;";
        btn.addEventListener("click", () => { materia.value = nome; });
        btn.addEventListener("contextmenu", async (e) => {
            e.preventDefault();
            if (confirm(`Apagar histórico de "${nome}"?`)) {
                delete tempoPorMateria[nome];
                delete recordePorMateria[nome];
                delete metaPorMateria[nome];
                await salvarDadosNaNuvem();
                carregarBotoesRapidos();
                atualizarPlacarMensal();
                atualizarResumoRapido();
                atualizarGraficos();
            }
        });
        areaBotoes.appendChild(btn);
    }
}

function atualizarPlacarMensal() {
    const painel = document.getElementById("placar-mensal");
    if (!painel) return;
    painel.innerHTML = "";

    for (let nome in tempoPorMateria) {
        let meta      = metaPorMateria[nome] || 25;
        let recordeStr = formatarHoraAmigavel(recordePorMateria[nome] || 0);

        let htmlCard = `
            <li style="background:white;border:1px solid #e1e8ed;border-radius:8px;padding:15px;list-style:none;">
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
        if (!temHistorico) htmlCard += `<i>Sem histórico ainda.</i>`;
        painel.innerHTML += htmlCard + `</div></li>`;
    }
}

/* ==========================================================
   6. GRÁFICOS (Chart.js)
   ========================================================== */
function atualizarGraficos() {
    const eixoXFormatador = {
        callback: function(value) {
            let mins = Math.round(value * 60);
            let h = Math.floor(mins / 60);
            let m = mins % 60;
            if (h > 0 && m > 0) return `${h}h ${m}m`;
            if (h > 0) return `${h}h`;
            return `${m}m`;
        }
    };

    // Gráfico Mensal
    const canvasMes = document.getElementById("grafico-evolucao");
    if (canvasMes && typeof Chart !== 'undefined') {
        let materias  = Object.keys(tempoPorMateria);
        let mesesSet  = new Set();
        for (let chave in tempoPorMes) mesesSet.add(chave.split(" - ")[1]);

        let cores = ['#3498db','#2ecc71','#e74c3c','#f1c40f','#9b59b6'];
        let datasetsMeses = [];

        Array.from(mesesSet).sort().forEach((mes, index) => {
            let dados = materias.map(mat => ((tempoPorMes[mat + " - " + mes] || 0) / 3600).toFixed(4));
            datasetsMeses.push({ label: mes, data: dados, backgroundColor: cores[index % cores.length], borderRadius: 4 });
        });

        if (graficoEvolucao) graficoEvolucao.destroy();
        graficoEvolucao = new Chart(canvasMes, {
            type: 'bar',
            data: { labels: materias, datasets: datasetsMeses },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatarHoraAmigavel(c.raw * 3600)}` } } },
                scales: { x: { ticks: eixoXFormatador } }
            }
        });
    }

    // Gráfico Semanal
    const canvasSemana = document.getElementById("grafico-semana");
    if (canvasSemana && typeof Chart !== 'undefined') {
        let hoje = new Date();
        let diff = hoje.getDate() - hoje.getDay() + (hoje.getDay() === 0 ? -6 : 1);
        let segunda = new Date(new Date().setDate(diff));

        let diasNomes   = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
        let materias    = Object.keys(tempoPorMateria);
        let cores       = ['#1abc9c','#3498db','#9b59b6','#e67e22','#e74c3c','#f1c40f','#34495e'];
        let datasetsMaterias = [];

        materias.forEach((mat, index) => {
            let dadosDaMateria = [];
            for (let i = 0; i < 7; i++) {
                let dAtual = new Date(segunda);
                dAtual.setDate(segunda.getDate() + i);
                let dataStr = `${String(dAtual.getDate()).padStart(2,"0")}/${String(dAtual.getMonth()+1).padStart(2,"0")}/${dAtual.getFullYear()}`;
                dadosDaMateria.push(((tempoPorDiaMateria[`${mat} - ${dataStr}`] || 0) / 3600).toFixed(4));
            }
            datasetsMaterias.push({ label: mat, data: dadosDaMateria, backgroundColor: cores[index % cores.length], borderRadius: 2 });
        });

        if (graficoSemana) graficoSemana.destroy();
        graficoSemana = new Chart(canvasSemana, {
            type: 'bar',
            data: { labels: diasNomes, datasets: datasetsMaterias },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatarHoraAmigavel(c.raw * 3600)}` } } },
                scales: { x: { stacked: true, ticks: eixoXFormatador }, y: { stacked: true } }
            }
        });
    }
}

/* ==========================================================
   7. SALVAR NA NUVEM E LOCAL
   ========================================================== */
async function salvarDadosNaNuvem() {
    const payload = {
        tempoPorMateria,
        recordePorMateria,
        metaPorMateria,
        tempoPorMes,
        tempoPorDiaMateria
    };
    try {
        await set(ref(db, 'usuario_oscar/dadosOrfeu'), payload);
    } catch (erro) {
        console.error("Erro Firebase:", erro);
    }
    // Salva sempre no localStorage como backup offline
    localStorage.setItem("tempoPorMateria",    JSON.stringify(tempoPorMateria));
    localStorage.setItem("recordePorMateria",  JSON.stringify(recordePorMateria));
    localStorage.setItem("metaPorMateria",     JSON.stringify(metaPorMateria));
    localStorage.setItem("tempoPorMes",        JSON.stringify(tempoPorMes));
    localStorage.setItem("tempoPorDiaMateria", JSON.stringify(tempoPorDiaMateria));
}

/* ==========================================================
   8. EVENTOS DOS BOTÕES
   ========================================================== */

// Pular descanso
btnPularDescanso.addEventListener("click", () => {
    clearInterval(intervaloId);
    intervaloId    = null;
    modoAtual      = "foco";
    tempoAcumulado = 0;
    painelFoco.classList.remove("escondido");
    painelDescanso.classList.add("escondido");
});

// Iniciar
btnIniciar.addEventListener("click", () => {
    if (materia.value.trim() === "") {
        alert("Digite ou selecione uma matéria primeiro!");
        return;
    }
    if (intervaloId === null) {
        tempoInicio = Date.now() - tempoAcumulado;
        intervaloId = setInterval(incrementarTempo, 10);
    }
    materia.disabled = true;
});

// Pausar
btnPausar.addEventListener("click", () => {
    if (intervaloId !== null) {
        clearInterval(intervaloId);
        intervaloId    = null;
        tempoAcumulado = Date.now() - tempoInicio;
    }
});

// Concluir sessão
btnConcluir.addEventListener("click", async () => {
    clearInterval(intervaloId);
    intervaloId = null;

    let s    = segundos + (minutos * 60) + (horas * 3600);
    let nome = materia.value.toUpperCase();

    if (s === 0) { materia.disabled = false; return; }

    let hoje = new Date();
    let dia  = String(hoje.getDate()).padStart(2,"0");
    let mes  = String(hoje.getMonth() + 1).padStart(2,"0");
    let ano  = hoje.getFullYear();

    // Atualiza meta com incremento inteligente
    let mAtual = metaPorMateria[nome] || 25;
    if (s >= mAtual * 60 && mAtual < limiteMaximo) {
        let excesso    = s - (mAtual * 60);
        let incremento = Math.round(excesso / 60) + 1;
        metaPorMateria[nome] = Math.min(limiteMaximo, mAtual + incremento);
    }

    // Acumula tempo por dia e matéria
    let kDia = `${nome} - ${dia}/${mes}/${ano}`;
    tempoPorDiaMateria[kDia] = (tempoPorDiaMateria[kDia] || 0) + s;

    // Acumula tempo por mês e matéria
    let kMes = `${nome} - ${mes}/${ano}`;
    tempoPorMes[kMes] = (tempoPorMes[kMes] || 0) + s;

    // Acumula total por matéria
    tempoPorMateria[nome] = (tempoPorMateria[nome] || 0) + s;

    // Atualiza recorde se essa sessão foi a maior
    if (s > (recordePorMateria[nome] || 0)) {
        recordePorMateria[nome] = s;
    }

    materia.disabled = false;

    await salvarDadosNaNuvem();

    // Reseta timer
    segundos = 0; minutos = 0; horas = 0;
    tempoAcumulado = 0; milissegundos = 0;
    visor.textContent = "00:00:00:00";
    ultimoAviso = 0;

    carregarBotoesRapidos();
    atualizarPlacarMensal();
    atualizarResumoRapido();
    atualizarGraficos();

    // Inicia descanso se sessão >= 1 minuto
    if (s >= 60) {
        modoAtual      = "descanso";
        tempoAcumulado = Math.max(1, Math.round(s * 0.20)) * 1000;
        tempoInicio    = Date.now();
        painelFoco.classList.add("escondido");
        painelDescanso.classList.remove("escondido");
        intervaloId    = setInterval(incrementarTempo, 10);
    }
});

// Atalhos de teclado
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        intervaloId === null ? btnIniciar.click() : btnPausar.click();
    } else if (e.key === "Escape") {
        btnConcluir.click();
    }
});

/* ==========================================================
   9. EXPORTAR RELATÓRIO (.txt)
   ========================================================== */
const btnExportar = document.getElementById("btn-exportar");
if (btnExportar) {
    btnExportar.addEventListener("click", () => {
        let relatorio  = "=========================================\n";
        relatorio += "   RELATÓRIO MESTRE DE FOCO — ORFEU\n";
        relatorio += `   Gerado em: ${new Date().toLocaleString("pt-BR")}\n`;
        relatorio += "=========================================\n\n";

        relatorio += "1. TOTAL HISTÓRICO POR MATÉRIA\n";
        relatorio += "-----------------------------------------\n";
        for (let mat in tempoPorMateria) {
            relatorio += `- ${mat}: ${formatarHoraAmigavel(tempoPorMateria[mat])}\n`;
        }

        relatorio += "\n2. HISTÓRICO MENSAL\n";
        relatorio += "-----------------------------------------\n";
        for (let chave in tempoPorMes) {
            relatorio += `- ${chave}: ${formatarHoraAmigavel(tempoPorMes[chave])}\n`;
        }

        relatorio += "\n3. DIÁRIO DE BORDO (por dia e matéria)\n";
        relatorio += "-----------------------------------------\n";
        for (let chave in tempoPorDiaMateria) {
            relatorio += `- ${chave}: ${formatarHoraAmigavel(tempoPorDiaMateria[chave])}\n`;
        }

        relatorio += "\n=========================================\n";
        relatorio += "Fim do Relatório.";

        let blob = new Blob([relatorio], { type: "text/plain;charset=utf-8" });
        let url  = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = `Relatorio_ORFEU_${new Date().toISOString().split("T")[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

/* ==========================================================
   10. INICIALIZAÇÃO — carrega dados ao abrir o app
   ========================================================== */
async function iniciarSistema() {
    try {
        const resposta = await get(child(ref(db), 'usuario_oscar/dadosOrfeu'));
        if (resposta.exists()) {
            let d = resposta.val();
            tempoPorMateria    = d.tempoPorMateria    || {};
            recordePorMateria  = d.recordePorMateria  || {};
            metaPorMateria     = d.metaPorMateria     || {};
            tempoPorMes        = d.tempoPorMes        || {};
            tempoPorDiaMateria = d.tempoPorDiaMateria || {};
        } else {
            // Tenta carregar do localStorage se Firebase estiver vazio
            let dMat = localStorage.getItem("tempoPorMateria");
            if (dMat) {
                tempoPorMateria    = JSON.parse(dMat);
                recordePorMateria  = JSON.parse(localStorage.getItem("recordePorMateria")  || "{}");
                metaPorMateria     = JSON.parse(localStorage.getItem("metaPorMateria")     || "{}");
                tempoPorMes        = JSON.parse(localStorage.getItem("tempoPorMes")        || "{}");
                tempoPorDiaMateria = JSON.parse(localStorage.getItem("tempoPorDiaMateria") || "{}");
                await salvarDadosNaNuvem(); // migra dados antigos pra nuvem
            }
        }
    } catch (erro) {
        // Modo offline — usa localStorage
        console.warn("Offline. Usando dados locais.");
        let dMat = localStorage.getItem("tempoPorMateria");
        if (dMat) {
            tempoPorMateria    = JSON.parse(dMat);
            recordePorMateria  = JSON.parse(localStorage.getItem("recordePorMateria")  || "{}");
            metaPorMateria     = JSON.parse(localStorage.getItem("metaPorMateria")     || "{}");
            tempoPorMes        = JSON.parse(localStorage.getItem("tempoPorMes")        || "{}");
            tempoPorDiaMateria = JSON.parse(localStorage.getItem("tempoPorDiaMateria") || "{}");
        }
    }

    carregarBotoesRapidos();
    atualizarPlacarMensal();
    atualizarResumoRapido();
    atualizarGraficos();
}

iniciarSistema();
