#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components", "lib"];
const CRITICAL_PATTERNS = [
  {
    name: "Clave service_role en código cliente",
    regex: /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
  },
  {
    name: "Secreto marcado NEXT_PUBLIC",
    regex: /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE)/i,
  },
];

const DEMO_PATTERNS = [
  /El Reino de Ceniza/i,
  /Marina Torres/i,
  /\bmock\b/i,
  /\bfake\b/i,
  /\bdemo\b/i,
];

const IGNORE = new Set([
  ".next",
  "node_modules",
  ".git",
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx|js|jsx|mjs|json|sql)$/i.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

const critical = [];
const demo = [];
const todos = [];
const consoleLogs = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);

  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.regex.test(text)) {
      critical.push(`${rel}: ${pattern.name}`);
    }
  }

  for (const pattern of DEMO_PATTERNS) {
    if (pattern.test(text)) {
      demo.push(rel);
      break;
    }
  }

  if (/\b(TODO|FIXME)\b/.test(text)) {
    todos.push(rel);
  }

  if (/console\.log\s*\(/.test(text)) {
    consoleLogs.push(rel);
  }
}

const required = [
  "app/error.tsx",
  "app/global-error.tsx",
  "app/not-found.tsx",
];

const missingRequired = required.filter(
  (item) => !fs.existsSync(path.join(ROOT, item))
);

console.log("\nSEBORO — BETA PREFLIGHT\n");

function section(title, items, empty) {
  console.log(title);
  if (!items.length) {
    console.log(`  ✓ ${empty}`);
  } else {
    for (const item of [...new Set(items)]) {
      console.log(`  - ${item}`);
    }
  }
  console.log("");
}

section(
  "CRÍTICO — posibles secretos:",
  critical,
  "No se detectaron patrones de secretos en app/components/lib."
);

section(
  "REVISAR — referencias demo/mock:",
  demo,
  "No se detectaron marcadores demo conocidos."
);

section(
  "REVISAR — TODO/FIXME:",
  todos,
  "No se detectaron TODO/FIXME."
);

section(
  "REVISAR — console.log:",
  consoleLogs,
  "No se detectaron console.log."
);

section(
  "BASE DE ERRORES:",
  missingRequired,
  "Existen error.tsx, global-error.tsx y not-found.tsx."
);

console.log(
  critical.length || missingRequired.length
    ? "RESULTADO: HAY BLOQUEOS TÉCNICOS.\n"
    : "RESULTADO: SIN BLOQUEOS CRÍTICOS DETECTADOS POR EL ESCÁNER LOCAL.\n"
);

process.exit(critical.length || missingRequired.length ? 1 : 0);
