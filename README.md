# 🍪 DelCookies

**Limpe os cookies do site atual com um único clique.**

![Versão](https://img.shields.io/badge/versão-1.0.0-blue)
![Licença](https://img.shields.io/badge/licença-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow?logo=googlechrome)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange)

---

## 📖 Descrição

O **DelCookies** é uma extensão para Google Chrome que remove todos os cookies **apenas do site que você está visitando** na aba ativa. Nada de apagar todos os cookies do navegador — apenas os do domínio atual, com um único clique. Simples, rápido e seguro.

![Screenshot do DelCookies](screenshots/popup.png)

---

## ✨ Funcionalidades

- 🎯 Remoção de cookies **apenas do site atual** — nunca do navegador inteiro
- 🔢 Contagem exata de cookies removidos
- 🌐 Exibição do domínio atual antes da limpeza
- 🏷️ Badge no ícone com contagem temporária (desaparece após 3s)
- 🔔 Notificação nativa do sistema operacional
- 🌙 Interface moderna em dark mode
- 🛡️ Detecção automática de páginas internas do Chrome
- ⚡ Rápido e leve — sem dependências externas
- 🔒 Permissões mínimas necessárias

---

## 📦 Instalação

1. **Baixe ou clone** este repositório:
   ```bash
   git clone https://github.com/seu-usuario/DelCookies.git
   ```
2. Abra o Chrome e acesse **`chrome://extensions/`**
3. Ative o **"Modo do desenvolvedor"** (toggle no canto superior direito)
4. Clique em **"Carregar sem compactação"**
5. Selecione a pasta `DelCookies/`
6. ✅ O ícone 🍪 aparecerá na barra de ferramentas do Chrome

---

## 🚀 Como Usar

1. 🌐 Navegue até qualquer site (ex: `google.com`, `github.com`)
2. 🍪 Clique no ícone do **DelCookies** na barra de ferramentas
3. 👁️ Veja o domínio atual exibido no popup
4. 🗑️ Clique em **"Limpar Cookies deste Site"**
5. ✅ Veja a contagem de cookies removidos e o feedback visual!

---

## 🔐 Permissões e Privacidade

| Permissão | Por quê |
|---|---|
| `cookies` | Para acessar e remover cookies do site atual via API `chrome.cookies` |
| `activeTab` | Para identificar qual site está na aba ativa quando você clica na extensão |
| `tabs` | Para obter a URL da aba ativa via `chrome.tabs.query` |
| `notifications` | Para exibir a notificação nativa com a contagem de cookies removidos |
| `<all_urls>` | Para que a API de cookies funcione em qualquer site que você visite |

> 🔒 **Privacidade:** O DelCookies **não coleta, armazena ou transmite** nenhum dado. Tudo acontece localmente no seu navegador. Nenhuma informação sai do seu computador.

---

## 🛠️ Tecnologias

- **Chrome Extensions API** (Manifest V3)
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **SVG** (ícones vetoriais)
- Sem frameworks, sem dependências, sem build tools — **100% vanilla**

---

## 📁 Estrutura do Projeto

```
DelCookies/
│
├── manifest.json          # Configuração da extensão (Manifest V3)
├── background.js          # Service worker — lógica de deleção de cookies
├── popup.html             # Interface do popup
├── popup.css              # Estilização dark mode do popup
├── popup.js               # Lógica de interação do popup
├── icons/
│   ├── icon16.svg         # Ícone 16x16 (toolbar)
│   ├── icon32.svg         # Ícone 32x32
│   ├── icon48.svg         # Ícone 48x48 (página de extensões)
│   └── icon128.svg        # Ícone 128x128 (Chrome Web Store)
├── LICENSE                # Licença MIT
└── README.md              # Este arquivo
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga os passos abaixo:

1. **Fork** o repositório
2. Crie sua branch:
   ```bash
   git checkout -b feature/minha-feature
   ```
3. Faça commit das suas mudanças:
   ```bash
   git commit -m 'feat: descrição da feature'
   ```
4. Envie para a branch:
   ```bash
   git push origin feature/minha-feature
   ```
5. Abra um **Pull Request**

> 💡 **Dica:** Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/) para suas mensagens de commit.

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## ⚠️ Aviso Importante

A remoção de cookies é **irreversível**. Cookies removidos podem incluir:

- 🔑 Sessões de login (você será deslogado do site)
- ⚙️ Preferências e configurações do site
- 🛒 Itens no carrinho de compras

**Use com consciência.** O DelCookies remove apenas os cookies do site atual, mas isso pode afetar sua experiência naquele site.

---

<p align="center">
  Feito com ❤️ por <strong>DelCookies Contributors</strong>
</p>
