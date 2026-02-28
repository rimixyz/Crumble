"use strict";

/**
 * DelCookies — Service Worker (Background Script)
 * 
 * Este é o coração da extensão. Contém toda a lógica de busca,
 * deduplicação e remoção de cookies do site/domínio da aba ativa.
 * 
 * Funciona como service worker (Manifest V3) — stateless, ativado
 * sob demanda pelo Chrome quando uma mensagem é recebida.
 */

// ============================================================
// PROTOCOLOS INTERNOS — URLs que não possuem cookies
// ============================================================
const INTERNAL_PROTOCOLS = [
    "chrome:",
    "chrome-extension:",
    "about:",
    "edge:",
    "brave:",
    "file:"
];

/**
 * Verifica se uma URL pertence a uma página interna do navegador.
 * 
 * @param {string} url - A URL completa da aba ativa.
 * @returns {boolean} true se for página interna, false caso contrário.
 */
function isInternalPage(url) {
    if (!url) return true;
    return INTERNAL_PROTOCOLS.some(protocol => url.startsWith(protocol));
}

/**
 * Extrai o domínio base (registrável) a partir de um hostname.
 * 
 * Exemplos:
 *   "www.google.com"       → "google.com"
 *   "mail.google.com"      → "google.com"
 *   "sub.example.co.uk"    → "example.co.uk"
 *   "example.com"          → "example.com"
 *   "localhost"             → "localhost"
 * 
 * Abordagem prática: se o hostname possui 3+ partes separadas por ".",
 * remove a primeira parte (subdomínio). Trata TLDs compostos como .co.uk.
 * 
 * @param {string} hostname - O hostname completo (ex: "www.google.com").
 * @returns {string} O domínio base extraído.
 */
function getBaseDomain(hostname) {
    const parts = hostname.split(".");

    // Domínios simples (ex: "localhost") ou com apenas 2 partes (ex: "example.com")
    if (parts.length <= 2) {
        return hostname;
    }

    // TLDs compostos conhecidos (ex: .co.uk, .com.br, .org.uk)
    const compoundTLDs = [
        "co.uk", "com.br", "com.au", "co.jp", "co.kr", "co.in",
        "com.mx", "com.ar", "com.cn", "org.uk", "net.au", "org.br",
        "gov.br", "edu.br", "co.za", "co.nz", "com.sg", "com.hk",
        "com.tw", "com.tr", "com.pk", "com.ng", "com.eg", "com.ph"
    ];

    // Verificar se as duas últimas partes formam um TLD composto
    const lastTwo = parts.slice(-2).join(".");
    if (compoundTLDs.includes(lastTwo) && parts.length > 3) {
        // Ex: "sub.example.co.uk" → "example.co.uk"
        return parts.slice(-3).join(".");
    }

    // Caso padrão: remover o primeiro subdomínio
    // Ex: "www.google.com" → "google.com"
    // Ex: "mail.google.com" → "google.com"
    return parts.slice(-2).join(".");
}

/**
 * Atualiza o badge (emblema) no ícone da extensão na toolbar.
 * 
 * - count > 0: badge verde (#4CAF50) com o número
 * - count === 0: badge cinza (#757575) com "0"
 * - Após 3 segundos, o badge é removido automaticamente
 * 
 * @param {number} count - Quantidade de cookies removidos.
 */
function updateBadge(count) {
    const text = count.toString();
    const color = count > 0 ? "#4CAF50" : "#757575";

    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ color: color });

    // Limpar o badge após 3 segundos
    setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
    }, 3000);
}

/**
 * Envia uma notificação nativa do sistema operacional via chrome.notifications.
 * 
 * Nota: SVGs podem não ser suportados como iconUrl em notificações nativas.
 * Nesse caso, o Chrome usará um ícone padrão. Para compatibilidade máxima,
 * seria ideal ter um PNG, mas usamos SVG conforme requisitos do projeto.
 * 
 * @param {number} count - Quantidade de cookies removidos.
 * @param {string} domain - O domínio do site processado.
 */
function sendNotification(count, domain) {
    const notificationId = "delcookies-" + Date.now();

    const message = count > 0
        ? `${count} cookie(s) de ${domain} removido(s)!`
        : `Nenhum cookie encontrado para ${domain}.`;

    try {
        chrome.notifications.create(notificationId, {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "DelCookies",
            message: message,
            priority: 0
        });

        // Auto-fechar notificação após 4 segundos
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, 4000);
    } catch (error) {
        // Se notificações não estiverem disponíveis, apenas logar
        console.warn("[DelCookies] Não foi possível enviar notificação:", error.message);
    }
}

/**
 * Função principal — Deleta todos os cookies do domínio da aba ativa.
 * 
 * Fluxo:
 *   1. Obtém a aba ativa e sua URL
 *   2. Verifica se é página interna (retorna erro se for)
 *   3. Extrai hostname e domínio base
 *   4. Busca cookies por múltiplas variações de domínio
 *   5. Deduplica cookies encontrados via Map
 *   6. Remove cada cookie com Promise.allSettled
 *   7. Atualiza badge e envia notificação
 *   8. Retorna resultado com contagem
 * 
 * @returns {Promise<Object>} Resultado da operação:
 *   { success: boolean, count: number, domain: string, total_found: number, error?: string }
 */
async function deleteCookiesFromCurrentTab() {
    // ── Passo 1: Obter a aba ativa ──
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
        return {
            success: false,
            count: 0,
            domain: "",
            error: "INTERNAL_PAGE"
        };
    }

    // ── Passo 2: Verificar se é página interna ──
    if (isInternalPage(tab.url)) {
        return {
            success: false,
            count: 0,
            domain: "",
            error: "INTERNAL_PAGE"
        };
    }

    // ── Passo 3: Extrair o domínio ──
    const url = new URL(tab.url);
    const hostname = url.hostname;
    const baseDomain = getBaseDomain(hostname);

    // ── Passo 4: Buscar cookies por múltiplas variações ──
    // Realizamos múltiplas buscas para capturar todos os cookies relevantes
    const searchPromises = [
        // Busca exata pelo hostname (ex: "www.google.com")
        chrome.cookies.getAll({ domain: hostname }),
        // Busca com ponto prefixado (ex: ".www.google.com")
        chrome.cookies.getAll({ domain: "." + hostname }),
        // Busca pela URL completa (pode capturar cookies adicionais)
        chrome.cookies.getAll({ url: tab.url })
    ];

    // Se o domínio base for diferente do hostname, buscar também pelo base
    if (baseDomain !== hostname) {
        // Busca pelo domínio base (ex: "google.com")
        searchPromises.push(chrome.cookies.getAll({ domain: baseDomain }));
        // Busca com ponto no domínio base (ex: ".google.com")
        searchPromises.push(chrome.cookies.getAll({ domain: "." + baseDomain }));
    }

    // Executar todas as buscas em paralelo
    const searchResults = await Promise.allSettled(searchPromises);

    // Coletar todos os cookies encontrados em um único array
    const allCookies = [];
    for (const result of searchResults) {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
            allCookies.push(...result.value);
        }
    }

    // ── Passo 5: Deduplicar cookies ──
    // Usar Map com chave composta para eliminar duplicatas
    const uniqueMap = new Map();
    for (const cookie of allCookies) {
        const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
        uniqueMap.set(key, cookie);
    }
    const uniqueCookies = Array.from(uniqueMap.values());

    // Se não há cookies, retornar imediatamente
    if (uniqueCookies.length === 0) {
        updateBadge(0);
        sendNotification(0, hostname);
        return {
            success: true,
            count: 0,
            domain: hostname,
            total_found: 0
        };
    }

    // ── Passo 6: Deletar cada cookie ──
    // Usar Promise.allSettled para que falhas individuais não interrompam o processo
    const deletePromises = uniqueCookies.map(cookie => {
        try {
            // Montar a URL correta para remoção
            const protocol = cookie.secure ? "https" : "http";
            const cleanDomain = cookie.domain.startsWith(".")
                ? cookie.domain.substring(1)
                : cookie.domain;
            const cookieUrl = `${protocol}://${cleanDomain}${cookie.path}`;

            return chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
        } catch (error) {
            // Se houver erro ao montar a URL, retornar null (será contado como falha)
            console.warn(`[DelCookies] Erro ao preparar remoção do cookie "${cookie.name}":`, error.message);
            return Promise.resolve(null);
        }
    });

    const deleteResults = await Promise.allSettled(deletePromises);

    // Contar quantos foram removidos com sucesso
    // Um cookie é considerado removido se o status é "fulfilled" e o resultado não é null
    let removedCount = 0;
    for (const result of deleteResults) {
        if (result.status === "fulfilled" && result.value !== null) {
            removedCount++;
        }
    }

    // ── Passo 7: Atualizar badge e enviar notificação ──
    updateBadge(removedCount);
    sendNotification(removedCount, hostname);

    // ── Passo 8: Retornar resultado ──
    return {
        success: true,
        count: removedCount,
        domain: hostname,
        total_found: uniqueCookies.length
    };
}

// ============================================================
// LISTENER DE MENSAGENS
// Recebe mensagens do popup.js e executa a ação correspondente
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "DELETE_COOKIES_CURRENT_SITE") {
        deleteCookiesFromCurrentTab()
            .then(result => sendResponse(result))
            .catch(error => {
                console.error("[DelCookies] Erro na deleção de cookies:", error);
                sendResponse({
                    success: false,
                    count: 0,
                    domain: "",
                    error: error.message
                });
            });

        // CRUCIAL: retornar true mantém o canal de mensagem aberto
        // para a resposta assíncrona via sendResponse
        return true;
    }
});
