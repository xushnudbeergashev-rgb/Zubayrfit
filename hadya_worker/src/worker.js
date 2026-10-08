// Hadyaga mushuklar — Telegram bot + Mini App (Cloudflare Workers + D1)
// Kanal: @Hadyagamushuklar   Bot: @hadyaga_mushuk_bot
//
// Sozlamalar (Worker → Settings → Variables and Secrets):
//   BOT_TOKEN     (Secret)  BotFather bergan token
//   ADMIN_IDS     (Text)    adminlar Telegram ID'si, vergul bilan: 111,222
//   CHANNEL       (Text)    @Hadyagamushuklar
//   ADMIN_CONTACT (Text)    foydalanuvchilarga ko'rsatiladigan admin: @username
//   OPENAI_API_KEY (Secret) AI savol-javob bo'limi uchun (ixtiyoriy)
//   OPENAI_MODEL  (Text)    ixtiyoriy, standart: gpt-4o-mini
// Bog'lanish (Settings → Bindings): D1 baza, nomi DB
// Birinchi marta: brauzerda https://<worker-manzili>/setup ni oching.

const INDEX_HTML = __INDEX_HTML__;
const REGIONS = [{"name":"Toshkent shahri","tag":"Toshkent_shahri","d":[["Bektemir tumani","Bektemir"],["Chilonzor tumani","Chilonzor"],["Mirobod tumani","Mirobod"],["Mirzo Ulug'bek tumani","Mirzo_Ulugbek"],["Olmazor tumani","Olmazor"],["Shayxontohur tumani","Shayxontohur"],["Sirg'ali tumani","Sirgali"],["Uchtepa tumani","Uchtepa"],["Yakkasaroy tumani","Yakkasaroy"],["Yangihayot tumani","Yangihayot"],["Yashnobod tumani","Yashnobod"],["Yunusobod tumani","Yunusobod"]]},{"name":"Toshkent viloyati","tag":"Toshkent_viloyati","d":[["Angren shahri","Angren"],["Bekobod shahri","Bekobod"],["Chirchiq shahri","Chirchiq"],["Nurafshon shahri","Nurafshon"],["Ohangaron shahri","Ohangaron"],["Olmaliq shahri","Olmaliq"],["Yangiyo'l shahri","Yangiyol"],["Bekobod tumani","Bekobod"],["Bo'ka tumani","Boka"],["Bo'stonliq tumani","Bostonliq"],["Chinoz tumani","Chinoz"],["O'rtachirchiq tumani","Ortachirchiq"],["Ohangaron tumani","Ohangaron"],["Oqqo'rg'on tumani","Oqqorgon"],["Parkent tumani","Parkent"],["Piskent tumani","Piskent"],["Qibray tumani","Qibray"],["Quyichirchiq tumani","Quyichirchiq"],["Toshkent tumani","Toshkent"],["Yangiyo'l tumani","Yangiyol"],["Yuqorichirchiq tumani","Yuqorichirchiq"],["Zangiota tumani","Zangiota"]]},{"name":"Andijon viloyati","tag":"Andijon","d":[["Andijon shahri","Andijon"],["Xonobod shahri","Xonobod"],["Andijon tumani","Andijon"],["Asaka tumani","Asaka"],["Baliqchi tumani","Baliqchi"],["Bo'z tumani","Boz"],["Buloqboshi tumani","Buloqboshi"],["Izboskan tumani","Izboskan"],["Jalaquduq tumani","Jalaquduq"],["Marxamat tumani","Marxamat"],["Oltinko'l tumani","Oltinkol"],["Paxtaobod tumani","Paxtaobod"],["Qo'rg'ontepa tumani","Qorgontepa"],["Shahrixon tumani","Shahrixon"],["Ulug'nor tumani","Ulugnor"],["Xo'jaobod tumani","Xojaobod"]]},{"name":"Buxoro viloyati","tag":"Buxoro","d":[["Buxoro shahri","Buxoro"],["Kogon shahri","Kogon"],["Buxoro tumani","Buxoro"],["G'ijduvon tumani","Gijduvon"],["Jondor tumani","Jondor"],["Kogon tumani","Kogon"],["Olot tumani","Olot"],["Peshku tumani","Peshku"],["Qorako'l tumani","Qorakol"],["Qorovulbozor tumani","Qorovulbozor"],["Romitan tumani","Romitan"],["Shofirkon tumani","Shofirkon"],["Vobkent tumani","Vobkent"]]},{"name":"Farg'ona viloyati","tag":"Fargona","d":[["Farg'ona shahri","Fargona"],["Marg'ilon shahri","Margilon"],["Qo'qon shahri","Qoqon"],["Quvasoy shahri","Quvasoy"],["Beshariq tumani","Beshariq"],["Bog'dod tumani","Bogdod"],["Buvayda tumani","Buvayda"],["Dang'ara tumani","Dangara"],["Farg'ona tumani","Fargona"],["Furqat tumani","Furqat"],["O'zbekiston tumani","Ozbekiston"],["Oltiariq tumani","Oltiariq"],["Qo'shtepa tumani","Qoshtepa"],["Quva tumani","Quva"],["Rishton tumani","Rishton"],["So'x tumani","Sox"],["Toshloq tumani","Toshloq"],["Uchko'prik tumani","Uchkoprik"],["Yozyovon tumani","Yozyovon"]]},{"name":"Jizzax viloyati","tag":"Jizzax","d":[["Jizzax shahri","Jizzax"],["Arnasoy tumani","Arnasoy"],["Baxmal tumani","Baxmal"],["Do'stlik tumani","Dostlik"],["Forish tumani","Forish"],["G'allaorol tumani","Gallaorol"],["Mirzacho'l tumani","Mirzachol"],["Paxtakor tumani","Paxtakor"],["Sharof Rashidov tumani","Sharof_Rashidov"],["Yangiobod tumani","Yangiobod"],["Zafarobod tumani","Zafarobod"],["Zarbdor tumani","Zarbdor"],["Zomin tumani","Zomin"]]},{"name":"Xorazm viloyati","tag":"Xorazm","d":[["Urganch shahri","Urganch"],["Xiva shahri","Xiva"],["Bog'ot tumani","Bogot"],["Gurlan tumani","Gurlan"],["Qo'shko'pir tumani","Qoshkopir"],["Shovot tumani","Shovot"],["Tuproqqal'a tumani","Tuproqqala"],["Urganch tumani","Urganch"],["Xazorasp tumani","Xazorasp"],["Xiva tumani","Xiva"],["Xonqa tumani","Xonqa"],["Yangiariq tumani","Yangiariq"],["Yangibozor tumani","Yangibozor"]]},{"name":"Namangan viloyati","tag":"Namangan","d":[["Namangan shahri","Namangan"],["Chortoq tumani","Chortoq"],["Chust tumani","Chust"],["Davlatobod tumani","Davlatobod"],["Kosonsoy tumani","Kosonsoy"],["Mingbuloq tumani","Mingbuloq"],["Namangan tumani","Namangan"],["Norin tumani","Norin"],["Pop tumani","Pop"],["To'raqo'rg'on tumani","Toraqorgon"],["Uchqo'rg'on tumani","Uchqorgon"],["Uychi tumani","Uychi"],["Yangi Namangan tumani","Yangi_Namangan"],["Yangiqo'rg'on tumani","Yangiqorgon"]]},{"name":"Navoiy viloyati","tag":"Navoiy","d":[["Navoiy shahri","Navoiy"],["Zarafshon shahri","Zarafshon"],["G'ozg'on tumani","Gozgon"],["Karmana tumani","Karmana"],["Konimex tumani","Konimex"],["Navbahor tumani","Navbahor"],["Nurota tumani","Nurota"],["Qiziltepa tumani","Qiziltepa"],["Tomdi tumani","Tomdi"],["Uchquduq tumani","Uchquduq"],["Xatirchi tumani","Xatirchi"]]},{"name":"Qashqadaryo viloyati","tag":"Qashqadaryo","d":[["Qarshi shahri","Qarshi"],["Shahrisabz shahri","Shahrisabz"],["Chiroqchi tumani","Chiroqchi"],["Dehqonobod tumani","Dehqonobod"],["G'uzor tumani","Guzor"],["Kasbi tumani","Kasbi"],["Kitob tumani","Kitob"],["Ko'kdala tumani","Kokdala"],["Koson tumani","Koson"],["Mirishkor tumani","Mirishkor"],["Muborak tumani","Muborak"],["Nishon tumani","Nishon"],["Qamashi tumani","Qamashi"],["Qarshi tumani","Qarshi"],["Shahrisabz tumani","Shahrisabz"],["Yakkabog' tumani","Yakkabog"]]},{"name":"Qoraqalpog'iston Respublikasi","tag":"Qoraqalpogiston","d":[["Nukus shahri","Nukus"],["Amudaryo tumani","Amudaryo"],["Beruniy tumani","Beruniy"],["Bo'zatov tumani","Bozatov"],["Chimboy tumani","Chimboy"],["Ellikqal'a tumani","Ellikqala"],["Kegeyli tumani","Kegeyli"],["Mo'ynoq tumani","Moynoq"],["Nukus tumani","Nukus"],["Qanliko'l tumani","Qanlikol"],["Qo'ng'irot tumani","Qongirot"],["Qorao'zak tumani","Qoraozak"],["Shumanay tumani","Shumanay"],["Taxiatosh tumani","Taxiatosh"],["Taxtako'pir tumani","Taxtakopir"],["To'rtko'l tumani","Tortkol"],["Xo'jayli tumani","Xojayli"]]},{"name":"Samarqand viloyati","tag":"Samarqand","d":[["Kattaqo'rg'on shahri","Kattaqorgon"],["Samarqand shahri","Samarqand"],["Bulung'ur tumani","Bulungur"],["Ishtixon tumani","Ishtixon"],["Jomboy tumani","Jomboy"],["Kattaqo'rg'on tumani","Kattaqorgon"],["Narpay tumani","Narpay"],["Nurobod tumani","Nurobod"],["Oqdaryo tumani","Oqdaryo"],["Pastdarg'om tumani","Pastdargom"],["Paxtachi tumani","Paxtachi"],["Payariq tumani","Payariq"],["Qo'shrabot tumani","Qoshrabot"],["Samarqand tumani","Samarqand"],["Tayloq tumani","Tayloq"],["Urgut tumani","Urgut"]]},{"name":"Sirdaryo viloyati","tag":"Sirdaryo","d":[["Baxt shahri","Baxt"],["Guliston shahri","Guliston"],["Shirin shahri","Shirin"],["Yangiyer shahri","Yangiyer"],["Boyovut tumani","Boyovut"],["Guliston tumani","Guliston"],["Mirzaobod tumani","Mirzaobod"],["Oqoltin tumani","Oqoltin"],["Sardoba tumani","Sardoba"],["Sayxunobod tumani","Sayxunobod"],["Sirdaryo tumani","Sirdaryo"],["Xovos tumani","Xovos"]]},{"name":"Surxondaryo viloyati","tag":"Surxondaryo","d":[["Termiz shahri","Termiz"],["Angor tumani","Angor"],["Bandixon tumani","Bandixon"],["Boysun tumani","Boysun"],["Denov tumani","Denov"],["Jarqo'rg'on tumani","Jarqorgon"],["Muzrabot tumani","Muzrabot"],["Oltinsoy tumani","Oltinsoy"],["Qiziriq tumani","Qiziriq"],["Qumqo'rg'on tumani","Qumqorgon"],["Sariosiyo tumani","Sariosiyo"],["Sherobod tumani","Sherobod"],["Sho'rchi tumani","Shorchi"],["Termiz tumani","Termiz"],["Uzun tumani","Uzun"]]}];

const KINDS = { hadya: "#hadyaga", sotuv: "#sotiladi", reklama: "#reklama" };
const KIND_NAMES = { hadya: "Hadya", sotuv: "Sotuv", reklama: "Reklama" };
const GENDER = { f: "Urg'ochi", m: "Erkak", u: "Noma'lum" };
const HEALTH = { soglom: "Sog'lom", emlangan: "Emlangan", steril: "Sterilizatsiya qilingan" };
const DELIVERY = { bor: "Bor", yoq: "Yo'q", kelish: "Kelishiladi" };
const CLOSED_LABEL = { given: "✅ <b>Berildi</b>", sold: "✅ <b>Sotildi</b>", closed: "⛔️ <b>E'lon dolzarb emas</b>" };
const CLOSED_REPLY = { given: "✅ Berildi", sold: "✅ Sotildi", closed: "⛔️ Dolzarb emas" };
const REJECT_REASONS = {
  photo: "Rasm/video sifati past yoki mushuk ko'rinmayapti",
  info: "Ma'lumotlar to'liq yoki to'g'ri emas",
  kind: "E'lon turi noto'g'ri tanlangan (masalan, sotuv hadya deb berilgan)",
  dup: "Bu e'lon avval joylangan",
  rules: "Kanal qoidalariga mos emas",
};
const S = {
  PENDING: "pending", AWAIT_PAY: "awaiting_payment", PAY_REVIEW: "payment_review", PUBLISHING: "publishing",
  PUBLISHED: "published", GIVEN: "given", SOLD: "sold", CLOSED: "closed", REJECTED: "rejected", EXPIRED: "expired",
};
const STATUS_TEXT = {
  pending: "Admin tekshiruvida", awaiting_payment: "To'lov kutilmoqda", payment_review: "Chek tekshirilmoqda",
  publishing: "Joylanmoqda", published: "Kanalda", given: "Berildi", sold: "Sotildi", closed: "Dolzarb emas",
  rejected: "Rad etildi", expired: "Muddati o'tdi", hidden: "Ilovadan olingan",
};
const DEFAULT_PRICE = 7000;
const FREE_PER_DAY = 3;
const MAX_OPEN = 5;
const PAYMENT_HOURS = 48;
const MAX_MEDIA = 3;
const MAX_PHOTO_MB = 8;
const MAX_VIDEO_MB = 20;
const MB = 1024 * 1024;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, first_name TEXT,
     banned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS listings (
     id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, username TEXT, first_name TEXT,
     kind TEXT NOT NULL, region TEXT NOT NULL, district TEXT NOT NULL,
     data TEXT NOT NULL, media TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'pending',
     reject_reason TEXT, price_due INTEGER, pay_deadline INTEGER, receipt_file_id TEXT,
     channel_msg_id INTEGER, channel_username TEXT,
     created_at INTEGER NOT NULL, published_at INTEGER, closed_at INTEGER, admin_msgs TEXT, pay_msgs TEXT)`,
  `CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day))`,
  `CREATE INDEX IF NOT EXISTS ix_status ON listings(status, region, district)`,
  `CREATE INDEX IF NOT EXISTS ix_user ON listings(user_id)`,
];
// Eski bazaga yangi ustunlar qo'shish (bor bo'lsa xato beradi — e'tiborsiz qoldiriladi)
const MIGRATIONS = [
  "ALTER TABLE listings ADD COLUMN admin_msgs TEXT",
  "ALTER TABLE listings ADD COLUMN pay_msgs TEXT",
];
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady || !env.DB) return;
  try {
    await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  } catch (e) {
    console.log("Sxema:", e.message);
  }
  for (const q of MIGRATIONS) await env.DB.prepare(q).run().catch(() => {});
  schemaReady = true;
}

// ---------------------------------------------------------------- yordamchilar
const now = () => Math.floor(Date.now() / 1000);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtSum = (n) => String(Math.round(+n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const err = (msg, status = 400) => json({ ok: false, error: msg }, status);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function fmtPhone(p) {
  const d = String(p).replace(/^\+/, "");
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : p;
}
function adminIds(env) {
  return String(env.ADMIN_IDS || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
}
const isAdmin = (env, id) => adminIds(env).includes(Number(id));

// ---------------------------------------------------------------- Telegram API
async function tg(env, method, body) {
  const base = env.TG_API || "https://api.telegram.org";
  const opts = { method: "POST" };
  if (body instanceof FormData) opts.body = body;
  else {
    opts.headers = { "content-type": "application/json" };
    opts.body = JSON.stringify(body || {});
  }
  const r = await fetch(`${base}/bot${env.BOT_TOKEN}/${method}`, opts);
  const j = await r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` }));
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}
const tgSafe = (env, method, body) =>
  tg(env, method, body).catch((e) => {
    console.log(e.message);
    return null;
  });

// ---------------------------------------------------------------- baza
const parseRow = (r) => r && { ...r, data: JSON.parse(r.data), media: JSON.parse(r.media) };

async function getListing(env, id) {
  return parseRow(await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first());
}
async function updateListing(env, id, fields) {
  const keys = Object.keys(fields);
  await env.DB.prepare(`UPDATE listings SET ${keys.map((k) => `${k}=?`).join(", ")} WHERE id=?`)
    .bind(...keys.map((k) => fields[k] ?? null), id).run();
}
// Atomik o'tish: holat `from` bo'lsagina o'zgaradi (ikki admin bir vaqtda bossa ham bir marta ishlaydi)
async function changeStatus(env, id, from, to, fields = {}) {
  const olds = Array.isArray(from) ? from : [from];
  const keys = Object.keys(fields);
  const sets = ["status=?", ...keys.map((k) => `${k}=?`)].join(", ");
  const r = await env.DB.prepare(`UPDATE listings SET ${sets} WHERE id=? AND status IN (${olds.map(() => "?").join(",")})`)
    .bind(to, ...keys.map((k) => fields[k] ?? null), id, ...olds).run();
  return r.meta.changes === 1;
}
async function getSetting(env, key, def = null) {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first();
  return r ? r.value : def;
}
async function setSetting(env, key, value) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .bind(key, value === null ? null : String(value)).run();
}
const getPrice = async (env) => parseInt(await getSetting(env, "price", DEFAULT_PRICE), 10);

async function upsertUser(env, u) {
  await env.DB.prepare(
    "INSERT INTO users (id, username, first_name, created_at) VALUES (?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name"
  ).bind(u.id, u.username || null, u.first_name || null, now()).run();
}
async function botUsername(env) {
  let u = await getSetting(env, "bot_username");
  if (!u) {
    u = (await tg(env, "getMe")).username;
    await setSetting(env, "bot_username", u);
  }
  return u;
}

// ---------------------------------------------------------------- hududlar va kanal posti
function findRegion(name) {
  return REGIONS.find((r) => r.name === name);
}
function address(region, district) {
  const r = findRegion(region);
  const d = r && r.d.find((x) => x[0] === district);
  if (!d) return esc(`${region}, ${district}`);
  return d[1] === r.tag ? `#${r.tag}, ${esc(district)}` : `#${r.tag} #${d[1]}`;
}
function healthText(d) {
  let h = (d.health || []).map((x) => HEALTH[x]).filter(Boolean).join(", ");
  if (d.health_note) h = h ? `${h}. ${d.health_note}` : d.health_note;
  return h;
}
function priceText(l) {
  if (l.kind === "hadya") return "Bepul";
  if (l.data.price_text) return l.data.price_text;
  if (l.kind === "sotuv") return l.data.price ? fmtSum(l.data.price) : "Kelishiladi";
  return l.data.price || "Kelishiladi";
}
function shortTitle(l) {
  const d = l.data;
  if (l.kind === "reklama") return d.title || "Reklama";
  if (d.breed || d.age) return [d.breed || "Mushuk", d.age].filter(Boolean).join(", ");
  return d.headline || "Mushuk";
}
const placeText = (l) => [l.region, l.district].filter(Boolean).join(", ") || "Noma'lum";

function buildCaption(env, l, bot, closedAs, extra) {
  const d = l.data;
  const lines = [KINDS[l.kind], ""];
  if (l.kind === "reklama") {
    lines.push(`📢 Nomi: ${esc(d.title)}`, `📝 Tavsif: ${esc(d.about)}`,
      `💰 Narxi: ${esc(priceText(l))}`, `🏠 Manzil: ${address(l.region, l.district)}`);
  } else {
    lines.push(`🦁 Zoti: ${esc(d.breed) || "Noma'lum"}`, `🐈 Yoshi: ${esc(d.age)}`, `😺 Jinsi: ${GENDER[d.gender]}`,
      `🏥 Sogʻligʻi: ${esc(healthText(d)) || "Noma'lum"}`, `🏠 Manzil: ${address(l.region, l.district)}`,
      `🚗 Dostafka: ${DELIVERY[d.delivery]}`, `💰 Narxi: ${priceText(l)}`);
  }
  if (extra) lines.push(`🔖Qo'shimcha ma'lumot: ${esc(extra)}`);
  if (closedAs) lines.push(CLOSED_LABEL[closedAs]);
  else {
    const tgLine = l.username ? `@${esc(l.username)}` : `<a href="tg://user?id=${l.user_id}">Yozish</a>`;
    lines.push(`🌎 Telegram: ${tgLine}`, `📞 ${fmtPhone(d.phone)}`);
  }
  lines.push("", `✅E'lon berish uchun @${bot} ga yozing`);
  if (String(env.CHANNEL || "").startsWith("@")) lines.push("", `Kanal: ${esc(env.CHANNEL)}`);
  return lines.join("\n");
}
// Telegram rasm izohi 1024 belgigacha — sig'masa "Qo'shimcha ma'lumot" qisqartiriladi
function caption(env, l, bot, closedAs = null) {
  let extra = l.data.extra || "";
  let cap = buildCaption(env, l, bot, closedAs, extra);
  const visible = (s) => s.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt);/g, "x").length;
  while (visible(cap) > 1024 && extra.length) {
    extra = extra.slice(0, Math.max(0, extra.length - (visible(cap) - 1024) - 2)) + "…";
    if (extra === "…") extra = "";
    cap = buildCaption(env, l, bot, closedAs, extra);
  }
  return cap;
}

// ---------------------------------------------------------------- forma tekshiruvi
function cleanForm(form) {
  const g = (k, n = 80) => String(form.get(k) ?? "").trim().slice(0, n);
  const kind = g("kind", 10);
  if (!KINDS[kind]) return "E'lon turini tanlang.";
  const region = g("region"), district = g("district");
  const r = findRegion(region);
  if (!r) return "Hududni tanlang.";
  if (!r.d.some((x) => x[0] === district)) return "Tuman yoki shaharni tanlang.";
  const phone = g("phone", 25).replace(/\D/g, "");
  if (!/^998\d{9}$/.test(phone)) return "Telefon raqam +998 XX XXX XX XX ko'rinishida bo'lsin.";
  const data = { phone: "+" + phone };

  if (kind === "reklama") {
    Object.assign(data, { title: g("title", 60), about: g("about", 300), price: g("price", 40), extra: g("extra", 300) });
    if (!data.title) return "Reklama nomini yozing.";
    if (!data.about) return "Qisqacha tavsif yozing.";
  } else {
    const health = String(form.get("health") ?? "").split(",").filter((h) => HEALTH[h]);
    Object.assign(data, {
      breed: g("breed", 40), age: g("age", 30), gender: g("gender", 1), health,
      health_note: g("health_note", 80), delivery: g("delivery", 6), extra: g("extra", 400),
    });
    if (!data.age) return "Yoshini yozing.";
    if (!GENDER[data.gender]) return "Jinsini tanlang.";
    if (!DELIVERY[data.delivery]) return "Dostafka bor-yo'qligini tanlang.";
    if (kind === "sotuv") {
      const p = g("price", 15).replace(/\D/g, "");
      if (!p || +p < 1000) return "Narxni so'mda yozing.";
      data.price = +p;
    }
  }
  return { kind, region, district, data };
}

// ---------------------------------------------------------------- Mini App: foydalanuvchini tekshirish
async function hmacRaw(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
}
async function authUser(env, raw) {
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmacRaw(new TextEncoder().encode("WebAppData"), env.BOT_TOKEN);
  if (hex(await hmacRaw(secret, dcs)) !== hash) return null;
  if (now() - Number(p.get("auth_date") || 0) > 2 * 86400) return null;
  try {
    return JSON.parse(p.get("user"));
  } catch {
    return null;
  }
}
async function webhookSecret(env) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hook:" + env.BOT_TOKEN))).slice(0, 48);
}

// ---------------------------------------------------------------- klaviaturalar
const appKb = (origin) => ({ inline_keyboard: [[{ text: "📱 Ilovani ochish", web_app: { url: origin + "/" } }]] });
const modKb = (l) => ({
  inline_keyboard: [[
    { text: l.kind === "hadya" ? "✅ Tasdiqlash" : "✅ Tasdiqlash → to'lov", callback_data: `m:ok:${l.id}` },
    { text: "❌ Rad etish", callback_data: `m:no:${l.id}` },
  ]],
});
const reasonsKb = (id) => ({
  inline_keyboard: [
    ...Object.entries(REJECT_REASONS).map(([k, t]) => [{ text: t, callback_data: `m:r:${id}:${k}` }]),
    [{ text: "⬅️ Orqaga", callback_data: `m:back:${id}` }],
  ],
});
const payKb = (id) => ({
  inline_keyboard: [[
    { text: "✅ Pul tushdi", callback_data: `p:ok:${id}` },
    { text: "❌ Chek noto'g'ri", callback_data: `p:no:${id}` },
  ]],
});
function mediaItems(items, cap) {
  return items.map((m, i) => ({
    type: m.type,
    media: m.media || m.file_id,
    ...(i === 0 && cap ? { caption: cap, parse_mode: "HTML" } : {}),
    ...(m.type === "video" ? { supports_streaming: true } : {}),
  }));
}

// ---------------------------------------------------------------- asosiy amallar
async function sendToAdmins(env, l, files) {
  const bot = await botUsername(env);
  const cap = caption(env, l, bot);
  const header = `🆕 <b>${KIND_NAMES[l.kind]}</b> e'lon #${l.id} — ${esc(l.region)}, ${esc(l.district)}`;
  let stored = null;
  const refs = [];
  for (const admin of adminIds(env)) {
    try {
      if (!stored) {
        const fd = new FormData();
        fd.append("chat_id", String(admin));
        fd.append("media", JSON.stringify(mediaItems(files.map((f, i) => ({ type: f.type, media: `attach://f${i}` })), cap)));
        files.forEach((f, i) => fd.append(`f${i}`, f.file, f.name));
        const msgs = await tg(env, "sendMediaGroup", fd);
        stored = msgs.map((m) => {
          if (m.video) return { type: "video", file_id: m.video.file_id, thumb: m.video.thumbnail?.file_id || null };
          if (m.photo) return { type: "photo", file_id: m.photo.at(-1).file_id, thumb: m.photo[Math.min(1, m.photo.length - 1)].file_id };
          throw new Error("BAD_VIDEO");
        });
      } else {
        await tg(env, "sendMediaGroup", { chat_id: admin, media: mediaItems(stored, cap) });
      }
      const sent = await tg(env, "sendMessage", { chat_id: admin, text: header + "\nQaroringiz?", parse_mode: "HTML", reply_markup: modKb(l) });
      refs.push([admin, sent.message_id]);
    } catch (e) {
      if (e.message === "BAD_VIDEO") throw e;
      console.log(`Admin ${admin} ga yuborilmadi: ${e.message}`);
    }
  }
  if (!refs.length) throw new Error("Hech bir adminga yetib bormadi");
  await updateListing(env, l.id, { media: JSON.stringify(stored), admin_msgs: JSON.stringify(refs) });
}

async function askPayment(env, l) {
  const card = await getSetting(env, "card", "");
  const owner = await getSetting(env, "card_owner", "");
  const amount = await getPrice(env);
  await updateListing(env, l.id, { price_due: amount, pay_deadline: now() + PAYMENT_HOURS * 3600 });
  await tgSafe(env, "sendMessage", {
    chat_id: l.user_id,
    parse_mode: "HTML",
    text:
      `✅ E'loningiz (#${l.id}) admin tomonidan ma'qullandi!\n\n` +
      `Joylash narxi: <b>${fmtSum(amount)}</b>\nKarta: <code>${esc(card)}</code>\n${esc(owner)}\n\n` +
      `To'lovni qilib, <b>chek rasmini shu botga yuboring</b>. ${PAYMENT_HOURS} soat ichida to'lanmasa, e'lon bekor bo'ladi.`,
  });
}

async function publish(env, id) {
  const l = await getListing(env, id);
  const bot = await botUsername(env);
  const msgs = await tg(env, "sendMediaGroup", { chat_id: env.CHANNEL, media: mediaItems(l.media, caption(env, l, bot)) });
  const first = msgs[0];
  await updateListing(env, id, {
    status: S.PUBLISHED, channel_msg_id: first.message_id,
    channel_username: first.chat.username || null, published_at: now(),
  });
  const link = first.chat.username ? `https://t.me/${first.chat.username}/${first.message_id}` : "";
  await tgSafe(env, "sendMessage", {
    chat_id: l.user_id,
    text: `🎉 E'loningiz kanalga joylandi!\n${link}\n\nMushuk egasini topganda ilovadagi «Mening» bo'limida belgilab qo'ying.`,
  });
  return link;
}

async function closeListing(env, l, status) {
  if (!(await changeStatus(env, l.id, S.PUBLISHED, status, { closed_at: now() }))) return false;
  if (l.data.raw !== undefined) {
    // Kanaldan import qilingan post: asl matn saqlanadi, faqat kontakt qatorlari almashtiriladi
    const text = closedRaw(l, status);
    const method = l.media.length ? "editMessageCaption" : "editMessageText";
    await tgSafe(env, method, { chat_id: env.CHANNEL, message_id: l.channel_msg_id, [l.media.length ? "caption" : "text"]: text });
  } else {
    const bot = await botUsername(env);
    await tgSafe(env, "editMessageCaption", {
      chat_id: env.CHANNEL, message_id: l.channel_msg_id, caption: caption(env, l, bot, status), parse_mode: "HTML",
    });
  }
  await tgSafe(env, "sendMessage", {
    chat_id: env.CHANNEL, text: CLOSED_REPLY[status],
    reply_parameters: { message_id: l.channel_msg_id, allow_sending_without_reply: true },
  });
  return true;
}

// ---------------------------------------------------------------- kanaldagi postlarni ilovaga qo'shish
// Telegram botlarga kanalning eski postlarini o'qishga ruxsat bermaydi. Shuning uchun:
//  1) admin eski postni botga forward qiladi → bot matnini tahlil qilib ilovaga qo'shadi;
//  2) kanalga qo'lda joylangan yangi postlar (channel_post) avtomatik qo'shiladi.
const normTxt = (s) => String(s || "").toLowerCase().replace(/[ʻʼ'‘’`´]/g, "").replace(/_/g, " ");
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordIn = (hay, key) => new RegExp(`(^|[^a-z0-9])${reEsc(key)}([^a-z0-9]|$)`).test(hay);

function detectPlace(text, manzil) {
  const tags = (String(text).match(/#[^\s#]+/g) || []).join(" ");
  const hay = normTxt(`${manzil || ""} ${tags}`);
  let region = null;
  if (wordIn(hay, "toshkent")) region = findRegion(/viloyat/.test(hay) ? "Toshkent viloyati" : "Toshkent shahri");
  if (!region) {
    region = REGIONS.find((r) => !r.name.startsWith("Toshkent") &&
      (wordIn(hay, normTxt(r.tag)) || wordIn(hay, normTxt(r.name.split(" ")[0]))));
  }
  const pool = region ? [region] : REGIONS;
  // avval to'liq nom ("qoqon shahri", "andijon tumani"), keyin qisqa nom ("qoqon").
  // Bir nechtasi topilsa, viloyat nomi bilan bir xil bo'lmagani (aniqroq joy) tanlanadi.
  for (const full of [true, false]) {
    const found = [];
    for (const r of pool) {
      for (const [dn, dt] of r.d) {
        const key = full ? normTxt(dn) : normTxt(dt);
        if (key.length > 2 && wordIn(hay, key)) found.push({ r, dn, dt });
      }
    }
    if (found.length) {
      const best = found.find((f) => f.dt !== f.r.tag) || found[0];
      return { region: best.r.name, district: best.dn };
    }
  }
  return { region: region ? region.name : "", district: "" };
}

function parsePost(text, skipNames) {
  const t = String(text || "");
  const low = normTxt(t);
  const lines = t.split("\n");
  const field = (re) => {
    for (const ln of lines) {
      const i = ln.search(/[:：]/);
      if (i > 0 && re.test(normTxt(ln.slice(0, i)))) return ln.slice(i + 1).trim();
    }
    return "";
  };
  let kind = /#reklama/.test(low) ? "reklama" : /#sotil|#sotuv/.test(low) ? "sotuv" : /#hadya/.test(low) ? "hadya" : null;
  if (!kind) kind = /hadya|bepul|tekin/.test(low) ? "hadya" : /narx/.test(low) ? "sotuv" : null;
  if (!kind) return null;

  const manzil = field(/manzil|hudud|joy/);
  const place = detectPlace(t, manzil);

  // telefon: avval 📞/telefon qatoridan, bo'lmasa matndagi +998... raqamdan
  let phone = "";
  for (const ln of lines) {
    const digits = ln.replace(/\D/g, "");
    const n = normTxt(ln);
    if ((/📞|☎|telefon|tel\b|raqam/.test(n) || /\+998/.test(ln)) && digits.length >= 9) {
      const m = digits.match(/998\d{9}/) || digits.match(/\d{9}$/);
      if (m) {
        phone = "+" + (m[0].length === 9 ? "998" + m[0] : m[0]);
        break;
      }
    }
  }
  // Telegram username
  const skip = skipNames.map((s) => s.toLowerCase());
  let username = (field(/telegram/).match(/@?([A-Za-z][A-Za-z0-9_]{3,31})/) || [])[1] || "";
  if (!username || skip.includes(username.toLowerCase())) {
    username = [...t.matchAll(/@([A-Za-z][A-Za-z0-9_]{3,31})/g)].map((m) => m[1]).find((u) => !skip.includes(u.toLowerCase())) || "";
  }

  const gRaw = normTxt(field(/jins/));
  const dRaw = normTxt(field(/dosta?[fv]ka|yetkaz/));
  const headline = lines.map((l) => l.replace(/#[^\s#]+/g, "").replace(/[^\p{L}\p{N}\s,.'ʻ’-]/gu, "").trim())
    .find((l) => l.length > 3 && !l.includes(":")) || "";
  const data = {
    imported: true, raw: t,
    phone: phone || null, extra: field(/qoshimcha|malumot|izoh/).slice(0, 400),
    price_text: kind === "hadya" ? "" : field(/narx/).slice(0, 40),
    headline: headline.slice(0, 40),
  };
  if (kind === "reklama") {
    data.title = (field(/\bnomi/) || headline).slice(0, 60);
    data.about = field(/tavsif/).slice(0, 300);
  } else {
    Object.assign(data, {
      breed: field(/\bzot/).slice(0, 40), age: field(/\byosh/).slice(0, 30),
      gender: /urg|qiz|ayol|самка/.test(gRaw) ? "f" : /erkak|ogil|самец/.test(gRaw) ? "m" : "u",
      health: [], health_note: field(/soglig|salomat/).slice(0, 80),
      delivery: !dRaw ? null : /yoq|нет/.test(dRaw) ? "yoq" : /bor|bepul|\bha\b|есть/.test(dRaw) ? "bor" : "kelish",
    });
  }
  const status = /berildi|berilgan|egasini topdi|uyini topdi|olib ketildi|olib ketishdi/.test(low) ? S.GIVEN
    : /sotildi|sotilgan/.test(low) ? S.SOLD : S.PUBLISHED;
  return { kind, ...place, data, username, status };
}

// Yopilganda import qilingan postning asl matnidan faqat kontakt qatorlari olib tashlanadi
function closedRaw(l, status) {
  const label = { given: "✅ Berildi", sold: "✅ Sotildi", closed: "⛔️ E'lon dolzarb emas" }[status];
  const own = l.username ? "@" + l.username.toLowerCase() : null;
  const isContact = (ln) => {
    const n = normTxt(ln);
    if (/telegram|telefon|📞|☎|\btel\b/.test(n)) return true;
    if (own && n.includes(own)) return true;
    return ln.replace(/\D/g, "").length >= 9 && !/narx|som|sum|\$/.test(n);
  };
  const out = [];
  let placed = false;
  for (const ln of String(l.data.raw).split("\n")) {
    if (isContact(ln)) {
      if (!placed) out.push(label);
      placed = true;
    } else out.push(ln);
  }
  if (!placed) out.push("", label);
  return out.join("\n").slice(0, 1024);
}

function mediaOf(m) {
  if (m.photo) return [{ type: "photo", file_id: m.photo.at(-1).file_id, thumb: m.photo[Math.min(1, m.photo.length - 1)].file_id }];
  if (m.video) return [{ type: "video", file_id: m.video.file_id, thumb: m.video.thumbnail?.file_id || null }];
  return [];
}

// Albomning qolgan rasmlari (izohsiz keladi) — avval qo'shilgan e'longa biriktiriladi
async function attachAlbumItem(env, m) {
  const id = await getSetting(env, `mg:${m.media_group_id}`);
  if (!id) return null;
  const l = await getListing(env, Number(id));
  const add = mediaOf(m).filter((x) => !l.media.some((y) => y.file_id === x.file_id));
  if (add.length && l.media.length < MAX_MEDIA) {
    await updateListing(env, l.id, { media: JSON.stringify([...l.media, ...add].slice(0, MAX_MEDIA)) });
  }
  return l;
}

// "Berilganlar rejimi"da e'lon turi bo'yicha yakuniy holat
const DONE_STATUS = { hadya: S.GIVEN, sotuv: S.SOLD, reklama: S.CLOSED };

async function importPost(env, m, chMsgId, chUsername, date, doneMode = false) {
  const dupId = await env.DB.prepare("SELECT id FROM listings WHERE channel_msg_id=?").bind(chMsgId).first("id");
  if (dupId) {
    let dup = await getListing(env, dupId);
    // Rejimda forward qilingan, ilovada hali faol turgan post — faqat statistikada yopiladi (kanal posti tegilmaydi)
    if (doneMode && dup.status === S.PUBLISHED &&
        (await changeStatus(env, dup.id, S.PUBLISHED, DONE_STATUS[dup.kind], { closed_at: now() }))) {
      dup = await getListing(env, dup.id);
      return { marked: dup };
    }
    return { dup };
  }
  const text = m.caption || m.text || "";
  const skip = [await botUsername(env), String(env.CHANNEL || "").replace(/^@/, "")];
  const p = parsePost(text, skip);
  if (!p) return { error: "Turi aniqlanmadi: postda #hadyaga, #sotiladi yoki #reklama bo'lishi kerak." };
  if (doneMode && p.status === S.PUBLISHED) p.status = DONE_STATUS[p.kind];
  const closed = p.status !== S.PUBLISHED;
  const ins = await env.DB.prepare(
    "INSERT INTO listings (user_id, username, kind, region, district, data, media, status, channel_msg_id, channel_username, " +
    "created_at, published_at, closed_at) VALUES (0,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(p.username || null, p.kind, p.region, p.district, JSON.stringify(p.data), JSON.stringify(mediaOf(m)), p.status,
    chMsgId, chUsername || null, now(), date, closed ? date : null).run();
  const id = ins.meta.last_row_id;
  if (m.media_group_id) await setSetting(env, `mg:${m.media_group_id}`, id);
  return { created: await getListing(env, id) };
}

const adminManageKb = (l) => {
  if (l.status !== S.PUBLISHED) return undefined;
  const row = [];
  if (l.kind === "hadya") row.push({ text: "✅ Berildi", callback_data: `a:given:${l.id}` });
  if (l.kind === "sotuv") row.push({ text: "✅ Sotildi", callback_data: `a:sold:${l.id}` });
  row.push({ text: "⛔️ Dolzarb emas", callback_data: `a:closed:${l.id}` });
  return { inline_keyboard: [row, [{ text: "🗑 Ilovadan olib tashlash", callback_data: `a:hide:${l.id}` }]] };
};

async function onForwardFromChannel(env, m) {
  const o = m.forward_origin;
  const ch = String(env.CHANNEL || "").replace(/^@/, "").toLowerCase();
  const fromOurs = o.chat && ((o.chat.username || "").toLowerCase() === ch || String(o.chat.id) === String(env.CHANNEL));
  if (!fromOurs) {
    return tg(env, "sendMessage", { chat_id: m.chat.id, text: `Faqat ${env.CHANNEL} kanalidagi postlarni ilovaga qo'shish mumkin.` });
  }
  if (m.media_group_id && !m.caption) {
    await attachAlbumItem(env, m);
    return;
  }
  const doneMode = await getDoneMode(env, m.from.id);
  const r = await importPost(env, m, o.message_id, o.chat.username, o.date, doneMode);
  if (r.error) return tg(env, "sendMessage", { chat_id: m.chat.id, text: `⚠️ ${r.error}` });
  const l = r.created || r.dup || r.marked;
  const head = r.marked ? `📊 #${l.id} statistikaga «${STATUS_TEXT[l.status]}» deb yozildi`
    : r.dup ? `ℹ️ Bu post allaqachon ilovada: #${l.id}`
    : l.status === S.PUBLISHED ? `✅ #${l.id} ilovaga qo'shildi`
    : `📊 #${l.id} statistikaga «${STATUS_TEXT[l.status]}» deb qo'shildi`;
  let text = `${head}\n${KIND_NAMES[l.kind]} — ${placeText(l)}`;
  if (!r.marked && (r.dup || l.status === S.PUBLISHED)) text += `\nHolati: ${STATUS_TEXT[l.status]}`;
  if (r.created && !l.region) text += "\n\n⚠️ Hudud aniqlanmadi: qidiruvda faqat «Barcha hududlar» bo'limida ko'rinadi.";
  return tgSafe(env, "sendMessage", { chat_id: m.chat.id, text, reply_markup: adminManageKb(l) });
}

// Rejim 3 soat amal qiladi, keyin o'zi o'chadi (unutib qoldirilsa ham xavfsiz)
async function getDoneMode(env, adminId) {
  const until = Number(await getSetting(env, `done:${adminId}`, 0));
  return until > now();
}

async function onChannelPost(env, m) {
  const ch = String(env.CHANNEL || "").replace(/^@/, "").toLowerCase();
  if ((m.chat.username || "").toLowerCase() !== ch && String(m.chat.id) !== String(env.CHANNEL)) return;
  if (m.media_group_id && !m.caption) return attachAlbumItem(env, m);
  if (!m.photo && !m.video) return;
  await importPost(env, m, m.message_id, m.chat.username, m.date);
}

// ---------------------------------------------------------------- bot: xabarlar
async function onMessage(env, origin, m) {
  if (m.chat.type !== "private" || !m.from) return;
  const u = m.from;
  await upsertUser(env, u);
  const text = m.text || "";
  const reply = (t, extra = {}) => tg(env, "sendMessage", { chat_id: m.chat.id, text: t, ...extra });

  if (m.forward_origin?.type === "channel" && isAdmin(env, u.id)) return onForwardFromChannel(env, m);

  if (text.startsWith("/")) {
    const [rawCmd, ...rest] = text.trim().split(/\s+/);
    const cmd = rawCmd.split("@")[0].toLowerCase();
    const args = rest.join(" ");
    if (cmd === "/start") {
      let t = "Assalomu alaykum! 🐾\n\nBu yerda mushukni hadyaga berish (bepul), sotish yoki reklama joylash uchun " +
        "e'lon berasiz va hududingizdagi mushuklarni qidirasiz.\n\nPastdagi tugmani bosing 👇";
      return reply(t, { reply_markup: appKb(origin) });
    }
    if (isAdmin(env, u.id)) {
      if (cmd === "/admin") {
        return reply(await adminSummary(env), {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "📊 Admin panelni ochish", web_app: { url: origin + "/#admin" } }]] },
        });
      }
      if (cmd === "/berilgan") {
        await setSetting(env, `done:${u.id}`, now() + 3 * 3600);
        return reply("📊 Berilganlar rejimi yoqildi.\n\nEndi forward qilgan har bir post statistikaga yoziladi:\n" +
          "• hadya → Berildi\n• sotuv → Sotildi\n• reklama → Dolzarb emas\n\n" +
          "Kanaldagi postlar o'zgartirilmaydi. Tugatgach /oddiy deb yozing (3 soatdan keyin o'zi o'chadi).");
      }
      if (cmd === "/oddiy") {
        await setSetting(env, `done:${u.id}`, null);
        return reply("✅ Oddiy rejim: endi forward qilingan postlar faol e'lon sifatida qo'shiladi.\n" +
          "(Matnida «Berildi» yoki «Sotildi» bor postlar baribir yopilgan deb yoziladi.)");
      }
      if (cmd === "/narx") {
        const n = args.replace(/\D/g, "");
        if (!n || +n < 500) return reply("Masalan: /narx 7000");
        await setSetting(env, "price", +n);
        return reply(`✅ Yangi narx: ${fmtSum(n)}`);
      }
      if (cmd === "/karta") {
        const mm = args.match(/^\s*([\d ]{16,23})\s*(.*)$/);
        const digits = mm ? mm[1].replace(/\D/g, "") : "";
        if (digits.length !== 16) return reply("Masalan: /karta 8600 1234 1234 1234 Ism Familiya");
        const card = digits.match(/.{4}/g).join(" ");
        await setSetting(env, "card", card);
        await setSetting(env, "card_owner", mm[2].trim());
        return reply(`✅ Karta saqlandi: ${card} ${mm[2].trim()}`);
      }
    }
    return reply("E'lon berish va qidirish uchun ilovani oching 👇", { reply_markup: appKb(origin) });
  }

  if (m.photo || m.document) return onReceipt(env, origin, m);
  return reply("E'lon berish va qidirish uchun ilovani oching 👇", { reply_markup: appKb(origin) });
}

async function adminSummary(env) {
  const st = await stats(env);
  return "<b>Admin buyruqlari</b>\n" +
    "/narx 7000 — pullik e'lon narxini o'zgartirish\n" +
    "/karta 8600123412341234 Ism Familiya — to'lov kartasi\n" +
    "Kanaldagi eski postni ilovaga qo'shish yoki boshqarish — postni shu botga forward qiling\n" +
    "/berilgan — berilgan/sotilgan eski postlarni statistikaga kiritish rejimi\n" +
    "/oddiy — rejimni o'chirish\n\n" +
    `Hozirgi narx: ${fmtSum(await getPrice(env))}\n` +
    `Karta: ${esc(await getSetting(env, "card", "kiritilmagan"))} ${esc(await getSetting(env, "card_owner", ""))}\n\n` +
    `Foydalanuvchilar: ${st.users}\nBerildi: ${st.given} | Sotildi: ${st.sold}\n` +
    `Faol: hadya ${st.active_hadya}, sotuv ${st.active_sotuv}`;
}

async function onReceipt(env, origin, m) {
  const uid = m.from.id;
  const fileId = m.photo ? m.photo.at(-1).file_id : m.document.file_id;
  const isDoc = !m.photo;
  const { results } = await env.DB.prepare("SELECT * FROM listings WHERE user_id=? AND status=? ORDER BY id")
    .bind(uid, S.AWAIT_PAY).all();
  const waiting = results.map(parseRow);
  if (!waiting.length) {
    return tg(env, "sendMessage", {
      chat_id: uid, text: "Hozir to'lov kutilayotgan e'loningiz yo'q. E'lon berish uchun ilovani oching 👇",
      reply_markup: appKb(origin),
    });
  }
  if (waiting.length === 1) return attachReceipt(env, uid, waiting[0], fileId, isDoc);
  await setSetting(env, `rcpt:${uid}`, JSON.stringify({ fileId, isDoc }));
  return tg(env, "sendMessage", {
    chat_id: uid, text: "Bu chek qaysi e'lon uchun?",
    reply_markup: {
      inline_keyboard: waiting.map((l) => [{ text: `#${l.id} ${KIND_NAMES[l.kind]} — ${l.district}`, callback_data: `rc:${l.id}` }]),
    },
  });
}

async function attachReceipt(env, chatId, l, fileId, isDoc) {
  if (!(await changeStatus(env, l.id, S.AWAIT_PAY, S.PAY_REVIEW, { receipt_file_id: fileId }))) {
    return tg(env, "sendMessage", { chat_id: chatId, text: "Bu e'lon uchun chek allaqachon yuborilgan." });
  }
  const who = l.username ? `@${esc(l.username)}` : esc(l.first_name || "Foydalanuvchi");
  const cap = `💳 Chek: e'lon #${l.id} (${KIND_NAMES[l.kind]})\nSumma: ${fmtSum(l.price_due || 0)}\n` +
    `Kimdan: ${who} (<code>${l.user_id}</code>)`;
  const refs = [];
  for (const admin of adminIds(env)) {
    const r = await tgSafe(env, isDoc ? "sendDocument" : "sendPhoto", {
      chat_id: admin, [isDoc ? "document" : "photo"]: fileId, caption: cap, parse_mode: "HTML", reply_markup: payKb(l.id),
    });
    if (r) refs.push([admin, r.message_id]);
  }
  await updateListing(env, l.id, { pay_msgs: JSON.stringify(refs) });
  if (!refs.length) {
    await changeStatus(env, l.id, S.PAY_REVIEW, S.AWAIT_PAY, { receipt_file_id: null });
    return tg(env, "sendMessage", { chat_id: chatId, text: "Chekni adminga yetkazib bo'lmadi. Birozdan keyin qayta yuboring." });
  }
  return tg(env, "sendMessage", { chat_id: chatId, text: "🧾 Chek qabul qilindi. Admin tekshirgach, e'loningiz kanalga joylanadi." });
}

// ---------------------------------------------------------------- bot: tugmalar
async function onCallback(env, cq) {
  const answer = (text = "", alert = false) =>
    tgSafe(env, "answerCallbackQuery", { callback_query_id: cq.id, text, show_alert: alert });
  const msg = cq.message;
  const chat = msg?.chat.id;
  const mid = msg?.message_id;
  const [ns, a, idStr, extra] = String(cq.data || "").split(":");
  const who = [cq.from.first_name, cq.from.last_name].filter(Boolean).join(" ");

  const edit = (c, m, text, isCaption) =>
    isCaption
      ? tgSafe(env, "editMessageCaption", { chat_id: c, message_id: m, caption: text })
      : tgSafe(env, "editMessageText", { chat_id: c, message_id: m, text });
  // field berilsa, boshqa adminlarga yuborilgan xuddi shu xabar ham yangilanadi (tugmalar yo'qoladi)
  const done = async (text, field = null, lst = null) => {
    await edit(chat, mid, text, !!(msg.photo || msg.document));
    if (!field || !lst) return;
    let refs = [];
    try {
      refs = JSON.parse(lst[field] || "[]");
    } catch {}
    for (const [c, m] of refs) {
      if (String(c) === String(chat) && m === mid) continue;
      await edit(c, m, text, field === "pay_msgs");
    }
  };
  const setKb = (kb) => tgSafe(env, "editMessageReplyMarkup", { chat_id: chat, message_id: mid, reply_markup: kb || { inline_keyboard: [] } });

  // Foydalanuvchi: chek qaysi e'lon uchun
  if (ns === "rc") {
    const l = await getListing(env, Number(a));
    const saved = await getSetting(env, `rcpt:${cq.from.id}`);
    if (!saved || !l || l.user_id !== cq.from.id || l.status !== S.AWAIT_PAY) return answer("Chekni qaytadan yuboring.", true);
    const { fileId, isDoc } = JSON.parse(saved);
    await setSetting(env, `rcpt:${cq.from.id}`, null);
    await tgSafe(env, "deleteMessage", { chat_id: chat, message_id: mid });
    await answer();
    return attachReceipt(env, chat, l, fileId, isDoc);
  }

  if (!isAdmin(env, cq.from.id)) return answer("Bu tugma faqat adminlar uchun.", true);
  const id = Number(idStr);
  const l = await getListing(env, id);
  if (!l) return answer("E'lon topilmadi.", true);

  // Admin: kanaldagi e'lonni boshqarish (forward qilingan postlar uchun)
  if (ns === "a") {
    if (a === "hide") {
      if (!(await changeStatus(env, id, [S.PUBLISHED, S.GIVEN, S.SOLD, S.CLOSED], "hidden"))) return answer("Holati allaqachon o'zgargan.", true);
      await done(`🗑 #${id} ilovadan olib tashlandi (kanaldagi post o'zgarmadi) — ${who}`);
      return answer("Olib tashlandi");
    }
    if (!["given", "sold", "closed"].includes(a)) return answer();
    if (!(await closeListing(env, l, a))) return answer("Bu e'lon kanalda faol emas.", true);
    await done(`${CLOSED_REPLY[a]}: #${id} belgilandi, kanaldagi post yangilandi — ${who}`);
    return answer("Belgilandi");
  }

  // Admin: e'lonni tekshirish
  if (ns === "m") {
    if (l.status !== S.PENDING) {
      await setKb(null);
      return answer("Bu e'lon allaqachon ko'rib chiqilgan.", true);
    }
    if (a === "no") {
      await setKb(reasonsKb(id));
      return answer("Sababni tanlang");
    }
    if (a === "back") {
      await setKb(modKb(l));
      return answer();
    }
    if (a === "r") {
      const reason = REJECT_REASONS[extra] || REJECT_REASONS.rules;
      if (!(await changeStatus(env, id, S.PENDING, S.REJECTED, { reject_reason: reason }))) return answer("Boshqa admin ulgurdi.", true);
      await done(`❌ #${id} rad etildi: ${reason} — ${who}`, "admin_msgs", l);
      await tgSafe(env, "sendMessage", {
        chat_id: l.user_id,
        text: `😔 E'loningiz (#${id}) qabul qilinmadi.\nSabab: ${reason}\n\nTo'g'irlab, ilova orqali qayta yuborishingiz mumkin.`,
      });
      return answer("Rad etildi");
    }
    if (a === "ok") {
      if (l.kind === "hadya") {
        if (!(await changeStatus(env, id, S.PENDING, S.PUBLISHING))) return answer("Boshqa admin ulgurdi.", true);
        try {
          const link = await publish(env, id);
          await done(`✅ #${id} kanalga joylandi — ${who}\n${link}`, "admin_msgs", l);
          return answer("Joylandi");
        } catch (e) {
          await updateListing(env, id, { status: S.PENDING });
          return answer(`Kanalga joylanmadi: ${e.message}`.slice(0, 190), true);
        }
      }
      if (!(await getSetting(env, "card"))) return answer("Avval karta raqamini kiriting: /karta", true);
      if (!(await changeStatus(env, id, S.PENDING, S.AWAIT_PAY))) return answer("Boshqa admin ulgurdi.", true);
      await askPayment(env, l);
      await done(`✅ #${id} ma'qullandi, to'lov kutilmoqda — ${who}`, "admin_msgs", l);
      return answer("Foydalanuvchiga to'lov ma'lumoti yuborildi");
    }
  }

  // Admin: to'lov chekini tekshirish
  if (ns === "p") {
    if (l.status !== S.PAY_REVIEW) {
      await setKb(null);
      return answer("Bu chek allaqachon ko'rib chiqilgan.", true);
    }
    if (a === "no") {
      if (!(await changeStatus(env, id, S.PAY_REVIEW, S.AWAIT_PAY, { receipt_file_id: null }))) return answer("Boshqa admin ulgurdi.", true);
      await done(`❌ #${id} cheki rad etildi — ${who}`, "pay_msgs", l);
      await tgSafe(env, "sendMessage", {
        chat_id: l.user_id,
        text: `⚠️ E'lon #${id} uchun yuborilgan chek tasdiqlanmadi. Pul tushganini tekshirib, to'g'ri chekni qayta yuboring.`,
      });
      return answer();
    }
    if (a === "ok") {
      if (!(await changeStatus(env, id, S.PAY_REVIEW, S.PUBLISHING))) return answer("Boshqa admin ulgurdi.", true);
      try {
        const link = await publish(env, id);
        await done(`✅ #${id}: to'lov tasdiqlandi va kanalga joylandi — ${who}\n${link}`, "pay_msgs", l);
        return answer("Joylandi");
      } catch (e) {
        await updateListing(env, id, { status: S.PAY_REVIEW });
        return answer(`Kanalga joylanmadi: ${e.message}`.slice(0, 190), true);
      }
    }
  }
  return answer();
}

// ---------------------------------------------------------------- Mini App API
function card(l) {
  return {
    id: l.id, kind: l.kind, title: shortTitle(l), region: l.region, district: l.district,
    price: priceText(l), thumb: l.media.length ? `api/media/${l.id}/0?thumb=1` : null,
    status: l.status, status_text: STATUS_TEXT[l.status] || l.status, reject_reason: l.reject_reason || null,
    published_at: l.published_at || null,
  };
}

async function stats(env) {
  const t = new Date(Date.now() + 5 * 3600e3); // Toshkent vaqti
  const monthStart = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) / 1000 - 5 * 3600;
  const one = (q, ...b) => env.DB.prepare(q).bind(...b).first("n");
  const [given, givenMonth, sold, activeHadya, activeSotuv, users, top] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM listings WHERE status=?", S.GIVEN),
    one("SELECT COUNT(*) AS n FROM listings WHERE status=? AND closed_at>=?", S.GIVEN, monthStart),
    one("SELECT COUNT(*) AS n FROM listings WHERE status=?", S.SOLD),
    one("SELECT COUNT(*) AS n FROM listings WHERE status=? AND kind='hadya'", S.PUBLISHED),
    one("SELECT COUNT(*) AS n FROM listings WHERE status=? AND kind='sotuv'", S.PUBLISHED),
    env.DB.prepare("SELECT COUNT(*) AS n FROM users").first("n"),
    env.DB.prepare("SELECT region, COUNT(*) AS n FROM listings WHERE status=? AND region<>'' GROUP BY region ORDER BY n DESC LIMIT 5").bind(S.GIVEN).all(),
  ]);
  return { given, given_month: givenMonth, sold, active_hadya: activeHadya, active_sotuv: activeSotuv, users, top_regions: top.results };
}

async function apiListings(env, url) {
  const q = url.searchParams;
  let sql = "SELECT * FROM listings WHERE status=?";
  const args = [S.PUBLISHED];
  for (const col of ["kind", "region", "district"]) {
    const v = q.get(col);
    if (v) {
      sql += ` AND ${col}=?`;
      args.push(v);
    }
  }
  const offset = Math.max(0, parseInt(q.get("offset") || "0", 10) || 0);
  sql += " ORDER BY published_at DESC LIMIT 20 OFFSET ?";
  const { results } = await env.DB.prepare(sql).bind(...args, offset).all();
  return json({ items: results.map((r) => card(parseRow(r))), more: results.length === 20 });
}

async function apiDetail(env, id) {
  const l = await getListing(env, id);
  if (!l || ![S.PUBLISHED, S.GIVEN, S.SOLD, S.CLOSED].includes(l.status)) return err("E'lon topilmadi", 404);  const d = l.data;
  const open = l.status === S.PUBLISHED;
  let rows, text = null;
  if (d.imported) {
    // Kanaldan import qilingan: asl post matni ko'rsatiladi (yopilgan bo'lsa — kontaktlarsiz)
    rows = [["Narxi", priceText(l)], ["Manzil", placeText(l)]];
    const body = open ? d.raw : closedRaw(l, l.status === S.SOLD ? "sold" : l.status === S.CLOSED ? "closed" : "given");
    text = body.split("\n").filter((ln) => !/e.?lon berish uchun|^kanal\s*:/i.test(ln.trim())).join("\n").trim();
  } else {
    rows = l.kind === "reklama"
      ? [["Nomi", d.title], ["Tavsif", d.about], ["Narxi", priceText(l)]]
      : [["Zoti", d.breed || "Noma'lum"], ["Yoshi", d.age], ["Jinsi", GENDER[d.gender] || "Noma'lum"],
         ["Sog'lig'i", healthText(d) || "Noma'lum"], ["Dostafka", DELIVERY[d.delivery] || "Noma'lum"], ["Narxi", priceText(l)]];
    rows.push(["Manzil", placeText(l)]);
    if (d.extra) rows.push(["Qo'shimcha", d.extra]);
  }
  const hasContact = open && (l.username || d.phone);
  return json({
    ...card(l), rows, text,
    post: l.channel_username ? `https://t.me/${l.channel_username}/${l.channel_msg_id}` : null,
    media: l.media.map((m, i) => ({ type: m.type, url: `api/media/${l.id}/${i}` })),
    contact: hasContact ? { username: l.username, phone: d.phone ? fmtPhone(d.phone) : null } : null,
  });
}

// Telegram'dagi rasm/videoni ilovaga uzatadi (token foydalanuvchiga ko'rinmaydi)
async function apiMedia(env, request, id, idx, thumb) {
  const l = await getListing(env, id);
  if (!l || idx >= l.media.length || l.status === S.REJECTED) return new Response("Topilmadi", { status: 404 });
  const m = l.media[idx];
  const isVideo = m.type === "video" && !thumb;
  const fileId = thumb ? m.thumb || m.file_id : m.file_id;
  let f;
  try {
    f = await tg(env, "getFile", { file_id: fileId });
  } catch {
    return new Response("Fayl katta yoki topilmadi", { status: 404 });
  }
  const headers = {};
  const range = request.headers.get("range");
  if (isVideo && range) headers.range = range;
  const base = env.TG_API || "https://api.telegram.org";
  const up = await fetch(`${base}/file/bot${env.BOT_TOKEN}/${f.file_path}`, { headers });
  if (!up.ok) return new Response("Topilmadi", { status: 404 });
  const h = new Headers({
    "content-type": isVideo ? "video/mp4" : "image/jpeg",
    "cache-control": "public, max-age=604800",
  });
  for (const k of ["content-length", "content-range", "accept-ranges"]) if (up.headers.get(k)) h.set(k, up.headers.get(k));
  return new Response(up.body, { status: up.status, headers: h });
}

async function apiMy(env, request) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Ilovani bot orqali oching.", 401);
  const { results } = await env.DB.prepare("SELECT * FROM listings WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(user.id).all();
  return json({ items: results.map((r) => card(parseRow(r))) });
}

async function apiClose(env, request, id) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Ilovani bot orqali oching.", 401);
  const l = await getListing(env, id);
  const { status } = await request.json().catch(() => ({}));
  if (!l || l.user_id !== user.id) return err("E'lon topilmadi.", 404);
  const allowed = { hadya: ["given", "closed"], sotuv: ["sold", "closed"], reklama: ["closed"] }[l.kind];
  if (!allowed.includes(status) || l.status !== S.PUBLISHED) return err("Bu amalni bajarib bo'lmaydi.");
  if (!(await closeListing(env, l, status))) return err("E'lon holati allaqachon o'zgargan.");
  return json({ ok: true });
}

async function apiSubmit(env, request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return err("Ma'lumotlar yetib kelmadi. Qayta yuboring.");
  }
  const user = await authUser(env, String(form.get("initData") || ""));
  if (!user) return err("Ilovani bot ichidagi tugma orqali oching.", 401);
  await upsertUser(env, user);
  const banned = await env.DB.prepare("SELECT banned FROM users WHERE id=?").bind(user.id).first("banned");
  if (banned) return err("Sizga e'lon berish cheklangan.", 403);

  const res = cleanForm(form);
  if (typeof res === "string") return err(res);
  const { kind, region, district, data } = res;

  const since = now() - 86400;
  if (kind === "hadya") {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE user_id=? AND kind='hadya' AND created_at>?")
      .bind(user.id, since).first("n");
    if (n >= FREE_PER_DAY) return err(`Kuniga ${FREE_PER_DAY} tadan ortiq bepul e'lon berib bo'lmaydi. Ertaga urinib ko'ring.`, 429);
  }
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE user_id=? AND status IN (?,?,?)")
    .bind(user.id, S.PENDING, S.AWAIT_PAY, S.PAY_REVIEW).first("n");
  if (open >= MAX_OPEN) return err("Sizda ko'rib chiqilmagan e'lonlar ko'p. Avval ular yakunlanishini kuting.", 429);

  const files = [];
  for (const [i, f] of form.getAll("media").slice(0, MAX_MEDIA).entries()) {
    if (typeof f === "string") continue;
    const isVideo = (f.type || "").startsWith("video/");
    const limit = (isVideo ? MAX_VIDEO_MB : MAX_PHOTO_MB) * MB;
    if (!f.size || f.size > limit) return err(`Fayl hajmi katta. Video ${MAX_VIDEO_MB} MB, rasm ${MAX_PHOTO_MB} MB gacha bo'lsin.`);
    files.push({ type: isVideo ? "video" : "photo", file: f, name: `m${i}.${isVideo ? "mp4" : "jpg"}` });
  }
  if (!files.length) return err("Kamida bitta rasm yoki video qo'shing.");

  const ins = await env.DB.prepare(
    "INSERT INTO listings (user_id, username, first_name, kind, region, district, data, created_at) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(user.id, user.username || null, user.first_name || null, kind, region, district, JSON.stringify(data), now()).run();
  const id = ins.meta.last_row_id;

  try {
    await sendToAdmins(env, await getListing(env, id), files);
  } catch (e) {
    console.log("Adminlarga yuborilmadi:", e.message);
    await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(id).run();
    if (e.message === "BAD_VIDEO") return err("Video formati mos kelmadi. MP4 video yoki rasm yuboring.");
    return err("Server xatosi. Birozdan keyin qayta urinib ko'ring.", 500);
  }
  const note = kind === "hadya" ? "" : ` Ma'qullansa, ${fmtSum(await getPrice(env))} to'lov qilasiz.`;
  await tgSafe(env, "sendMessage", { chat_id: user.id, text: `📨 ${KIND_NAMES[kind]} e'loningiz (#${id}) adminga yuborildi.${note}` });
  return json({ ok: true, id });
}

// ---------------------------------------------------------------- Admin bo'limi (faqat adminlarga)
const ADMIN_COMMANDS = [
  { command: "start", description: "Botni ishga tushirish" },
  { command: "admin", description: "Admin panel" },
  { command: "narx", description: "Pullik e'lon narxini o'zgartirish" },
  { command: "karta", description: "To'lov kartasini o'zgartirish" },
  { command: "berilgan", description: "Berilgan eski postlarni statistikaga kiritish" },
  { command: "oddiy", description: "Oddiy rejimga qaytish" },
];

async function apiMe(env, request) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return json({ is_admin: false, ai_left: AI_PER_DAY, ai_limit: AI_PER_DAY, ai_on: !!env.OPENAI_API_KEY });
  const admin = isAdmin(env, user.id);
  const used = (await env.DB.prepare("SELECT n FROM ai_usage WHERE user_id=? AND day=?").bind(user.id, tashkentDay()).first("n")) || 0;
  return json({ is_admin: admin, ai_left: admin ? 99 : Math.max(0, AI_PER_DAY - used), ai_limit: AI_PER_DAY, ai_on: !!env.OPENAI_API_KEY });
}

async function requireAdmin(env, request) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  return user && isAdmin(env, user.id) ? user : null;
}

async function apiAdminOverview(env, request) {
  if (!(await requireAdmin(env, request))) return err("Bu bo'lim faqat adminlar uchun.", 403);
  const { results: counts } = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM listings GROUP BY status").all();
  const byStatus = Object.fromEntries(counts.map((r) => [r.status, r.n]));
  const today = await env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE created_at>? AND user_id<>0").bind(now() - 86400).first("n");
  const { results: queue } = await env.DB.prepare(
    "SELECT * FROM listings WHERE status IN (?,?,?) ORDER BY created_at LIMIT 30"
  ).bind(S.PENDING, S.PAY_REVIEW, S.AWAIT_PAY).all();
  const st = await stats(env);
  return json({
    counts: byStatus, today, users: st.users,
    settings: {
      price: await getPrice(env), card: await getSetting(env, "card", ""), card_owner: await getSetting(env, "card_owner", ""),
    },
    queue: queue.map((r) => {
      const l = parseRow(r);
      return { ...card(l), user: l.username ? "@" + l.username : l.first_name || "", hours: Math.floor((now() - l.created_at) / 3600) };
    }),
    ai_on: !!env.OPENAI_API_KEY,
  });
}

async function apiAdminSettings(env, request) {
  if (!(await requireAdmin(env, request))) return err("Bu bo'lim faqat adminlar uchun.", 403);
  const b = await request.json().catch(() => ({}));
  const price = String(b.price ?? "").replace(/\D/g, "");
  const digits = String(b.card ?? "").replace(/\D/g, "");
  if (!price || +price < 500) return err("Narx kamida 500 so'm bo'lsin.");
  if (digits && digits.length !== 16) return err("Karta raqami 16 ta raqamdan iborat bo'lsin.");
  await setSetting(env, "price", +price);
  if (digits) await setSetting(env, "card", digits.match(/.{4}/g).join(" "));
  await setSetting(env, "card_owner", String(b.card_owner ?? "").trim().slice(0, 60));
  return json({ ok: true, price_text: fmtSum(price) });
}

// ---------------------------------------------------------------- AI yordamchi (OpenAI)
const AI_PER_DAY = 5;
function tashkentDay() {
  return new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
}

async function apiAsk(env, request) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Ilovani bot orqali oching.", 401);
  if (!env.OPENAI_API_KEY) return err("AI bo'limi hali ulanmagan. Keyinroq urinib ko'ring.", 503);
  const b = await request.json().catch(() => ({}));
  const question = String(b.question || "").trim().slice(0, 500);
  if (question.length < 3) return err("Savolni yozing.");
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));

  const admin = isAdmin(env, user.id);
  const day = tashkentDay();
  if (!admin) {
    // Atomik hisoblagich: limitga yetgan bo'lsa yozuv o'zgarmaydi
    const r = await env.DB.prepare(
      "INSERT INTO ai_usage (user_id, day, n) VALUES (?,?,1) ON CONFLICT(user_id, day) DO UPDATE SET n=n+1 WHERE n<?"
    ).bind(user.id, day, AI_PER_DAY).run();
    if (r.meta.changes !== 1) return err(`Bugungi ${AI_PER_DAY} ta savol limiti tugadi. Ertaga yana so'rashingiz mumkin.`, 429);
  }
  const refund = () => !admin && env.DB.prepare("UPDATE ai_usage SET n=n-1 WHERE user_id=? AND day=? AND n>0").bind(user.id, day).run();

  const contact = env.ADMIN_CONTACT || "admin";
  const system =
    "Sen «Hadyaga mushuklar» Telegram kanali va botining yordamchisisan. Faqat o'zbek tilida, lotin yozuvida javob ber. " +
    "Mavzular: mushuklarni parvarish qilish, ovqatlantirish, sog'lig'i, emlash, xulqi, lotokka o'rgatish, mushuk asrab olish " +
    "va hadyaga berish, shuningdek shu bot va kanaldan foydalanish. Javob qisqa va amaliy bo'lsin (ko'pi bilan 10 qator), " +
    "markdown belgilarisiz (yulduzcha, # ishlatma) oddiy matn yoz, kerak bo'lsa ro'yxat uchun «•» belgisidan foydalan. " +
    "Kasallik belgilari, jarohat, zaharlanish, ovqat yemay qo'yish kabi jiddiy holatlarda albatta veterinarga murojaat qilishni ayt; " +
    "dori va uning dozasini o'zing belgilama. Mavzudan tashqari savollarga muloyimlik bilan mushuklar mavzusiga qaytar. " +
    `Foydalanuvchi admin bilan bog'lanmoqchi bo'lsa yoki reklama, to'lov, e'lon bilan bog'liq muammo haqida so'rasa, ${contact} ga yozishni ayt. ` +
    `Bot haqida: hadyaga e'lon bepul; sotuv va reklama e'loni ${fmtSum(await getPrice(env))}, admin ma'qullagach kartaga o'tkazilib, ` +
    "chek rasmi botga yuboriladi. E'lon ilovaning «E'lon berish» bo'limidan beriladi, admin tekshirgach kanalga chiqadi. " +
    "Mushuk berilgach «Mening» bo'limida «Berildi» bosiladi. Hududdagi mushuklar «Qidirish» bo'limida topiladi.";

  const model = env.OPENAI_MODEL || "gpt-4o-mini";
  const body = { model, messages: [{ role: "system", content: system }, ...history, { role: "user", content: question }] };
  if (/^(gpt-5|o\d)/.test(model)) Object.assign(body, { max_completion_tokens: 2000, reasoning_effort: "low" });
  else Object.assign(body, { max_tokens: 700, temperature: 0.5 });

  let answer = "";
  try {
    const r = await fetch(`${env.OPENAI_BASE || "https://api.openai.com"}/v1/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${j.error?.message || ""}`);
    answer = String(j.choices?.[0]?.message?.content || "").trim();
    if (!answer) throw new Error("bo'sh javob");
  } catch (e) {
    console.log("AI xatosi:", e.message);
    await refund();
    return err("AI hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring.", 502);
  }
  const used = admin ? 0 : (await env.DB.prepare("SELECT n FROM ai_usage WHERE user_id=? AND day=?").bind(user.id, day).first("n")) || 0;
  return json({ ok: true, answer, left: admin ? 99 : Math.max(0, AI_PER_DAY - used) });
}

// ---------------------------------------------------------------- /setup — bir martalik sozlash
async function setup(env, origin) {
  const out = [];
  const ok = (t) => out.push(["ok", t]);
  const bad = (t) => out.push(["bad", t]);
  const warn = (t) => out.push(["warn", t]);

  if (!env.BOT_TOKEN) bad("BOT_TOKEN topilmadi. Settings → Variables and Secrets bo'limida Secret sifatida qo'shing.");
  if (!env.DB) bad("Baza ulanmagan. Settings → Bindings bo'limida D1 bazani DB nomi bilan ulang.");
  if (!adminIds(env).length) bad("ADMIN_IDS kiritilmagan.");
  if (!env.CHANNEL) bad("CHANNEL kiritilmagan (masalan @Hadyagamushuklar).");
  if (out.length) return setupPage(out);

  try {
    schemaReady = false;
    await ensureSchema(env);
    await env.DB.prepare("SELECT admin_msgs, pay_msgs FROM listings LIMIT 1").all();
    ok("Baza jadvallari tayyor");
  } catch (e) {
    bad("Bazani tayyorlab bo'lmadi: " + e.message);
    return setupPage(out);
  }

  let me;
  try {
    me = await tg(env, "getMe");
    await setSetting(env, "bot_username", me.username);
    ok(`Token to'g'ri: @${me.username}`);
  } catch (e) {
    bad("Token noto'g'ri yoki bot o'chirilgan: " + e.message);
    return setupPage(out);
  }

  try {
    await tg(env, "setWebhook", {
      url: origin + "/tg", secret_token: await webhookSecret(env),
      allowed_updates: ["message", "callback_query", "channel_post"], drop_pending_updates: true,
    });
    ok("Bot shu serverga ulandi (webhook)");
  } catch (e) {
    bad("Webhook o'rnatilmadi: " + e.message);
  }
  try {
    await tg(env, "setChatMenuButton", { menu_button: { type: "web_app", text: "Ilova", web_app: { url: origin + "/" } } });
    await tg(env, "setMyCommands", { commands: [{ command: "start", description: "Botni ishga tushirish" }] });
    ok("Chat pastidagi «Ilova» tugmasi o'rnatildi");
  } catch (e) {
    bad("Ilova tugmasi o'rnatilmadi: " + e.message);
  }

  try {
    const cm = await tg(env, "getChatMember", { chat_id: env.CHANNEL, user_id: me.id });
    if (cm.status !== "administrator") bad(`Bot ${env.CHANNEL} kanalida admin emas. Kanal sozlamalaridan botni admin qiling.`);
    else if (cm.can_post_messages === false || cm.can_edit_messages === false)
      bad("Botga kanalda «Xabar joylash» va «Xabarlarni tahrirlash» huquqlarini bering.");
    else ok(`Kanal ${env.CHANNEL}: bot admin, huquqlar to'g'ri`);
  } catch (e) {
    bad(`Kanal ${env.CHANNEL} topilmadi yoki bot unda yo'q: ${e.message}`);
  }

  for (const id of adminIds(env)) {
    const r = await tgSafe(env, "sendMessage", { chat_id: id, text: "✅ Bot ishga tushdi. Siz admin sifatida qo'shildingiz.\nBuyruqlar: /admin" });
    if (r) {
      await tgSafe(env, "setMyCommands", { commands: ADMIN_COMMANDS, scope: { type: "chat", chat_id: id } });
      ok(`Admin ${id}: xabar yetib bordi, admin buyruqlari menyusi o'rnatildi`);
    }
    else bad(`Admin ${id}: xabar yetmadi. Bu admin botga /start bosishi kerak, keyin sahifani yangilang.`);
  }
  if (env.OPENAI_API_KEY) ok(`AI yordamchi ulangan (model: ${env.OPENAI_MODEL || "gpt-4o-mini"})`);
  else warn("AI yordamchi o'chiq: Variables and Secrets'ga OPENAI_API_KEY (Secret) qo'shing.");
  if (!(await getSetting(env, "card"))) warn("To'lov kartasi kiritilmagan. Botga yozing: /karta 8600 1234 1234 1234 Ism Familiya");
  else ok("To'lov kartasi kiritilgan");
  return setupPage(out);
}

function setupPage(rows) {
  const icon = { ok: "✅", bad: "❌", warn: "⚠️" };
  const allOk = !rows.some(([k]) => k === "bad");
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bot sozlamasi</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;color:#1f1b17;background:#f6f3ee}
li{background:#fff;border-radius:12px;padding:12px 14px;margin:8px 0;list-style:none}ul{padding:0}h1{font-size:22px}</style>
<h1>${allOk ? "🎉 Hammasi tayyor" : "Sozlashda kamchilik bor"}</h1>
<ul>${rows.map(([k, t]) => `<li>${icon[k]} ${esc(t)}</li>`).join("")}</ul>
<p>${allOk ? "Endi botga kirib /start bosing." : "❌ belgili qatorlarni tuzating va sahifani yangilang."}</p>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

// ---------------------------------------------------------------- fon vazifasi (har soatda)
async function expirePayments(env) {
  const { results } = await env.DB.prepare("SELECT id, user_id FROM listings WHERE status=? AND pay_deadline<?")
    .bind(S.AWAIT_PAY, now()).all();
  for (const l of results) {
    if (await changeStatus(env, l.id, S.AWAIT_PAY, S.EXPIRED)) {
      await tgSafe(env, "sendMessage", {
        chat_id: l.user_id,
        text: `⌛️ E'lon #${l.id} uchun to'lov muddati o'tdi, e'lon bekor qilindi. Kerak bo'lsa, qayta yuboring.`,
      });
    }
  }
}

// ---------------------------------------------------------------- yo'naltirish
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;
    const path = url.pathname;
    const method = request.method;
    await ensureSchema(env);

    if (method === "POST" && path === "/tg") {
      if (request.headers.get("x-telegram-bot-api-secret-token") !== (await webhookSecret(env))) {
        return new Response("forbidden", { status: 403 });
      }
      try {
        const u = await request.json();
        if (u.message) await onMessage(env, origin, u.message);
        else if (u.callback_query) await onCallback(env, u.callback_query);
        else if (u.channel_post) await onChannelPost(env, u.channel_post);
      } catch (e) {
        console.log("Update xatosi:", e.stack || e.message);
      }
      return new Response("ok");
    }

    try {
      if (method === "GET" && path === "/") {
        return new Response(INDEX_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
      }
      if (method === "GET" && path === "/setup") return await setup(env, origin);
      if (method === "GET" && path === "/regions.json") {
        return new Response(JSON.stringify(REGIONS), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=86400" },
        });
      }
      if (method === "GET" && path === "/api/config") {
        const price = await getPrice(env);
        return json({ price, price_text: fmtSum(price), channel: env.CHANNEL || "", free_per_day: FREE_PER_DAY,
          admin: String(env.ADMIN_CONTACT || "").replace(/^@/, "") });
      }
      if (method === "GET" && path === "/api/listings") return await apiListings(env, url);
      if (method === "GET" && path === "/api/stats") return json(await stats(env));
      if (method === "GET" && path === "/api/my") return await apiMy(env, request);
      if (method === "GET" && path === "/api/me") return await apiMe(env, request);
      if (method === "POST" && path === "/api/ask") return await apiAsk(env, request);
      if (method === "GET" && path === "/api/admin/overview") return await apiAdminOverview(env, request);
      if (method === "POST" && path === "/api/admin/settings") return await apiAdminSettings(env, request);
      if (method === "POST" && path === "/api/submit") return await apiSubmit(env, request);
      let m;
      if (method === "GET" && (m = path.match(/^\/api\/listings\/(\d+)$/))) return await apiDetail(env, +m[1]);
      if (method === "GET" && (m = path.match(/^\/api\/media\/(\d+)\/(\d+)$/)))
        return await apiMedia(env, request, +m[1], +m[2], url.searchParams.get("thumb") === "1");
      if (method === "POST" && (m = path.match(/^\/api\/my\/(\d+)\/close$/))) return await apiClose(env, request, +m[1]);
      return new Response("Topilmadi", { status: 404 });
    } catch (e) {
      console.log("Xato:", e.stack || e.message);
      if (String(e.message).includes("no such table")) return err("Bot hali sozlanmagan: /setup sahifasini oching.", 503);
      return err("Server xatosi. Birozdan keyin qayta urinib ko'ring.", 500);
    }
  },

  async scheduled(event, env, ctx) {
    await ensureSchema(env);
    ctx.waitUntil(expirePayments(env));
  },
};
