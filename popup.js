"use strict";

/**
 * DelCookies — Lógica do Popup
 * 
 * Gerencia a interface do popup: exibe o domínio da aba ativa,
 * detecta páginas internas, envia mensagem ao service worker
 * para deletar cookies e exibe o resultado ao usuário.
 */

// ============================================================
// PROTOCOLOS INTERNOS — páginas sem cookies
// ============================================================
const INTERNAL_PROTOCOLS = [
    "chrome:",
    "chrome-extension:",
    "about:",
    "edge:",
    "brave:",
    "file:"
];

// ── Referências aos elementos do DOM ──
let btnDelete;
let btnText;
let btnLoading;
let currentSiteEl;
let siteBadgeEl;
let resultMessage;

// ── Flag para controle de páginas internas ──
let isInternalPage = false;

/**
 * Verifica se uma URL pertence a uma página interna do navegador.
 * 
 * @param {string} url - URL a ser verificada.
 * @returns {boolean} true se for interna.
 */
function checkInternalPage(url) {
    if (!url) return true;
    return INTERNAL_PROTOCOLS.some(protocol => url.startsWith(protocol));
}

/**
 * Inicialização — Executada quando o DOM estiver pronto.
 * Configura referências aos elementos e exibe o site atual.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // Obter referências aos elementos do DOM
    btnDelete = document.getElementById("btn-delete");
    btnText = btnDelete.querySelector(".btn-text");
    btnLoading = btnDelete.querySelector(".btn-loading");
    currentSiteEl = document.getElementById("current-site");
    siteBadgeEl = document.getElementById("site-badge");
    resultMessage = document.getElementById("result-message");

    // Mostrar o site atual e configurar o botão
    await mostrarSiteAtual();
    configurarBotao();
});

/**
 * Exibe o domínio da aba ativa no popup.
 * 
 * Se a aba for uma página interna do navegador:
 *   - Exibe aviso visual
 *   - Desabilita o botão de deleção
 *   - Define flag isInternalPage = true
 */
async function mostrarSiteAtual() {
    try {
        // Consultar a aba ativa na janela atual
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url) {
            // Sem aba ativa — tratar como página interna
            exibirPaginaInterna();
            return;
        }

        // Verificar se é uma página interna do navegador
        if (checkInternalPage(tab.url)) {
            exibirPaginaInterna();
            return;
        }

        // Parsear a URL e exibir o hostname
        const url = new URL(tab.url);
        currentSiteEl.textContent = url.hostname;
    } catch (error) {
        console.error("[DelCookies] Erro ao obter site atual:", error);
        exibirPaginaInterna();
    }
}

/**
 * Configura o visual e estado do popup para páginas internas.
 * Desabilita o botão e exibe aviso no badge do site.
 */
function exibirPaginaInterna() {
    isInternalPage = true;
    currentSiteEl.textContent = "⚠️ Página interna — sem cookies";
    siteBadgeEl.classList.add("warning");
    btnDelete.disabled = true;
    btnText.textContent = "Indisponível nesta página";
}

/**
 * Configura o event listener do botão de deleção.
 */
function configurarBotao() {
    btnDelete.addEventListener("click", () => {
        // Prevenir múltiplos cliques durante o processamento
        if (btnDelete.disabled || isInternalPage) return;
        limparCookies();
    });
}

/**
 * Executa o fluxo de limpeza de cookies:
 * 1. Ativa estado de loading no botão
 * 2. Envia mensagem ao service worker (background.js)
 * 3. Exibe resultado com feedback visual
 * 4. Restaura o estado do botão
 */
async function limparCookies() {
    try {
        // ── Passo 1: Ativar estado de loading ──
        ativarLoading();

        // Esconder resultado anterior, se visível
        resultMessage.classList.add("hidden");
        resultMessage.classList.remove("success", "info", "error", "fade-in");

        // ── Passo 2: Enviar mensagem ao background ──
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { action: "DELETE_COOKIES_CURRENT_SITE" },
                (result) => {
                    // Verificar erros de comunicação
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(result);
                }
            );
        });

        // ── Passo 3: Exibir resultado ──
        exibirResultado(response);

    } catch (error) {
        // Erro de comunicação ou erro inesperado
        console.error("[DelCookies] Erro ao limpar cookies:", error);
        resultMessage.textContent = "❌ Erro ao limpar os cookies. Tente novamente.";
        resultMessage.className = "result error fade-in";
    } finally {
        // ── Passo 4: Restaurar botão ──
        desativarLoading();
    }
}

/**
 * Exibe a mensagem de resultado na interface do popup.
 * 
 * @param {Object} response - Resposta do background.js:
 *   { success, count, domain, total_found, error? }
 */
function exibirResultado(response) {
    if (!response) {
        // Resposta nula — erro inesperado
        resultMessage.textContent = "❌ Erro ao limpar os cookies. Tente novamente.";
        resultMessage.className = "result error fade-in";
        return;
    }

    if (response.error === "INTERNAL_PAGE") {
        // Página interna do navegador
        resultMessage.textContent = "⚠️ Não é possível limpar cookies de páginas internas.";
        resultMessage.className = "result info fade-in";
        return;
    }

    if (!response.success) {
        // Erro genérico retornado pelo background
        resultMessage.textContent = "❌ Erro ao limpar os cookies. Tente novamente.";
        resultMessage.className = "result error fade-in";
        return;
    }

    if (response.count > 0) {
        // Sucesso — cookies foram removidos
        resultMessage.textContent = `✅ ${response.count} cookie(s) de ${response.domain} removido(s) com sucesso!`;
        resultMessage.className = "result success fade-in";
    } else {
        // Sucesso — mas nenhum cookie encontrado
        resultMessage.textContent = `ℹ️ Nenhum cookie encontrado para ${response.domain}.`;
        resultMessage.className = "result info fade-in";
    }
}

/**
 * Ativa o estado de loading no botão.
 * Desabilita o botão e troca o texto pelo spinner.
 */
function ativarLoading() {
    btnDelete.disabled = true;
    btnText.classList.add("hidden");
    btnLoading.classList.remove("hidden");
}

/**
 * Desativa o estado de loading no botão.
 * Reabilita o botão e restaura o texto original.
 */
function desativarLoading() {
    btnDelete.disabled = false;
    btnText.classList.remove("hidden");
    btnLoading.classList.add("hidden");
}
