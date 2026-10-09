// Ilovaning haqiqiy ekranlarini (dist/worker.js) namuna ma'lumotlar bilan suratga oladi → shots/*.png
// Telegram va baza soxta (mock): hech qayerga xabar ketmaydi.
// Ishlatish: node capture-app.mjs
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = "123:DEMO";
const ADMIN = 111;
const ME = { id: 222, first_name: "Aziza", username: "aziza_demo" };
const PORT = 8790;

// ---------------------------------------------------------------- soxta baza va Telegram
const db = new DatabaseSync(":memory:");
const stmt = (sql, args = []) => ({
  bind: (...a) => stmt(sql, a),
  first: async (c) => { const r = db.prepare(sql).get(...args); return r ? (c ? r[c] ?? null : { ...r }) : null; },
  all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
  run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
});
const DB = { prepare: (s) => stmt(s), batch: async (l) => Promise.all(l.map((s) => s.run())) };

const AI_ANSWER =
  "2 oylik mushukchani kuniga 4–5 marta oz-ozdan boqing:\n" +
  "• mushukchalar uchun maxsus quruq yoki nam ovqat\n" +
  "• doim toza suv turishi shart\n" +
  "• sigir suti bermang — qorni og'rishi mumkin\n" +
  "Ishtahasi yo'qolsa yoki ich ketsa, veterinarga ko'rsating.";
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (url.includes("/file/bot")) {
    const n = url.match(/cat(\d)/)?.[1] || "1";
    return new Response(fs.readFileSync(path.join(dir, "cats", `${n}.jpg`)), { headers: { "content-type": "image/jpeg" } });
  }
  if (url.includes("openai")) {
    return new Response(JSON.stringify({ choices: [{ message: { content: AI_ANSWER } }] }));
  }
  const method = url.split("/").pop();
  const body = opts.body && !(opts.body instanceof FormData) ? JSON.parse(opts.body) : {};
  const ok = (result) => new Response(JSON.stringify({ ok: true, result }));
  if (method === "getMe") return ok({ id: 999, username: "hadyaga_mushuk_bot" });
  if (method === "getFile") return ok({ file_path: body.file_id + ".jpg" });
  return ok({ message_id: 1, chat: { id: 1 } });
};

const worker = (await import(pathToFileURL(path.join(dir, "../dist/worker.js")).href)).default;
const env = { BOT_TOKEN: TOKEN, ADMIN_IDS: String(ADMIN), CHANNEL: "@Hadyagamushuklar", ADMIN_CONTACT: "@Hadyagamushuklar",
  OPENAI_API_KEY: "demo", SETUP_KEY: "k", DB };
const ctx = { waitUntil() {} };
await worker.fetch(new Request("http://x/setup?key=k"), env, ctx);

// ---------------------------------------------------------------- namuna e'lonlar
const T = Math.floor(Date.now() / 1000);
const PHONE = "+998000000000"; // ataylab soxta raqam (+998 00 000 00 00)
const media = (n) => JSON.stringify([{ type: "photo", file_id: `cat${n}`, thumb: `cat${n}` }]);
// Kanaldagi haqiqiy e'lonlar rasmlari (cats/1..5.jpg). Zoti, yoshi va hududi — taxminiy, rasmga qarab yozilgan:
// haqiqiy ma'lumot bo'lsa, shu yerda o'zgartiring.
const LISTINGS = [
  // [rasm, tur, hudud, tuman, ma'lumot, egasi — ME bo'lsa «Mening e'lonlarim»da ham chiqadi]
  [1, "hadya", "Toshkent shahri", "Yunusobod tumani", { breed: "Oddiy", age: "3 oylik", gender: "u", health: [], delivery: "kelish", extra: "Ko'k ko'zli mushukcha. Mehribon oilaga beriladi." }, ME.id],
  [2, "hadya", "Toshkent shahri", "Chilonzor tumani", { breed: "Oddiy", age: "2 oylik", gender: "u", health: [], delivery: "kelish" }, 501],
  [3, "hadya", "Toshkent shahri", "Mirzo Ulug'bek tumani", { breed: "2 ta mushukcha", age: "2 oylik", gender: "u", health: [], delivery: "kelish" }, ME.id],
  [4, "hadya", "Toshkent shahri", "Yashnobod tumani", { breed: "Oddiy", age: "2 oylik", gender: "u", health: [], delivery: "kelish" }, 503],
  [5, "hadya", "Toshkent shahri", "Shayxontohur tumani", { breed: "Oddiy", age: "3 oylik", gender: "u", health: [], delivery: "kelish" }, 504],
];
const ins = db.prepare(
  "INSERT INTO listings (user_id, username, first_name, kind, region, district, data, media, status, channel_msg_id, channel_username, created_at, published_at, check_at) " +
  "VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'Hadyagamushuklar', ?, ?, ?)");
LISTINGS.forEach(([n, kind, region, district, data, owner], i) => {
  ins.run(owner, "Aziza", kind, region, district, JSON.stringify({ phone: PHONE, ...data }), media(n),
    "published", 100 + i, T - i * 3600, T - i * 3600, T + 30 * 86400);
});
// Statistika raqamlari videoda ko'rsatilmaydi (soxta raqam bo'lmasin)

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const r = await worker.fetch(new Request(`http://127.0.0.1:${PORT}${req.url}`, {
    method: req.method, headers: req.headers, duplex: "half",
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  }), env, ctx);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT);

function initData(user) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
  p.set("hash", createHmac("sha256", createHmac("sha256", "WebAppData").update(TOKEN).digest()).update(dcs).digest("hex"));
  return p.toString();
}

// ---------------------------------------------------------------- suratga olish
const shots = path.join(dir, "shots");
fs.mkdirSync(shots, { recursive: true });
const fontCss = fs.readFileSync(path.join(dir, "fonts/fonts.local.css"), "utf8")
  .replace(/url\((.*?)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, "fonts", f)).toString("base64")})`);
const browser = await chromium.launch();

async function openApp(user, hash = "") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.route(/telegram\.org|fonts\.g/, (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await page.addInitScript(([data, user, css]) => {
    const noop = () => {};
    window.Telegram = { WebApp: { initData: data, initDataUnsafe: { user }, ready: noop, expand: noop, setHeaderColor: noop,
      setBackgroundColor: noop, setBottomBarColor: noop, showAlert: (m, cb) => cb && cb(), showConfirm: (m, cb) => cb(true),
      openTelegramLink: noop, HapticFeedback: { notificationOccurred: noop },
      MainButton: { setParams: noop, setText: noop, show: noop, hide: noop, onClick: noop, showProgress: noop, hideProgress: noop },
      BackButton: { show: noop, hide: noop, onClick: noop } } };
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.append(s);
    });
  }, [initData(user), user, fontCss]);
  await page.goto(`http://127.0.0.1:${PORT}/${hash}`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return page;
}
// Butun sahifa (pastki menyusiz) + alohida pastki menyu. `marks` — video'da «bosish» animatsiyasi
// tushadigan elementlar: ularning joyi (sahifa boshidan, 2x pikselda) boxes.json ga yoziladi.
const boxes = {};
async function shoot(page, name, marks = {}) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  for (const [key, sel] of Object.entries(marks)) {
    const b = await page.evaluate((sel) => {
      const r = document.querySelector(sel)?.getBoundingClientRect();
      return r && { x: (r.x + scrollX) * 2, y: (r.y + scrollY) * 2, w: r.width * 2, h: r.height * 2 };
    }, sel);
    if (b) (boxes[name] ||= {})[key] = b;
  }
  await page.addStyleTag({ content: "nav{visibility:hidden}" });
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
  await page.addStyleTag({ content: "nav{visibility:visible}" });
}

let page = await openApp(ME);
await page.screenshot({ path: path.join(shots, "nav-search.png"), clip: { x: 0, y: 844 - 96, width: 390, height: 96 } });
await shoot(page, "home", { item: ".item", region: "#fRegion", kinds: ".chips.kinds" });
await page.selectOption("#fRegion", "Toshkent shahri");
await page.waitForTimeout(500);
await shoot(page, "home-filter");

await page.click('nav button[data-view="new"]');
await page.screenshot({ path: path.join(shots, "nav-new.png"), clip: { x: 0, y: 844 - 96, width: 390, height: 96 } });
await shoot(page, "new-types", { hadya: '.type[data-kind="hadya"]' });
await page.click('.type[data-kind="hadya"]');
for (const [i, n] of [[0, 1], [1, 5]]) {
  // fayl tanlash oynasi o'rniga rasm to'g'ridan-to'g'ri input'ga beriladi (slotIdx — ilovadagi o'zgaruvchi)
  await page.evaluate((i) => { slotIdx = i; }, i);
  await page.setInputFiles("#file", path.join(dir, "cats", `${n}.jpg`));
  await page.waitForTimeout(300);
}
await page.fill("#breed", "Oddiy");
await page.fill("#age", "2 oylik");
await page.click('label[for="g-f"]');
await page.click('label[for="h-1"]');
await page.click('label[for="h-2"]');
await page.click('label[for="d-1"]');
await page.selectOption("#region", "Toshkent shahri");
await page.selectOption("#district", "Chilonzor tumani");
await page.fill("#phone", "+998 00 000 00 00");
await page.fill("#extra", "Juda o'yinqaroq, lotokka o'rgangan.");
await shoot(page, "form", { slots: ".slots", contact: "#f-contact" });

await page.click('nav button[data-view="ask"]');
await page.screenshot({ path: path.join(shots, "nav-ask.png"), clip: { x: 0, y: 844 - 96, width: 390, height: 96 } });
await page.click("#suggest button");
await page.waitForTimeout(800);
await shoot(page, "ask", { answer: ".bubble.ai" });

await page.click('nav button[data-view="my"]');
await page.screenshot({ path: path.join(shots, "nav-my.png"), clip: { x: 0, y: 844 - 96, width: 390, height: 96 } });
await page.waitForTimeout(600);
await shoot(page, "my", { given: '.acts button[data-s="given"]' });

await page.click('nav button[data-view="stats"]');
await page.screenshot({ path: path.join(shots, "nav-stats.png"), clip: { x: 0, y: 844 - 96, width: 390, height: 96 } });
await page.waitForTimeout(600);
await shoot(page, "stats");
await page.close();

page = await openApp({ id: 333, first_name: "Jasur", username: "jasur_demo" }, "#l1");
await page.waitForTimeout(600);
await shoot(page, "detail", { contact: ".ctas", share: "#dShare", report: "#dReport" });
await page.close();

page = await openApp({ id: ADMIN, first_name: "Admin" }, "#admin");
await page.waitForTimeout(800);
await shoot(page, "admin");
await page.close();

fs.writeFileSync(path.join(shots, "boxes.json"), JSON.stringify(boxes, null, 1));
await browser.close();
server.close();
console.log("Tayyor:", fs.readdirSync(shots).join(", "));
