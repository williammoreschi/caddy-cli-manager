#!/usr/bin/env node

const os = require("os");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const configPath = path.join(os.homedir(), ".caddy-cli.json");

let filePath;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const commonPorts = ["80", "443"];

function normalizePath(input) {
  // Detecta caminho Windows tipo C:\...
  if (/^[a-zA-Z]:\\/.test(input)) {
    const drive = input[0].toLowerCase();
    const rest = input.slice(2).replace(/\\/g, "/");
    return `/mnt/${drive}${rest}`;
  }

  return input;
}

function askProtocol() {
  return new Promise((resolve) => {
    console.log("\nEscolha o protocolo:");
    console.log("[1] http");
    console.log("[2] https");

    rl.question("Digite o número: ", (answer) => {
      if (["1", "http"].includes(answer.toLowerCase())) return resolve("http");
      if (["2", "https"].includes(answer.toLowerCase()))
        return resolve("https");

      console.log("❌ Opção inválida. Tente novamente.");
      resolve(askProtocol());
    });
  });
}

function askDomain() {
  return new Promise((resolve) => {
    rl.question("Digite o Domínio: ", (domain) => {
      const result = isValidDomain(domain);
      if (result === true) return resolve(domain);
      console.log(result);
      resolve(askDomain());
    });
  });
}

function askPort() {
  return new Promise((resolve) => {
    rl.question("Digite a Porta: ", async (port) => {
      const result = isValidPort(port);

      if (result !== true) {
        console.log(result);
        return resolve(askPort());
      }

      // ⚠️ Se for porta comum, pede confirmação
      if (commonPorts.includes(port)) {
        const confirmed = await confirmPort(port);

        if (!confirmed) {
          return resolve(askPort()); // refaz pergunta
        }
      }

      resolve(port);
    });
  });
}

function isValidDomain(domain) {
  if (!domain.trim()) return "❌ Domínio não pode ser vazio";

  if (domain.includes(" ")) return "❌ Domínio não pode ter espaços";

  const regex = /^[a-zA-Z0-9.-]+$/;

  if (!regex.test(domain)) {
    return "❌ Domínio contém caracteres inválidos";
  }

  return true;
}

function isValidPort(port) {
  if (!port.trim()) return "❌ Porta não pode ser vazia";

  if (!/^\d+$/.test(port)) {
    return "❌ Porta deve conter apenas números";
  }

  const portNumber = Number(port);

  if (portNumber < 1 || portNumber > 65535) {
    return "❌ Porta deve estar entre 1 e 65535";
  }

  return true;
}

function confirmPort(port) {
  return new Promise((resolve) => {
    function ask() {
      rl.question(
        `⚠️ Porta ${port} é comum (80/443). Deseja continuar? (S/n): `,
        (answer) => {
          const value = answer.trim().toLowerCase();

          // Enter vazio = SIM
          if (value === "" || value === "s") return resolve(true);

          if (value === "n") return resolve(false);

          console.log("❌ Digite apenas S, N ou Enter");
          ask(); // loop até resposta válida
        },
      );
    }

    ask();
  });
}

function domainExists(domain) {
  const domains = getDomains();
  return domains.some((d) => d.domain === domain);
}

function confirmOverwrite(domain) {
  return new Promise((resolve) => {
    function ask() {
      rl.question(
        `⚠️ O domínio "${domain}" já existe. Deseja sobrescrever? (S/n): `,
        (answer) => {
          const value = answer.trim().toLowerCase();

          if (value === "" || value === "s") return resolve(true);
          if (value === "n") return resolve(false);

          console.log("❌ Digite apenas S, N ou Enter");
          ask();
        },
      );
    }

    ask();
  });
}

function removeDomainBlock(domain) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf-8");

  // Regex que pega o bloco completo do domínio
  const regex = new RegExp(`((http[s]?:\\/\\/)?${domain}\\s*\\{[^}]*\\})`, "g");

  content = content.replace(regex, "").trim() + "\n";

  fs.writeFileSync(filePath, content);
}

async function addDomainFlow() {
  const protocol = await askProtocol();
  const domain = await askDomain();

  let shouldRemove = false;

  if (domainExists(domain)) {
    const overwrite = await confirmOverwrite(domain);

    if (!overwrite) {
      console.log("❌ Operação cancelada. Informe outro domínio.");
      return;
    }

    shouldRemove = true;
  }

  const port = await askPort();

  const block = `\n${protocol}://${domain} {\n    reverse_proxy localhost:${port}\n}\n`;

  if (shouldRemove) {
    removeDomainBlock(domain);
  }

  fs.appendFileSync(filePath, block);

  console.log("\n✅ Domínio adicionado com sucesso!");
}

function listDomains() {
  if (!fs.existsSync(filePath)) {
    console.log("📭 Nenhum domínio configurado.");
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");

  const matches = content.match(
    /(http[s]?:\/\/)?([a-zA-Z0-9.-]+)\s*\{[^}]*reverse_proxy\s+localhost:(\d+)/g,
  );

  if (!matches) {
    console.log("📭 Nenhum domínio encontrado.");
    return;
  }

  console.log("\n📋 Domínios configurados:\n");

  matches.forEach((match, index) => {
    const domainMatch = match.match(/([a-zA-Z0-9.-]+)\s*\{/);
    const portMatch = match.match(/localhost:(\d+)/);

    const domain = domainMatch?.[1];
    const port = portMatch?.[1];

    console.log(`${index + 1} - ${domain} → ${port}`);
  });
}

async function removeDomainFlow() {
  const domains = getDomains();

  if (domains.length === 0) {
    console.log("📭 Nenhum domínio configurado.");
    return;
  }

  printDomains(domains);

  function ask() {
    return new Promise((resolve) => {
      rl.question(
        "\nDigite o número do domínio para remover (ou 0 para cancelar): ",
        (answer) => {
          const value = answer.trim().toLowerCase();

          if (value === "0") {
            console.log("↩️ Cancelado.");
            return resolve(null);
          }

          if (!/^\d+$/.test(value)) {
            console.log("❌ Digite apenas números");
            return resolve(ask());
          }

          const index = Number(value) - 1;

          if (!domains[index]) {
            console.log("❌ Número inválido");
            return resolve(ask());
          }

          resolve(domains[index]);
        },
      );
    });
  }

  const selected = await ask();

  if (!selected) return;

  // confirmação antes de remover
  const confirm = await confirmDelete(selected.domain);

  if (!confirm) {
    console.log("❌ Remoção cancelada.");
    return;
  }

  removeDomainBlock(selected.domain);

  console.log(`🗑️ Domínio "${selected.domain}" removido com sucesso!`);
}

function confirmDelete(domain) {
  return new Promise((resolve) => {
    function ask() {
      rl.question(
        `Tem certeza que deseja remover "${domain}"? (S/n): `,
        (answer) => {
          const value = answer.trim().toLowerCase();

          if (value === "" || value === "s") return resolve(true);
          if (value === "n") return resolve(false);

          console.log("❌ Digite apenas S, N ou Enter");
          ask();
        },
      );
    }

    ask();
  });
}

function printDomains(domains) {
  console.log("\n📋 Domínios configurados:\n");

  domains.forEach((item, index) => {
    console.log(`${index + 1} - ${item.domain} → ${item.port}`);
  });
}

function getDomains() {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");

  const regex =
    /(http[s]?:\/\/)?([a-zA-Z0-9.-]+)\s*\{[^}]*reverse_proxy\s+localhost:(\d+)/g;

  const domains = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    domains.push({
      fullMatch: match[0],
      domain: match[2],
      port: match[3],
    });
  }

  return domains;
}

function showMenu() {
  return new Promise((resolve) => {
    console.log("\n=== Caddy Manager ===");
    console.log("[1] Adicionar domínio");
    console.log("[2] Listar domínios");
    console.log("[3] Remover domínio");
    console.log("[0] Sair");

    rl.question("Escolha uma opção: ", (answer) => {
      resolve(answer.trim());
    });
  });
}

function getCaddyfilePath() {
  // 1. Passou a flag
  const argPath = getArgValue("--file");
  if (argPath) {
    const resolved = path.resolve(argPath);

    if (!fs.existsSync(resolved)) {
      console.log("❌ Caminho passado em --file não existe.");
      process.exit();
    }

    return resolved;
  }

  // 2. ENV tem prioridade
  if (process.env.CADDYFILE) {
    return process.env.CADDYFILE;
  }

  // 3. Config salvo
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.caddyfile && fs.existsSync(config.caddyfile)) {
        return config.caddyfile;
      }
    } catch {
      console.log("⚠️ Configuração inválida, recriando...");
    }
  }

  return null;
}

function askCaddyfilePath() {
  return new Promise((resolve) => {
    function ask() {
      console.log("Exemplo: C:\\caddy\\Caddyfile");
      rl.question("Informe o caminho do seu Caddyfile: ", (input) => {
        const raw = input.trim();

        if (!raw) {
          console.log("❌ Caminho não pode ser vazio");
          return ask();
        }

        const normalized = normalizePath(raw);
        const file = path.resolve(normalized);

        if (!fs.existsSync(file)) {
          console.log("❌ Arquivo não encontrado");
          return ask();
        }

        resolve(file);
      });
    }

    ask();
  });
}

if (process.argv.includes("--reset")) {
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log("🔄 Configuração resetada.");
  } else {
    console.log("ℹ️ Nenhuma configuração para resetar.");
  }

  process.exit(); // 👈 importante
}

function saveConfig(filePath) {
  fs.writeFileSync(
    configPath,
    JSON.stringify({ caddyfile: filePath }, null, 2),
  );
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return null;
}

async function init() {
  filePath = getCaddyfilePath();

  if (!filePath) {
    console.log("⚙️ Configuração inicial necessária\n");

    const path = await askCaddyfilePath();

    saveConfig(path);

    filePath = path;

    console.log("✅ Caminho salvo com sucesso!\n");
    console.log(`⚙️ Config salvo em: ${configPath}\n`);
  }

  console.log(`📁 Usando Caddyfile em: ${filePath}\n`);
}

async function main() {
  await init(); // 👈 importante

  while (true) {
    const option = await showMenu();

    switch (option) {
      case "1":
        await addDomainFlow();
        break;

      case "2":
        listDomains();
        break;

      case "3":
        await removeDomainFlow();
        break;

      case "0":
        console.log("👋 Saindo...");
        rl.close();
        return;

      default:
        console.log("❌ Opção inválida. Use 1, 2, 3 ou 0.");
    }
  }
}

main();
