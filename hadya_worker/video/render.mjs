// Videoni kadrma-kadr yig'adi: stage.html → PNG/JPEG kadrlar → ffmpeg → MP4
// Ishlatish:
//   node render.mjs --len 30                 → out/hadya-30s.mp4
//   node render.mjs --len 15                 → out/hadya-15s.mp4
//   node render.mjs --len 30 --stills 1,5,9  → out/still-*.jpg (tez tekshirish uchun)
//   --demo 0  → «namuna e'lonlar» yozuvini olib tashlaydi (haqiqiy rasmlar qo'yilgandan keyin)
//   --music soft|pop  → musiqa uslubi (standart: soft)
//   --voice out/voice.wav  → ovozli izoh qo'shiladi (make-voice.py yaratadi), musiqa gap paytida pasayadi
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const LEN = Number(arg("len", 30));
const FPS = 30;
const DEMO = arg("demo", "1");
const stills = arg("stills", "");
const out = path.join(dir, "out");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on("console", (m) => m.type() === "log" && console.log("[sahna]", m.text()));
page.on("pageerror", (e) => console.log("[xato]", e.message));
const boxes = JSON.parse(fs.readFileSync(path.join(dir, "shots/boxes.json"), "utf8"));
await page.addInitScript((b) => { window.BOXES = b; }, boxes);
await page.goto(pathToFileURL(path.join(dir, "stage.html")).href + `?render=1&len=${LEN}&demo=${DEMO}`);
await page.evaluate(() => window.preload());

if (stills) {
  for (const t of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), t);
    await page.screenshot({ path: path.join(out, `still-${t}.jpg`), type: "jpeg", quality: 85 });
  }
  await browser.close();
  console.log("kadrlar:", out);
  process.exit(0);
}

// Musiqa (--music soft — mayin variant) va ixtiyoriy ovozli izoh (--voice out/voice.wav)
const STYLE = arg("music", "soft");
const VOICE = arg("voice", "");
const music = path.join(out, `music-${LEN}-${STYLE}.wav`);
execFileSync("python3", [path.join(dir, "make-music.py"), String(LEN), music,
  JSON.stringify(await page.evaluate(() => window.SCENE_STARTS)), STYLE], { stdio: "inherit" });
let audio = music;
if (VOICE) {
  audio = path.join(out, `mix-${LEN}.wav`);
  execFileSync("python3", [path.join(dir, "mix-audio.py"), music, path.resolve(VOICE), audio], { stdio: "inherit" });
}

const file = path.join(out, `hadya-${LEN}s${VOICE ? "-ovozli" : ""}.mp4`);
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", audio,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS),
  // ijtimoiy tarmoqlar uchun standart balandlik (-14 LUFS)
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", file], { stdio: ["pipe", "inherit", "inherit"] });
const total = LEN * FPS;
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  await page.evaluate((t) => window.render(t), f / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 90 === 0) console.log(`${f}/${total} kadr (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("Tayyor:", file);
