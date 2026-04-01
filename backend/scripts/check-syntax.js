import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT_DIR = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".git", "uploads", ".vscode"]);

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function runNodeCheck(filePath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--check", filePath], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

const files = await collectJsFiles(ROOT_DIR);

if (!files.length) {
  console.log("No JavaScript files found.");
  process.exit(0);
}

let allPassed = true;

for (const file of files) {
  const ok = await runNodeCheck(file);
  if (!ok) {
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} files.`);
