let tempoInicio = 0
let tempoAcumulado = 0
let milissegundos = 0
let segundos = 0
let minutos = 0
let horas = 0
let tempoPorMateria = {}
let intervaloId = null
let historico = []
let recordePorMateria = {}
let limiteMaximo = 52
let modoAtual = "foco"
let ultimoAviso = 0
let segundosTotais = 0
let metaPorMateria = {}

const somAlarme = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg")
somAlarme.loop = true

const materia = document.getElementById("materia")
const placar = document.getElementById("placar")
const visor = document.getElementById("visor")
const btnIniciar = document.getElementById("btn-iniciar")
const btnConcluir = document.getElementById("btn-concluir")
const btnPausar = document.getElementById("btn-pausar")
const listahistorico = document.getElementById("historico")
const painelDescanso = document.getElementById("painel-descanso")
const visorDescanso = document.getElementById("visor-descanso")
const btnPularDescanso = document.getElementById("btnPularDescanso")
const anelAnimado = document.querySelector(".anel-animado")

function incrementarTempo() {
    let diferencaMs = Date.now() - tempoInicio

    // 1. MOTOR REGRESSIVO (DESCANSO)
    if (modoAtual === "descanso") {
        let tempoRestante = tempoAcumulado - diferencaMs

        if (tempoRestante <= 0) {
            clearInterval(intervaloId)
            intervaloId = null
            modoAtual = "foco"
            
            document.getElementById("painel-foco").classList.remove("escondido")
            painelDescanso.classList.add("escondido")
            
            tempoAcumulado = 0
            tempoInicio = Date.now()
            
            alert("Tempo de descanso concluído! Retornando ao foco.")
            return;
        }

        let totalSegundosRestantes = Math.floor(tempoRestante / 1000)
        let h = Math.floor(totalSegundosRestantes / 3600)
        let m = Math.floor((totalSegundosRestantes % 3600) / 60)
        let s = totalSegundosRestantes % 60

        visorDescanso.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        
        // Calcula a porcentagem para o gráfico SVG
        let progresso = tempoRestante / (tempoAcumulado === 0 ? 1 : tempoAcumulado)
        anelAnimado.style.strokeDashoffset = 565 - (progresso * 565)
        
        return;
    }

    // 2. MOTOR PROGRESSIVO (FOCO)
    horas = Math.floor(diferencaMs / 3600000)
    minutos = Math.floor((diferencaMs % 3600000) / 60000)
    segundos = Math.floor((diferencaMs % 60000) / 1000)
    milissegundos = Math.floor((diferencaMs % 1000) / 10)

    segundosTotais = Math.floor(diferencaMs / 1000)
    let nomeMateria = materia.value.toUpperCase()
    let metaAtual = metaPorMateria[nomeMateria] || 25
    
    if (segundosTotais >= metaAtual * 60 && segundosTotais - ultimoAviso >= 600) {
        somAlarme.play()
        document.title = "⚠️ META ATINGIDA! ⚠️"
        let resposta = confirm("Você atingiu a meta, parabéns! Quer fazer uma pausa? \n Clique em 'OK' para descansar ou 'Cancelar' para continuar")

        somAlarme.pause()
        somAlarme.currentTime = 0
        document.title = "ORFEU"

        ultimoAviso = segundosTotais
        if(resposta === true) {
            btnConcluir.click()
        }
    }
    
    atualizarVisor()
}

function atualizarVisor() {
    let h = String(horas).padStart(2, "0")
    let m = String(minutos).padStart(2, "0")
    let s = String(segundos).padStart(2, "0")
    let msStr = String(milissegundos).padStart(2, "0")
    visor.textContent = `${h}:${m}:${s}:${msStr}`
}

function atualizarPlacar() {
    placar.innerHTML = ""
    for (let nomeMateria in tempoPorMateria) {
        let totalSegundos = tempoPorMateria[nomeMateria]
        let h = Math.floor(totalSegundos / 3600)
        let m = Math.floor((totalSegundos % 3600) / 60)
        let s = totalSegundos % 60
        let hStr = String(h).padStart(2, "0")
        let mStr = String(m).padStart(2, "0")
        let sStr = String(s).padStart(2, "0")
        let meta = metaPorMateria[nomeMateria] || 25
        let recorde = recordePorMateria[nomeMateria] || 0
        let rh = Math.floor(recorde / 3600)
        let rm = Math.floor((recorde % 3600) / 60)
        let rs = recorde % 60
        let rhStr = String(rh).padStart(2, "0")
        let rmStr = String(rm).padStart(2, "0")
        let rsStr = String(rs).padStart(2, "0")
        
        // Linha higienizada de formatações erradas
        placar.innerHTML += `<li> ${nomeMateria} - Meta: ${meta} min | Total: ${hStr}:${mStr}:${sStr} | Recorde: ${rhStr}:${rmStr}:${rsStr}</li>`
    }
}

function iniciarDescanso(segundosDeRecuperacao) {
    modoAtual = "descanso"
    
    document.getElementById("painel-foco").classList.add("escondido")
    painelDescanso.classList.remove("escondido")
    
    tempoInicio = Date.now()
    tempoAcumulado = segundosDeRecuperacao * 1000 
    
    if (intervaloId === null) {
        intervaloId = setInterval(incrementarTempo, 10)
    }
}

btnPularDescanso.addEventListener("click", function() {
    clearInterval(intervaloId)
    intervaloId = null
    modoAtual = "foco"

    document.getElementById("painel-foco").classList.remove("escondido")
    painelDescanso.classList.add("escondido")

    tempoAcumulado = 0
    tempoInicio = Date.now()
    atualizarVisor()
})

btnIniciar.addEventListener("click", function() {
    if (materia.value.trim() === ""){
        alert("Por favor, insira um nome de matéria antes de iniciar o cronômetro.")
        return;
    }
    if (intervaloId === null) {
        tempoInicio = Date.now() - tempoAcumulado
        intervaloId = setInterval(incrementarTempo, 10)
    }
    materia.disabled = true
})

btnPausar.addEventListener("click", function() {
    if (intervaloId !== null) {
        clearInterval(intervaloId)
        intervaloId = null
        tempoAcumulado = Date.now() - tempoInicio
    }
})

btnConcluir.addEventListener("click", function() {
    clearInterval(intervaloId)
    intervaloId = null

    let segundosDaSessao = segundos + (minutos * 60) + (horas * 3600)
    let nomeMateria = materia.value.toUpperCase()
    if (segundosDaSessao === 0) {
        return;
    }

    let relogio = new Date()
    let dia = String(relogio.getDate()).padStart(2, "0")
    let mes = String(relogio.getMonth() + 1).padStart(2, "0")
    let ano = relogio.getFullYear()
    let hora = String(relogio.getHours()).padStart(2, "0")
    let minuto = String(relogio.getMinutes()).padStart(2, "0")
    let segundo = String(relogio.getSeconds()).padStart(2, "0")
    let dataCompleta = `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`
    
    let statusSessao = ""
    let metaAtual = metaPorMateria[nomeMateria] || 25

    if (segundosDaSessao >= metaAtual * 60) {
        statusSessao = "Meta atingida"
    } else {
        statusSessao = "Meta não atingida"
    }
    if (statusSessao === "Meta atingida" && metaAtual < limiteMaximo) {
        let excesso = segundosDaSessao - (metaAtual * 60)
        let incremento = Math.round(excesso / 60) + 1
        metaPorMateria[nomeMateria] = metaAtual + incremento
    }
    if (metaPorMateria[nomeMateria] > limiteMaximo) {
        metaPorMateria[nomeMateria] = limiteMaximo
    }

    if (tempoPorMateria[nomeMateria] === undefined) {
        tempoPorMateria[nomeMateria] = segundosDaSessao
    } else {
        tempoPorMateria[nomeMateria] += segundosDaSessao
    }

    if (recordePorMateria[nomeMateria] === undefined) {
        recordePorMateria[nomeMateria] = 0
    }
    if (segundosDaSessao > recordePorMateria[nomeMateria]) {
        recordePorMateria[nomeMateria] = segundosDaSessao
    }

    // A Injeção Correta do Banco de Dados
    historico.unshift({
        materia: materia.value,
        tempo: visor.textContent,
        data: dataCompleta,
        status: statusSessao,
        timestampUnix: Date.now()
    })

    while (historico.length > 5 ){
        historico.pop()
    }
      
    listahistorico.innerHTML = ""
    historico.forEach(function(sessao) {
        let textoData = sessao.data ? ` - ${sessao.data}` : ""
        let textoStatus = sessao.status ? ` - ${sessao.status}` : ""
        // Linha higienizada
        listahistorico.innerHTML += `<li>${textoData} | ${sessao.materia} - Tempo: ${sessao.tempo} ${textoStatus}</li>`
    })

    materia.disabled = false

    localStorage.setItem("historico", JSON.stringify(historico))
    localStorage.setItem("tempoPorMateria", JSON.stringify(tempoPorMateria))
    localStorage.setItem("recordePorMateria", JSON.stringify(recordePorMateria))
    localStorage.setItem("metaPorMateria", JSON.stringify(metaPorMateria))

    segundos = 0
    minutos = 0
    horas = 0
    tempoAcumulado = 0
    milissegundos = 0

    atualizarVisor()
    atualizarPlacar()
    
    // Blindagem Matemática do Descanso restaurada
    let tempoDescanso = Math.max(1, Math.round(segundosDaSessao * 0.20))
    iniciarDescanso(tempoDescanso)
})

// O MOTOR DO TECLADO (OTIMIZADO)
document.addEventListener("keydown", function(evento) {
    if (evento.key === "Enter") {
        evento.preventDefault() // Evita qualquer comportamento padrão indesejado da tecla Enter
        
        if (intervaloId === null) {
            btnIniciar.click()
        } else {
            btnPausar.click()
        }
    } else if (evento.key === "Escape") {
        btnConcluir.click()
    }
})

// CARREGAMENTO INICIAL DO BANCO DE DADOS
let dados = localStorage.getItem("tempoPorMateria")
if (dados !== null) {
    tempoPorMateria = JSON.parse(dados)
}

let dadosRecorde = localStorage.getItem("recordePorMateria")
if (dadosRecorde !== null) {
    recordePorMateria = JSON.parse(dadosRecorde)
}

let nomeHistorico = localStorage.getItem("historico")
if (nomeHistorico !== null) {
    historico = JSON.parse(nomeHistorico)
    historico.forEach(function(sessao) {
        let textoData = sessao.data ? ` - ${sessao.data}` : ""
        let textoStatus = sessao.status ? ` - ${sessao.status}` : ""
        listahistorico.innerHTML += `<li>${textoData} | ${sessao.materia} - Tempo: ${sessao.tempo} ${textoStatus}</li>`
    })
}

let metaSalvas = localStorage.getItem("metaPorMateria")
if (metaSalvas !== null) {
    metaPorMateria = JSON.parse(metaSalvas)
}
atualizarPlacar()