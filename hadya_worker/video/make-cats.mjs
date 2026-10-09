// Namuna e'lonlar uchun mushuk illyustratsiyalari (haqiqiy rasmlar bo'lmaganda).
// Ishlatish: node make-cats.mjs  → cats-demo/1.jpg … cats-demo/8.jpg
// Haqiqiy rasmlar bo'lsa, ularni shu nomlar bilan cats/ papkasiga qo'ying — bu skript kerak emas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const CATS = [
  { fur: "#F2A65A", dark: "#C9772E", eye: "#7BC96F", bg: ["#FFE7B8", "#FFC97A"], pattern: "tabby" }, // sariq-chiziqli
  { fur: "#9AA3B5", dark: "#6B7385", eye: "#F2C14E", bg: ["#DCE1FF", "#AEB9FF"], pattern: "plain" }, // kulrang britan
  { fur: "#2B2B3A", dark: "#15151F", eye: "#F5D547", bg: ["#FFE9A8", "#FFD84A"], pattern: "plain" }, // qora
  { fur: "#F7F2EA", dark: "#D9CFC0", eye: "#5BA8E8", bg: ["#D6F0FF", "#9FD3FF"], pattern: "plain" }, // oq
  { fur: "#F7F2EA", dark: "#E08A3C", eye: "#8BC34A", bg: ["#FFE0E6", "#FFB3C4"], pattern: "calico", dark2: "#3A3240" }, // uch rangli
  { fur: "#E8D3B0", dark: "#7A5A43", eye: "#6EC6E6", bg: ["#E8E0FF", "#C2B3FF"], pattern: "point" }, // siam
  { fur: "#B07A4F", dark: "#7E5233", eye: "#E9B949", bg: ["#DDF3E8", "#A8E2C6"], pattern: "tabby" }, // jigarrang
  { fur: "#C9CED8", dark: "#8D94A3", eye: "#E9A23B", bg: ["#FFF1C2", "#FFD98A"], pattern: "tabby" }, // kumush
];

function catSvg(c, i) {
  const stripes = c.pattern === "tabby"
    ? `<g stroke="${c.dark}" stroke-width="9" stroke-linecap="round" fill="none" opacity=".85">
         <path d="M178 112 q6 22 0 40"/><path d="M200 106 q0 26 0 46"/><path d="M222 112 q-6 22 0 40"/>
         <path d="M108 190 q22 4 36 16"/><path d="M104 214 q22 0 38 8"/><path d="M292 190 q-22 4 -36 16"/><path d="M296 214 q-22 0 -38 8"/>
         <path d="M120 318 q30 -10 50 6"/><path d="M280 318 q-30 -10 -50 6"/></g>`
    : "";
  const patches = c.pattern === "calico"
    ? `<g clip-path="url(#head${i})"><ellipse cx="140" cy="140" rx="60" ry="55" fill="${c.dark}"/><ellipse cx="270" cy="230" rx="45" ry="40" fill="${c.dark2}"/></g>
       <ellipse cx="250" cy="320" rx="50" ry="36" fill="${c.dark}"/>`
    : "";
  const point = c.pattern === "point"
    ? `<g clip-path="url(#head${i})"><ellipse cx="200" cy="245" rx="62" ry="50" fill="${c.dark}" opacity=".75"/></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="900" height="900">
  <defs>
    <radialGradient id="bg${i}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></radialGradient>
    <clipPath id="head${i}"><ellipse cx="200" cy="200" rx="108" ry="94"/></clipPath>
  </defs>
  <rect width="400" height="400" fill="url(#bg${i})"/>
  <g fill="#fff" opacity=".35"><circle cx="58" cy="70" r="9"/><circle cx="340" cy="92" r="6"/><circle cx="352" cy="300" r="10"/><circle cx="44" cy="320" r="7"/></g>
  <!-- dum -->
  <path d="M300 360 q70 -10 60 -80 q-6 -30 -30 -24" fill="none" stroke="${c.pattern === "point" ? c.dark : c.fur}" stroke-width="26" stroke-linecap="round"/>
  <!-- tana -->
  <ellipse cx="200" cy="345" rx="122" ry="92" fill="${c.fur}"/>
  ${c.pattern === "tabby" ? stripes.replace(/<path d="M108[\s\S]*?<\/g>/, "</g>") : ""}
  <ellipse cx="200" cy="330" rx="58" ry="52" fill="#fff" opacity="${c.fur === "#F7F2EA" ? 0 : 0.55}"/>
  ${c.pattern === "calico" ? patches.split("</g>")[1] : ""}
  <!-- panjalar -->
  <ellipse cx="160" cy="392" rx="30" ry="18" fill="${c.pattern === "point" ? c.dark : c.fur}"/><ellipse cx="240" cy="392" rx="30" ry="18" fill="${c.pattern === "point" ? c.dark : c.fur}"/>
  <!-- quloqlar -->
  <path d="M104 150 L112 60 L180 112 Z" fill="${c.pattern === "point" ? c.dark : c.fur}"/><path d="M296 150 L288 60 L220 112 Z" fill="${c.pattern === "point" ? c.dark : c.fur}"/>
  <path d="M120 136 L124 84 L164 116 Z" fill="#F7A8B8"/><path d="M280 136 L276 84 L236 116 Z" fill="#F7A8B8"/>
  <!-- bosh -->
  <ellipse cx="200" cy="200" rx="108" ry="94" fill="${c.fur}"/>
  ${c.pattern === "calico" ? patches.split("</g>")[0] + "</g>" : ""}${point}
  ${c.pattern === "tabby" ? stripes : ""}
  <!-- ko'zlar -->
  <g><ellipse cx="160" cy="196" rx="23" ry="26" fill="#fff"/><ellipse cx="240" cy="196" rx="23" ry="26" fill="#fff"/>
     <ellipse cx="160" cy="198" rx="19" ry="22" fill="${c.eye}"/><ellipse cx="240" cy="198" rx="19" ry="22" fill="${c.eye}"/>
     <ellipse cx="160" cy="199" rx="6" ry="17" fill="#12123A"/><ellipse cx="240" cy="199" rx="6" ry="17" fill="#12123A"/>
     <circle cx="168" cy="188" r="6" fill="#fff"/><circle cx="248" cy="188" r="6" fill="#fff"/></g>
  <!-- yonoqlar, burun, og'iz -->
  <ellipse cx="138" cy="238" rx="18" ry="10" fill="#F7A8B8" opacity=".6"/><ellipse cx="262" cy="238" rx="18" ry="10" fill="#F7A8B8" opacity=".6"/>
  <path d="M190 230 h20 l-10 12 z" fill="#E86A8A"/>
  <path d="M200 242 q-6 14 -20 10 M200 242 q6 14 20 10" fill="none" stroke="#12123A" stroke-width="4" stroke-linecap="round"/>
  <g stroke="${c.fur === "#2B2B3A" ? "#d8d8e6" : "#12123A"}" stroke-width="3" stroke-linecap="round" opacity=".7">
    <path d="M150 238 l-62 -10"/><path d="M150 248 l-62 6"/><path d="M250 238 l62 -10"/><path d="M250 248 l62 6"/></g>
</svg>`;
}

const out = path.join(dir, "cats-demo");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
for (const [i, c] of CATS.entries()) {
  await page.setContent(`<body style="margin:0">${catSvg(c, i)}</body>`);
  await page.screenshot({ path: path.join(out, `${i + 1}.jpg`), type: "jpeg", quality: 90 });
}
await browser.close();
console.log(`${CATS.length} ta rasm: ${out}`);
