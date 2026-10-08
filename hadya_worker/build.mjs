// Yig'ish: src/index.html + src/worker.js → dist/worker.js
// Ishlatish: node build.mjs   (keyin dist/worker.js ni Cloudflare muharririga joylang)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, "src/index.html"), "utf8");
const worker = fs.readFileSync(path.join(dir, "src/worker.js"), "utf8");
if (!worker.includes("__INDEX_HTML__")) throw new Error("src/worker.js da __INDEX_HTML__ topilmadi");
const out = worker.replace("__INDEX_HTML__", () => JSON.stringify(html));
fs.mkdirSync(path.join(dir, "dist"), { recursive: true });
fs.writeFileSync(path.join(dir, "dist/worker.js"), out);
console.log(`dist/worker.js tayyor (${(out.length / 1024).toFixed(0)} KB)`);
