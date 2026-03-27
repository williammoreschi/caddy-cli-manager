# Caddy CLI Manager

[![npm](https://img.shields.io/npm/v/caddy-cli-manager)](https://www.npmjs.com/package/caddy-cli-manager)
[![license](https://img.shields.io/github/license/williammoreschi/caddy-cli-manager)](LICENSE)

CLI simples para gerenciar o **Caddyfile** de forma rápida e interativa, com zero dependências externas.

CLI simples para gerenciar o **Caddyfile** de forma rápida e interativa, com zero dependências externas.

Ideal para quem trabalha com múltiplos projetos locais e precisa criar/remover domínios com frequência.

## 🎥 Preview

<p align="center">
  <img src="https://raw.githubusercontent.com/williammoreschi/caddy-cli-manager/main/docs/preview.gif" alt="preview" />
</p>

## ⚡ Zero dependências

Este projeto foi desenvolvido utilizando apenas módulos nativos do Node.js.

Isso significa:

- 🚀 Instalação rápida
- 🔒 Mais segurança (sem dependências externas)
- 🧩 Fácil manutenção
- 💡 Código simples e direto

## ⚠️ Requisitos

Este CLI foi desenvolvido para uso com o Caddy.

Certifique-se de ter o Caddy instalado antes de utilizar a ferramenta.

### Instalação do Caddy

- 🌐 Guia oficial: https://caddyserver.com/docs/install

### Windows (winget)

```bash
winget install -e --id CaddyServer.Caddy
```

### WSL / Linux

```bash
sudo apt install caddy
```

---

## 📦 Instalação

```bash
npm install -g caddy-cli-manager
```

---

## 🚀 Uso

```bash
caddy-cli
```

---

## ⚙️ Primeira execução

Na primeira vez, o CLI irá solicitar o caminho do seu `Caddyfile`.

Exemplos:

```bash
C:\caddy\Caddyfile
```

ou (WSL/Linux):

```bash
/mnt/c/caddy/Caddyfile
```

O caminho será salvo automaticamente em:

```bash
~/.caddy-cli.json
```

---

## ✨ Funcionalidades

- ➕ Adicionar domínio
- 📄 Listar domínios
- ❌ Remover domínio
- ⚠️ Validação de porta e domínio
- 💾 Persistência de configuração

---

## 🔧 Opções

### Definir caminho manualmente

```bash
caddy-cli --file /caminho/Caddyfile
```

---

### Resetar configuração

```bash
caddy-cli --reset
```

---

### Usar variável de ambiente

```bash
CADDYFILE=/caminho/Caddyfile caddy-cli
```

---

## 💡 Observações

- Funciona em **Windows, Linux e WSL**
- Caminhos do Windows são automaticamente convertidos no WSL
- O arquivo de configuração é salvo globalmente (por usuário)

---

## 🧠 Motivação

Este CLI foi criado para facilitar o gerenciamento de domínios locais usando o Caddy, evitando edição manual do arquivo.

---

## 📄 Licença

MIT
