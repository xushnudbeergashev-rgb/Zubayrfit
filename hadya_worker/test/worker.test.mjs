// Worker testlari: D1 bazasi node:sqlite bilan, Telegram API esa soxta fetch bilan almashtiriladi.
// Ishga tushirish:  node build.mjs && node --test test/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = "123:TEST";
const ADMIN = 111;
const USER = { id: 222, first_name: "Ali", username: "ali_real" };
const OTHER = { id: 333, first_name: "Vali", username: "vali_v" };
const ORIGIN = "https://bot.example";

// ---------------------------------------------------------------- D1 o'rnini bosuvchi
function makeD1() {
  const db = new DatabaseSync(":memory:");
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async (col) => {
      const row = db.prepare(sql).get(...args);
      if (!row) return null;
      return col ? row[col] ?? null : { ...row };
    },
    all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }),
    run: async () => {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())) };
}

// ---------------------------------------------------------------- Telegram o'rnini bosuvchi
const calls = [];
let downloads = 0; // Telegram'dan fayl yuklab olishlar soni
let msgId = 1000;
// chat_id → { code, description }: shu foydalanuvchiga sendMessage xato qaytaradi
const failSend = new Map();
const lastCall = (method) => [...calls].reverse().find((c) => c.method === method);
const callsOf = (method) => calls.filter((c) => c.method === method);
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (url.includes("/file/bot")) return ++downloads,  new Response("IMAGE-BYTES", { status: 200, headers: { "content-length": "11" } });
  const method = url.split("/").pop();
  let body = {};
  if (opts.body instanceof FormData) {
    body = Object.fromEntries([...opts.body.entries()].filter(([, v]) => typeof v === "string"));
    if (body.media) body.media = JSON.parse(body.media);
  } else if (opts.body) body = JSON.parse(opts.body);
  calls.push({ method, body });
  const ok = (result) => new Response(JSON.stringify({ ok: true, result }));
  const fail = method === "sendMessage" && failSend.get(Number(body.chat_id));
  if (fail) return new Response(JSON.stringify({ ok: false, error_code: fail.code, description: fail.description }), { status: fail.code });
  switch (method) {
    case "getMe": return ok({ id: 999, username: "hadyaga_mushuk_bot" });
    case "sendMediaGroup":
      return ok(body.media.map((m) => ({
        message_id: ++msgId, chat: { id: -100, username: "Hadyagamushuklar" },
        photo: [{ file_id: "small_" + msgId }, { file_id: "mid_" + msgId }, { file_id: "big_" + msgId }],
      })));
    case "sendMessage": case "sendPhoto": case "sendDocument":
      return ok({ message_id: ++msgId, chat: { id: body.chat_id } });
    case "getFile": return ok({ file_path: "photos/" + body.file_id + ".jpg" });
    case "getChatMember": return ok({ status: "administrator", can_post_messages: true, can_edit_messages: true });
    default: return ok(true);
  }
};

// Cloudflare keshining soddalashtirilgan nusxasi
const cacheStore = new Map();
globalThis.caches = {
  default: {
    match: async (req) => cacheStore.get(req.url)?.clone(),
    put: async (req, res) => void cacheStore.set(req.url, res),
  },
};

// ---------------------------------------------------------------- yordamchilar
function initData(user) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user), query_id: "q" });
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(TOKEN).digest();
  p.set("hash", createHmac("sha256", secret).update(dcs).digest("hex"));
  return p.toString();
}

let worker, env;
const pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };
async function req(pathname, { method = "GET", user, body, headers = {} } = {}) {
  const h = new Headers(headers);
  if (user) h.set("x-init-data", initData(user));
  let b = body;
  if (body && !(body instanceof FormData)) {
    b = JSON.stringify(body);
    h.set("content-type", "application/json");
  }
  const res = await worker.fetch(new Request(ORIGIN + pathname, { method, headers: h, body: b }), env, ctx);
  await Promise.all(pending.splice(0));
  return res;
}
const reqJson = async (...a) => (await req(...a)).json();
// Telegram webhook so'rovi (worker sirni BOT_TOKEN'dan xuddi shunday hisoblaydi)
const HOOK_SECRET = createHash("sha256").update("hook:" + TOKEN).digest("hex").slice(0, 48);
const tgUpdate = (update) => req("/tg", { method: "POST", body: update, headers: { "x-telegram-bot-api-secret-token": HOOK_SECRET } });
const cb = (from, data, message = { message_id: 1, chat: { id: from.id } }) =>
  tgUpdate({ callback_query: { id: "cq", from, data, message } });
const cmd = (from, text) => tgUpdate({ message: { message_id: 5, from, chat: { id: from.id, type: "private" }, text } });

function form(fields, files = 1) {
  const fd = new FormData();
  fd.append("initData", initData(fields.__user || USER));
  for (const [k, v] of Object.entries(fields)) if (k !== "__user") fd.append(k, v);
  for (let i = 0; i < files; i++) fd.append("media", new Blob(["jpegdata"], { type: "image/jpeg" }), `p${i}.jpg`);
  return fd;
}
const hadyaForm = (extra = {}) => form({
  kind: "hadya", region: "Toshkent shahri", district: "Chilonzor tumani", age: "3 oylik", gender: "f",
  delivery: "bor", breed: "britan", ...extra,
});
const row = (id) => env.DB.raw.prepare("SELECT * FROM listings WHERE id=?").get(id);

before(async () => {
  worker = (await import(pathToFileURL(path.join(dir, "../dist/worker.js")).href)).default;
  env = { BOT_TOKEN: TOKEN, ADMIN_IDS: String(ADMIN), CHANNEL: "@Hadyagamushuklar", SETUP_KEY: "maxfiy-kalit-12345", DB: makeD1() };
});

// ---------------------------------------------------------------- testlar
test("/setup kalitsiz ochilmaydi, kalit bilan ishlaydi", async () => {
  let r = await req("/setup");
  assert.match(await r.text(), /Kalit noto'g'ri/);
  assert.equal(callsOf("setWebhook").length, 0);
  r = await req("/setup?key=notogri");
  assert.match(await r.text(), /Kalit noto'g'ri/);
  r = await req("/setup?key=maxfiy-kalit-12345");
  const html = await r.text();
  assert.match(html, /Baza jadvallari tayyor/);
  assert.equal(lastCall("setWebhook").body.drop_pending_updates, false);
});

test("/setup SETUP_KEY qo'yilmagan bo'lsa, qanday qo'shishni aytadi", async () => {
  const r = await worker.fetch(new Request(ORIGIN + "/setup?key=x"), { ...env, SETUP_KEY: undefined }, ctx);
  assert.match(await r.text(), /avval Cloudflare'da SETUP_KEY/);
});

test("kontakt: kamida telefon yoki username bo'lishi shart", async () => {
  let j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ phone: "+998 ", tg_username: "" }) });
  assert.match(j.error, /kamida bittasini/);
  j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ phone: "+998 90 12", tg_username: "" }) });
  assert.match(j.error, /Telefon raqam/);
  j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ phone: "", tg_username: "@ab" }) });
  assert.match(j.error, /username noto'g'ri/);
});

let phoneOnlyId, userOnlyId;
test("faqat telefon bilan e'lon: kanal postida Telegram qatori yo'q", async () => {
  const j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ phone: "+998 90 123 45 67", tg_username: "" }) });
  assert.equal(j.ok, true, j.error);
  phoneOnlyId = j.id;
  assert.equal(row(j.id).username, null);
  const cap = lastCall("sendMediaGroup").body.media[0].caption;
  assert.match(cap, /📞 \+998 90 123 45 67/);
  assert.doesNotMatch(cap, /Telegram:/);
  // adminga kim yuborgani ko'rsatiladi (ban qilish uchun ID kerak)
  const toAdmin = callsOf("sendMessage").filter((c) => c.body.chat_id === ADMIN).at(-1);
  assert.match(toAdmin.body.text, /ID: <code>222<\/code>/);
  assert.doesNotMatch(toAdmin.body.text, /egasiniki bo'lmasligi/); // username yozilmagan — ogohlantirish yo'q
});

test("faqat username bilan e'lon: telefon qatori yo'q, t.me havolasi ham qabul qilinadi", async () => {
  const j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ phone: "+998 ", tg_username: "https://t.me/boshqa_nom" }) });
  assert.equal(j.ok, true, j.error);
  userOnlyId = j.id;
  assert.equal(row(j.id).username, "boshqa_nom"); // profildagi ali_real emas, formaga yozilgani
  const cap = lastCall("sendMediaGroup").body.media[0].caption;
  assert.match(cap, /Telegram: @boshqa_nom/);
  assert.doesNotMatch(cap, /📞/);
  // profildagi username (ali_real) bilan mos emas → adminga ogohlantirish
  const toAdmin = callsOf("sendMessage").filter((c) => c.body.chat_id === ADMIN).at(-1).body.text;
  assert.match(toAdmin, /Username egasiniki bo'lmasligi mumkin.*@boshqa_nom.*@ali_real/);
});

test("tekshiruvdagi e'lon rasmi kalitsiz ochilmaydi, egasi kalit bilan ko'radi", async () => {
  let r = await req(`/api/media/${phoneOnlyId}/0?thumb=1`);
  assert.equal(r.status, 404);
  const my = await reqJson("/api/my", { user: USER });
  const item = my.items.find((i) => i.id === phoneOnlyId);
  assert.match(item.thumb, /&k=[0-9a-f]{24}$/);
  r = await req("/" + item.thumb);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "private, max-age=3600");
});

test("admin tasdiqlaydi → kanalga chiqadi, check_at 30 kunga qo'yiladi", async () => {
  await cb({ id: ADMIN, first_name: "Admin" }, `m:ok:${phoneOnlyId}`);
  await cb({ id: ADMIN, first_name: "Admin" }, `m:ok:${userOnlyId}`);
  const r = row(phoneOnlyId);
  assert.equal(r.status, "published");
  assert.ok(r.check_at - r.published_at === 30 * 86400);
});

test("ochiq e'lon: kontakt faqat Telegram ichidan ochilganda beriladi", async () => {
  let j = await reqJson(`/api/listings/${phoneOnlyId}`);
  assert.equal(j.contact, null);
  assert.equal(j.contact_hidden, true);
  j = await reqJson(`/api/listings/${phoneOnlyId}`, { user: OTHER });
  assert.equal(j.contact.phone, "+998 90 123 45 67");
  assert.equal(j.contact.username, null);
  assert.equal(j.mine, false);
  j = await reqJson(`/api/listings/${phoneOnlyId}`, { user: USER });
  assert.equal(j.mine, true);
});

test("rasm keshlanadi: ikkinchi so'rovda Telegram'ga murojaat yo'q", async () => {
  const before = downloads;
  let r = await req(`/api/media/${phoneOnlyId}/0?thumb=1`);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "IMAGE-BYTES");
  r = await req(`/api/media/${phoneOnlyId}/0?thumb=1`);
  assert.equal(await r.text(), "IMAGE-BYTES");
  assert.equal(downloads, before + 1);
});

test("shikoyat: adminga boradi, takroriy shikoyat qabul qilinmaydi, o'ziga shikoyat yo'q", async () => {
  let j = await reqJson(`/api/listings/${phoneOnlyId}/report`, { method: "POST", user: OTHER, body: { reason: "scam", note: "pul so'radi" } });
  assert.equal(j.ok, true, j.error);
  const msg = lastCall("sendMessage").body;
  assert.equal(msg.chat_id, ADMIN);
  assert.match(msg.text, /Shikoyat.*#\d+/);
  assert.ok(JSON.stringify(msg.reply_markup).includes(`a:ban:${phoneOnlyId}`));
  j = await reqJson(`/api/listings/${phoneOnlyId}/report`, { method: "POST", user: OTHER, body: { reason: "scam" } });
  assert.match(j.error, /allaqachon/);
  j = await reqJson(`/api/listings/${phoneOnlyId}/report`, { method: "POST", user: USER, body: { reason: "scam" } });
  assert.match(j.error, /O'z e'loningizga/);
  j = await reqJson(`/api/listings/${phoneOnlyId}/report`, { method: "POST", body: { reason: "scam" } });
  assert.match(j.error, /bot orqali/);
});

test("/ban va /unban: ban qilingan e'lon bera olmaydi", async () => {
  await cmd(OTHER, "/start"); // foydalanuvchi bazaga yoziladi
  await cmd({ id: ADMIN, first_name: "Admin" }, "/ban @vali_v firibgar");
  assert.match(lastCall("sendMessage").body.text, /ban qilindi: firibgar/);
  let j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ __user: OTHER, phone: "+998901234567" }) });
  assert.match(j.error, /cheklangan/);
  await cmd({ id: ADMIN, first_name: "Admin" }, "/unban 333");
  assert.match(lastCall("sendMessage").body.text, /bandan chiqarildi/);
  j = await reqJson("/api/submit", { method: "POST", body: hadyaForm({ __user: OTHER, phone: "+998901234567" }) });
  assert.equal(j.ok, true, j.error);
  await cmd(OTHER, "/ban 222");
  assert.doesNotMatch(lastCall("sendMessage").body.text, /ban qilindi/); // oddiy foydalanuvchi ban qila olmaydi
});

test("ulashilgan havola: /start l<id> e'lonni ochadigan tugma beradi", async () => {
  await cmd(OTHER, `/start l${phoneOnlyId}`);
  const kb = lastCall("sendMessage").body.reply_markup.inline_keyboard[0][0];
  assert.equal(kb.web_app.url, `${ORIGIN}/#l${phoneOnlyId}`);
  const cfg = await reqJson("/api/config");
  assert.equal(cfg.bot, "hadyaga_mushuk_bot");
});

test("30 kun: egasidan so'raladi, 3 kun javob bo'lmasa yopiladi", async () => {
  const old = Math.floor(Date.now() / 1000) - 31 * 86400;
  env.DB.raw.prepare("UPDATE listings SET check_at=NULL, published_at=? WHERE id=?").run(old, phoneOnlyId);
  await worker.scheduled({}, env, ctx);
  await Promise.all(pending.splice(0));
  assert.ok(row(phoneOnlyId).asked_at);
  const ask = callsOf("sendMessage").find((c) => c.body.chat_id === USER.id && /Hali dolzarbmi/.test(c.body.text));
  assert.ok(ask, "savol yuborilmadi");
  assert.ok(JSON.stringify(ask.body.reply_markup).includes(`u:keep:${phoneOnlyId}`));

  // javob bermadi → 4 kundan keyin yopiladi
  env.DB.raw.prepare("UPDATE listings SET asked_at=? WHERE id=?").run(Math.floor(Date.now() / 1000) - 4 * 86400, phoneOnlyId);
  await worker.scheduled({}, env, ctx);
  await Promise.all(pending.splice(0));
  assert.equal(row(phoneOnlyId).status, "closed");
  assert.match(lastCall("editMessageCaption").body.caption, /dolzarb emas/);
});

test("30 kun: «Ha, dolzarb» bosilsa yana 30 kun qoladi", async () => {
  env.DB.raw.prepare("UPDATE listings SET asked_at=? WHERE id=?").run(Math.floor(Date.now() / 1000), userOnlyId);
  await cb(USER, `u:keep:${userOnlyId}`);
  const r = row(userOnlyId);
  assert.equal(r.asked_at, null);
  assert.equal(r.status, "published");
  assert.ok(r.check_at > Date.now() / 1000 + 29 * 86400);
  await cb(OTHER, `u:closed:${userOnlyId}`); // begona odam yopa olmaydi
  assert.equal(row(userOnlyId).status, "published");
});

test("to'lov eslatmasi bir marta, admin eslatmasi va tozalash", async () => {
  const fd = form({ kind: "sotuv", region: "Toshkent shahri", district: "Chilonzor tumani", age: "1 yosh", gender: "m",
    delivery: "yoq", price: "500000", phone: "+998901112233" });
  const { id } = await reqJson("/api/submit", { method: "POST", body: fd });
  await cmd({ id: ADMIN, first_name: "Admin" }, "/karta 8600 1234 1234 1234 Ism Familiya");
  await cb({ id: ADMIN, first_name: "Admin" }, `m:ok:${id}`);
  assert.equal(row(id).status, "awaiting_payment");
  const t = Math.floor(Date.now() / 1000);
  env.DB.raw.prepare("UPDATE listings SET pay_deadline=? WHERE id=?").run(t + 10 * 3600, id);
  // eski pending e'lon (admin eslatmasi uchun) va eski vaqtinchalik sozlamalar
  env.DB.raw.prepare("UPDATE listings SET created_at=? WHERE status='pending'").run(t - 7 * 3600);
  env.DB.raw.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('mg:1','5',?), ('mg:2','6',?), ('done:1',?,?)")
    .run(t - 3 * 86400, t, String(t - 10), t);
  const n = callsOf("sendMessage").length;
  await worker.scheduled({}, env, ctx);
  await Promise.all(pending.splice(0));
  const sent = callsOf("sendMessage").slice(n);
  assert.ok(sent.some((c) => c.body.chat_id === USER.id && /muddati tugashiga 10 soat/.test(c.body.text)));
  assert.ok(sent.some((c) => c.body.chat_id === ADMIN && /Ko'rib chiqilmagan/.test(c.body.text)));
  const keys = env.DB.raw.prepare("SELECT key FROM settings WHERE key LIKE 'mg:%' OR key LIKE 'done:%'").all().map((r) => r.key);
  assert.deepEqual(keys, ["mg:2"]);
  // ikkinchi marta eslatilmaydi
  const n2 = callsOf("sendMessage").length;
  await worker.scheduled({}, env, ctx);
  await Promise.all(pending.splice(0));
  assert.equal(callsOf("sendMessage").length, n2);
});

test("import qilingan post yopilganda formatlash (entities) saqlanadi", async () => {
  const text = "#hadyaga\nChiroyli mushukcha\nManzil: Chilonzor\n📞 +998901234567\nQo'shimcha: juda yoqimtoy";
  const bold = { type: "bold", offset: text.indexOf("Chiroyli"), length: "Chiroyli mushukcha".length };
  const link = { type: "text_link", offset: text.indexOf("juda"), length: 4, url: "https://x.uz" };
  const phoneEnt = { type: "phone_number", offset: text.indexOf("+998"), length: 13 };
  await tgUpdate({ channel_post: { message_id: 77, date: 1700000000, chat: { id: -100, username: "Hadyagamushuklar" },
    photo: [{ file_id: "a" }, { file_id: "b" }], caption: text, caption_entities: [bold, link, phoneEnt] } });
  const l = env.DB.raw.prepare("SELECT * FROM listings WHERE channel_msg_id=77").get();
  assert.equal(JSON.parse(l.data).entities.length, 3);
  await cb({ id: ADMIN, first_name: "Admin" }, `a:closed:${l.id}`);
  const edit = lastCall("editMessageCaption").body;
  assert.doesNotMatch(edit.caption, /998/);
  assert.match(edit.caption, /⛔️ E'lon dolzarb emas/);
  const ents = edit.caption_entities;
  assert.equal(ents.length, 2); // telefon formatlashi kontakt bilan birga ketdi
  const b = ents.find((e) => e.type === "bold");
  assert.equal(edit.caption.slice(b.offset, b.offset + b.length), "Chiroyli mushukcha");
  const a = ents.find((e) => e.type === "text_link");
  assert.equal(edit.caption.slice(a.offset, a.offset + a.length), "juda");
});

test("sxema versiyasi saqlanadi (keyingi ishga tushishda migratsiya qayta ishlamaydi)", async () => {
  const v = env.DB.raw.prepare("SELECT value FROM settings WHERE key='schema_v'").get();
  assert.equal(v.value, "4");
});

// ---------------------------------------------------------------- 2-bosqich: tuzatishlar
const T = () => Math.floor(Date.now() / 1000);
// Kanalda turgan e'lonni to'g'ridan-to'g'ri bazaga qo'shish
function insertPublished(userId, { publishedAgo = 0, kind = "hadya" } = {}) {
  const data = JSON.stringify({ phone: "+998901234567", breed: "oddiy", age: "1 yosh", gender: "u", delivery: "bor", health: [] });
  const r = env.DB.raw.prepare(
    "INSERT INTO listings (user_id, username, kind, region, district, data, media, status, channel_msg_id, channel_username, created_at, published_at, check_at) " +
    "VALUES (?, NULL, ?, 'Toshkent shahri', 'Chilonzor tumani', ?, '[]', 'published', ?, 'Hadyagamushuklar', ?, ?, NULL)"
  ).run(userId, kind, data, ++msgId, T() - publishedAgo, T() - publishedAgo);
  return Number(r.lastInsertRowid);
}
const makeUser = (id, daysOld) => env.DB.raw.prepare(
  "INSERT OR REPLACE INTO users (id, username, first_name, banned, created_at) VALUES (?, ?, ?, 0, ?)"
).run(id, "u" + id + "_name", "U" + id, T() - daysOld * 86400);
const runCron = async () => {
  await worker.scheduled({}, env, ctx);
  await Promise.all(pending.splice(0));
};

test("shikoyat: kunlik limit 5 ta", async () => {
  makeUser(700, 30);
  for (let i = 0; i < 5; i++) env.DB.raw.prepare("INSERT INTO reports VALUES (?, 700, 'other', ?)").run(90000 + i, T());
  const id = insertPublished(USER.id);
  const j = await reqJson(`/api/listings/${id}/report`, { method: "POST", user: { id: 700, first_name: "U" }, body: { reason: "scam" } });
  assert.match(j.error, /5 tadan ortiq/);
});

test("shikoyat: 3 ta ishonchli shikoyatda yashiriladi, yangi akkaunt hisobga olinmaydi, admin qaytara oladi", async () => {
  const id = insertPublished(USER.id);
  [801, 802, 803, 804].forEach((u) => makeUser(u, 30)); // eski (ishonchli) akkauntlar
  makeUser(810, 1); // yangi akkaunt
  const report = (uid) => reqJson(`/api/listings/${id}/report`, { method: "POST", user: { id: uid, first_name: "U" + uid }, body: { reason: "scam" } });
  const adminMsgs = () => callsOf("sendMessage").filter((c) => c.body.chat_id === ADMIN).length;

  let before = adminMsgs();
  assert.equal((await report(810)).ok, true); // birinchi shikoyat → adminga xabar
  assert.equal(adminMsgs(), before + 1);
  before = adminMsgs();
  await report(801);
  await report(802); // jami 3 ta, lekin ishonchlisi 2 ta → yashirilmaydi, admin bezovta qilinmaydi
  assert.equal(adminMsgs(), before);
  assert.equal(row(id).status, "published");
  await report(803); // 3-ishonchli → yashiriladi
  assert.equal(row(id).status, "reported");
  const hidden = callsOf("sendMessage").filter((c) => c.body.chat_id === ADMIN).at(-1).body;
  assert.match(hidden.text, /vaqtincha yashirildi.*4 ta shikoyat \(3 tasi ishonchli/);
  assert.ok(JSON.stringify(hidden.reply_markup).includes(`a:restore:${id}`));
  assert.ok(callsOf("sendMessage").some((c) => c.body.chat_id === USER.id && /vaqtincha olindi/.test(c.body.text)));
  assert.equal((await req(`/api/listings/${id}`)).status, 404); // ilovada ko'rinmaydi
  const my = await reqJson("/api/my", { user: USER });
  assert.equal(my.items.find((i) => i.id === id).status, "reported");

  await cb({ id: ADMIN, first_name: "Admin" }, `a:restore:${id}`);
  assert.equal(row(id).status, "published");
  assert.ok(row(id).reports_after);
  before = adminMsgs();
  await report(804); // qaytarilgandan keyingi birinchi shikoyat → yana «birinchi» xabar, yashirilmaydi
  assert.equal(row(id).status, "published");
  assert.equal(adminMsgs(), before + 1);
});

test("yashirilgan e'lonni egasi yoki admin yopa oladi", async () => {
  const id = insertPublished(USER.id);
  env.DB.raw.prepare("UPDATE listings SET status='reported' WHERE id=?").run(id);
  const j = await reqJson(`/api/my/${id}/close`, { method: "POST", user: USER, body: { status: "given" } });
  assert.equal(j.ok, true, j.error);
  assert.equal(row(id).status, "given");
});

test("30 kun: vaqtincha xato bo'lsa «so'raldi» belgisi qo'yilmaydi, keyin qayta uriniladi", async () => {
  const owner = 444;
  const id = insertPublished(owner, { publishedAgo: 31 * 86400 });
  failSend.set(owner, { code: 429, description: "Too Many Requests" });
  await runCron();
  assert.equal(row(id).asked_at, null);
  assert.equal(row(id).ask_tries, 1);
  failSend.delete(owner);
  await runCron();
  assert.ok(row(id).asked_at, "ikkinchi urinishda yetib bordi");
  assert.equal(row(id).ask_blocked, null);
});

test("30 kun: egasi botni bloklagan bo'lsa, 3 emas 15 kundan keyin yopiladi", async () => {
  const owner = 445;
  const id = insertPublished(owner, { publishedAgo: 31 * 86400 });
  failSend.set(owner, { code: 403, description: "Forbidden: bot was blocked by the user" });
  await runCron();
  assert.equal(row(id).ask_blocked, 1);
  env.DB.raw.prepare("UPDATE listings SET asked_at=? WHERE id=?").run(T() - 4 * 86400, id);
  await runCron();
  assert.equal(row(id).status, "published", "4 kun — hali yopilmaydi");
  env.DB.raw.prepare("UPDATE listings SET asked_at=? WHERE id=?").run(T() - 16 * 86400, id);
  const n = callsOf("sendMessage").filter((c) => c.body.chat_id === owner).length;
  await runCron();
  assert.equal(row(id).status, "closed");
  assert.equal(callsOf("sendMessage").filter((c) => c.body.chat_id === owner).length, n, "bloklagan egaga yozilmaydi");
  failSend.delete(owner);
});

test("30 kun: 5 marta yetmasa, bloklangan deb hisoblanadi", async () => {
  const owner = 446;
  const id = insertPublished(owner, { publishedAgo: 31 * 86400 });
  env.DB.raw.prepare("UPDATE listings SET ask_tries=4 WHERE id=?").run(id);
  failSend.set(owner, { code: 500, description: "Internal Server Error" });
  await runCron();
  assert.equal(row(id).ask_blocked, 1);
  assert.equal(row(id).ask_tries, 5);
  failSend.delete(owner);
});

test("byudjet: bitta ishga tushishda chegaradan oshmaydi, qolganlari keyingi safar", async () => {
  const owner = 555;
  const ids = Array.from({ length: 30 }, () => insertPublished(owner, { publishedAgo: 31 * 86400 }));
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(" "));
  try {
    await runCron();
  } finally {
    console.log = orig;
  }
  const used = Number(logs.find((l) => l.startsWith("Cron:")).match(/(\d+) ta so'rov/)[1]);
  assert.ok(used <= 40, `so'rovlar: ${used}`);
  const asked = () => ids.filter((id) => row(id).asked_at).length;
  const first = asked();
  assert.ok(first > 0 && first < 30, `birinchi safar so'ralganlar: ${first}`);
  for (let i = 0; i < 6; i++) await runCron();
  assert.equal(asked(), 30, "keyingi ishga tushishlarda hammasi so'raldi");
});

// ---------------------------------------------------------------- 3-bosqich: admin boshqaruvi va kanal
const CH = "@Hadyagamushuklar";
const toChannel = (method) => callsOf(method).filter((c) => c.body.chat_id === CH);
const ADM = { id: ADMIN, first_name: "Admin" };

test("«Dolzarb emas»: post tahrirlanadi, kanalga alohida xabar yuborilmaydi; «Berildi»da javob yoziladi", async () => {
  const a = insertPublished(USER.id), b = insertPublished(USER.id);
  let n = toChannel("sendMessage").length;
  let j = await reqJson(`/api/my/${a}/close`, { method: "POST", user: USER, body: { status: "closed" } });
  assert.equal(j.ok, true, j.error);
  assert.equal(toChannel("sendMessage").length, n, "kanalga xabar ketmasligi kerak");
  assert.match(lastCall("editMessageCaption").body.caption, /dolzarb emas/);
  n = toChannel("sendMessage").length;
  j = await reqJson(`/api/my/${b}/close`, { method: "POST", user: USER, body: { status: "given" } });
  assert.equal(toChannel("sendMessage").length, n + 1);
  assert.ok(row(b).close_reply_msg, "javob xabari raqami saqlanadi");
});

test("admin: berilgan e'lonni yana faol qiladi — kontaktlar qaytadi, «Berildi» javobi o'chiriladi", async () => {
  const id = insertPublished(USER.id);
  await reqJson(`/api/my/${id}/close`, { method: "POST", user: USER, body: { status: "given" } });
  const reply = row(id).close_reply_msg;
  let j = await reqJson(`/api/admin/listings/${id}/status`, { method: "POST", user: USER, body: { status: "published" } });
  assert.equal(j.ok, false);
  assert.match(j.error, /faqat adminlar/);
  j = await reqJson(`/api/admin/listings/${id}/status`, { method: "POST", user: ADM, body: { status: "published" } });
  assert.equal(j.ok, true, j.error);
  const r = row(id);
  assert.equal(r.status, "published");
  assert.equal(r.closed_at, null);
  assert.ok(r.check_at > T() + 29 * 86400);
  assert.match(lastCall("editMessageCaption").body.caption, /📞/);
  assert.equal(lastCall("deleteMessage").body.message_id, reply);
});

test("admin: yopilish turini almashtiradi va ro'yxatda yopilganlarni ko'radi (oddiy foydalanuvchi — yo'q)", async () => {
  const id = insertPublished(USER.id);
  await reqJson(`/api/admin/listings/${id}/status`, { method: "POST", user: ADM, body: { status: "closed" } });
  let j = await reqJson(`/api/admin/listings/${id}/status`, { method: "POST", user: ADM, body: { status: "given" } });
  assert.equal(j.ok, true, j.error);
  assert.equal(row(id).status, "given");
  j = await reqJson(`/api/admin/listings/${id}/status`, { method: "POST", user: ADM, body: { status: "sold" } });
  assert.match(j.error, /faqat sotuv/);
  const adminList = await reqJson("/api/listings?status=closed", { user: ADM });
  assert.ok(adminList.items.some((i) => i.id === id));
  const userList = await reqJson("/api/listings?status=closed", { user: USER });
  assert.ok(!userList.items.some((i) => i.id === id), "oddiy foydalanuvchiga faqat faol e'lonlar");
  const d = await reqJson(`/api/listings/${id}`, { user: ADM });
  assert.ok(d.admin, "adminga tahrirlash ma'lumoti beriladi");
  assert.equal((await reqJson(`/api/listings/${id}`, { user: USER })).admin, null);
});

test("admin: tahrirlash — ma'lumot va kanaldagi post yangilanadi", async () => {
  const id = insertPublished(USER.id);
  const body = { kind: "hadya", region: "Samarqand viloyati", district: "Urgut tumani", breed: "Britan", age: "4 oylik",
    gender: "m", health: "soglom", delivery: "bor", phone: "+998 90 111 22 33", tg_username: "", extra: "Yangi izoh" };
  let j = await reqJson(`/api/admin/listings/${id}/edit`, { method: "POST", user: USER, body });
  assert.match(j.error, /faqat adminlar/);
  j = await reqJson(`/api/admin/listings/${id}/edit`, { method: "POST", user: ADM, body });
  assert.equal(j.ok, true, j.error);
  const r = row(id), data = JSON.parse(r.data);
  assert.equal(r.region, "Samarqand viloyati");
  assert.equal(data.breed, "Britan");
  assert.equal(data.phone, "+998901112233");
  const cap = lastCall("editMessageCaption").body.caption;
  assert.match(cap, /Britan/);
  assert.match(cap, /#Samarqand #Urgut/);
  j = await reqJson(`/api/admin/listings/${id}/edit`, { method: "POST", user: ADM, body: { ...body, phone: "", tg_username: "" } });
  assert.match(j.error, /kamida bittasini/);
});

test("admin: import qilingan postning matnini tahrirlash", async () => {
  const text = "#hadyaga\nMushukcha beriladi\nManzil: Chilonzor\n📞 +998901234567";
  await tgUpdate({ channel_post: { message_id: 4242, date: T(), chat: { id: -100, username: "Hadyagamushuklar" },
    photo: [{ file_id: "x" }], caption: text, caption_entities: [{ type: "bold", offset: 9, length: 18 }] } });
  const l = env.DB.raw.prepare("SELECT * FROM listings WHERE channel_msg_id=4242").get();
  const j = await reqJson(`/api/admin/listings/${l.id}/edit`, { method: "POST", user: ADM,
    body: { kind: "hadya", region: "Toshkent shahri", district: "Chilonzor tumani", raw: text + "\nYoshi: 2 oylik" } });
  assert.equal(j.ok, true, j.error);
  const data = JSON.parse(row(l.id).data);
  assert.match(data.raw, /2 oylik/);
  assert.equal(data.entities, undefined, "matn o'zgardi — eski formatlash olib tashlanadi");
  assert.equal(lastCall("editMessageCaption").body.message_id, 4242);
});

test("admin: o'chirish — ilovadan olinadi, so'ralsa kanaldagi post ham o'chiriladi", async () => {
  const id = insertPublished(USER.id);
  const msg = row(id).channel_msg_id;
  const j = await reqJson(`/api/admin/listings/${id}/delete`, { method: "POST", user: ADM, body: { channel: true } });
  assert.equal(j.ok, true, j.error);
  assert.equal(j.channel_deleted, true);
  assert.equal(row(id).status, "hidden");
  assert.equal(lastCall("deleteMessage").body.message_id, msg);
  assert.equal((await req(`/api/listings/${id}`)).status, 404);
  const again = await reqJson(`/api/admin/listings/${id}/delete`, { method: "POST", user: ADM, body: {} });
  assert.match(again.error, /topilmadi/);
});

test("kanal: oddiy post (salomlashish, kanal nomi) e'lon bo'lib qo'shilmaydi; #hadyaga bilan qo'shiladi", async () => {
  const count = () => env.DB.raw.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
  const post = (id, caption) => tgUpdate({ channel_post: { message_id: id, date: T(), chat: { id: -100, username: "Hadyagamushuklar" },
    photo: [{ file_id: "p" + id }], caption } });
  const n = count();
  await post(5001, "Assalomu alaykum, kanal a'zolari! 🐾\nKanal: @Hadyagamushuklar");
  await post(5002, "Bugun bepul vaktsina aksiyasi! #yangilik");
  await post(5003, "Kanalimiz #hadyagamushuklar ga obuna bo'ling");
  await tgUpdate({ channel_post: { message_id: 5004, date: T(), chat: { id: -100, username: "Hadyagamushuklar" }, text: "#hadyaga matnli post" } });
  assert.equal(count(), n, "e'lon bo'lmagan postlar qo'shilmadi");
  await post(5005, "#hadyaga\nMushukcha beriladi\nManzil: Yunusobod");
  assert.equal(count(), n + 1);
  // admin forward qilsa ham kanal nomidagi «hadya» so'zi e'lon turi deb hisoblanmaydi
  await tgUpdate({ message: { message_id: 9, from: ADM, chat: { id: ADMIN, type: "private" }, caption: "Salom! Kanal: @Hadyagamushuklar",
    photo: [{ file_id: "q" }], forward_origin: { type: "channel", chat: { id: -100, username: "Hadyagamushuklar" }, message_id: 5006, date: T() } } });
  assert.match(lastCall("sendMessage").body.text, /Turi aniqlanmadi/);
  assert.equal(count(), n + 1);
});
