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
//   SETUP_KEY     (Secret)  /setup sahifasini ochish kaliti (o'zingiz o'ylab topasiz, masalan 20 ta tasodifiy belgi)
// Bog'lanish (Settings → Bindings): D1 baza, nomi DB
// Triggers → Cron: 0 * * * * (har soatda — eslatmalar, muddatlar, tozalash)
// Birinchi marta: brauzerda https://<worker-manzili>/setup?key=<SETUP_KEY> ni oching.

const INDEX_HTML = "<!doctype html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<title>Hadyaga mushuklar</title>\n<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Onest:wght@400;500;600;700&display=swap\">\n<style>\n/* Uslub: «Yorqin va jasur» — ko'k blok, limon-sariq stikerlar, qalin siyoh hoshiyalar, polaroid kartalar */\n:root{\n  color-scheme: light;\n  --blue:#2D46F0; --blue-dark:#1C30C4; --blue-soft:#DCE1FF;\n  --lemon:#FFD84A; --ink:#12123A; --ink-soft:#4A4A72; --muted:#6A6A8A;\n  --paper:#F4F1EA; --white:#FFFFFF; --line:#E2DED3;\n  --danger:#D63B3B; --danger-soft:#FBE3E1; --ok:#1F8A5B; --ok-soft:#DDF3E8; --warn-soft:#FFF1C2;\n  --display:\"Unbounded\", \"Arial Black\", system-ui, sans-serif;\n  --body:\"Onest\", -apple-system, \"Segoe UI\", system-ui, sans-serif;\n  --pop:0 4px 0 var(--ink);\n}\n*{box-sizing:border-box}\nhtml,body{background:var(--paper)}\nbody{margin:0;color:var(--ink);font:15px/1.45 var(--body);padding:0 0 calc(96px + env(safe-area-inset-bottom,0px));-webkit-tap-highlight-color:transparent}\nbutton{font:inherit;color:inherit;cursor:pointer}\ninput,select,textarea{font:inherit;color:var(--ink)}\n:focus-visible{outline:3px solid var(--blue);outline-offset:2px}\nh1,h2{font-family:var(--display);margin:0;text-wrap:balance}\nh1{font-weight:800;font-size:24px;line-height:1.1}\nh2{font-weight:600;font-size:16px;margin-bottom:12px}\n.lead{color:var(--muted);margin:6px 0 16px;font-size:14px}\n.pad{padding:20px 16px 0}\n.eyebrow{font-family:var(--display);font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase}\n[hidden]{display:none!important}\n\n/* --- pastki menyu --- */\nnav{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:5}\nnav .in{max-width:520px;margin:0 auto;background:var(--ink);border-radius:22px;padding:6px;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;box-shadow:0 10px 24px -10px rgba(18,18,58,.55)}\nnav button{background:none;border:0;border-radius:16px;padding:7px 0 6px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;font-weight:600;color:#C9C9E6;min-width:0}\nnav svg{width:21px;height:21px}\nnav button.on{background:var(--lemon);color:var(--ink)}\n\n/* --- bosh sahifa: ko'k blok --- */\n.hero{position:relative;background:var(--blue);color:var(--white);padding:20px 16px 26px;border-radius:0 0 32px 32px;display:flex;flex-direction:column;gap:14px}\n.hero h1{font-size:31px;line-height:1.04;max-width:240px}\n.sticker{position:absolute;right:14px;top:50px;width:88px;height:88px;border-radius:50%;background:var(--lemon);color:var(--ink);\n  display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(10deg);box-shadow:var(--pop);text-align:center}\n.sticker b{font-family:var(--display);font-weight:800;font-size:24px;line-height:1;font-variant-numeric:tabular-nums}\n.sticker span{font-size:11px;font-weight:700;line-height:1.15;margin-top:2px}\n.place{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n.place label{position:relative;display:block;background:var(--white);border-radius:14px;min-width:0}\n.place label:first-child{background:var(--lemon)}\n.place select{width:100%;min-width:0;height:50px;border:0;background:transparent;padding:16px 30px 0 12px;font-weight:600;font-size:14px;appearance:none;text-overflow:ellipsis}\n.place small{position:absolute;left:12px;top:7px;font-size:11px;font-weight:600;color:var(--ink-soft)}\n.place label::after{content:\"\";position:absolute;right:12px;top:50%;width:8px;height:8px;border:solid var(--ink);border-width:0 2px 2px 0;transform:translateY(-70%) rotate(45deg);pointer-events:none}\n.place select:disabled{color:var(--muted)}\n\n/* --- tanlov tugmalari --- */\n.chips{display:flex;gap:8px;flex-wrap:wrap}\n.chips input{position:absolute;opacity:0;width:1px;height:1px}\n.chips label{min-height:40px;display:inline-flex;align-items:center;padding:0 14px;border-radius:12px;border:2px solid var(--ink);font-size:14px;font-weight:700;background:transparent}\n.chips input:checked+label{background:var(--ink);color:var(--white)}\n.chips input:focus-visible+label{outline:3px solid var(--blue);outline-offset:2px}\n.field .chips label{background:var(--white)}\n.chips.kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n.chips.kinds label{justify-content:center;padding:0 4px;font-size:13px}\n.field .chips input:checked+label{background:var(--ink)}\n\n/* --- polaroid kartalar --- */\n.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 14px;margin-top:18px}\n.item{background:var(--white);border:0;padding:8px 8px 12px;border-radius:6px;text-align:left;min-width:0;\n  box-shadow:0 2px 0 rgba(18,18,58,.1),0 10px 20px -12px rgba(18,18,58,.4);transform:rotate(var(--r,0deg));transition:transform .15s}\n.item:nth-child(4n+1){--r:-1.2deg}.item:nth-child(4n+2){--r:1deg}.item:nth-child(4n+3){--r:.8deg}.item:nth-child(4n){--r:-.9deg}\n.item:active{transform:rotate(0) scale(.98)}\n.ph{aspect-ratio:1;max-width:100%;background:var(--blue-soft) center/cover no-repeat;position:relative;border-radius:2px}\n.ph.empty-ph{display:grid;place-items:center}\n.ph.empty-ph::before{content:\"\";width:42%;height:42%;opacity:.35;background:var(--blue);\n  -webkit-mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cellipse cx='12' cy='15.5' rx='4.6' ry='3.8'/%3E%3Ccircle cx='6' cy='10' r='2.1'/%3E%3Ccircle cx='18' cy='10' r='2.1'/%3E%3Ccircle cx='9.2' cy='6' r='2'/%3E%3Ccircle cx='14.8' cy='6' r='2'/%3E%3C/svg%3E\") center/contain no-repeat;\n  mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cellipse cx='12' cy='15.5' rx='4.6' ry='3.8'/%3E%3Ccircle cx='6' cy='10' r='2.1'/%3E%3Ccircle cx='18' cy='10' r='2.1'/%3E%3Ccircle cx='9.2' cy='6' r='2'/%3E%3Ccircle cx='14.8' cy='6' r='2'/%3E%3C/svg%3E\") center/contain no-repeat}\n.badge{display:inline-block;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;line-height:1.3}\n.item .badge{position:absolute;left:6px;bottom:6px}\n.b-hadya{background:var(--lemon);color:var(--ink)}.b-sotuv{background:var(--ink);color:var(--white)}.b-reklama{background:var(--blue);color:var(--white)}\n.item .meta{padding:8px 2px 0}\n.item .t,.item .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.item .t{font-size:14px;font-weight:700}.item .s{font-size:12px;color:var(--muted)}\n.item .p{font-family:var(--display);font-weight:600;font-size:12.5px;margin-top:4px;font-variant-numeric:tabular-nums}\n.empty{color:var(--muted);text-align:center;padding:40px 10px}\n.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:54px;padding:12px;border:2px solid var(--ink);border-radius:16px;\n  background:var(--lemon);color:var(--ink);font-family:var(--display);font-weight:800;font-size:14px;text-decoration:none;box-shadow:var(--pop);margin-bottom:12px}\n.btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}\n.btn.ghost{background:var(--white);font-family:var(--body);font-weight:700;font-size:15px}\n.btn svg{width:20px;height:20px;flex:0 0 auto}\n.more{margin:22px auto 0;width:auto;padding:0 22px;display:flex}\n\n/* --- e'lon sahifasi --- */\n#v-detail{background:var(--blue);min-height:100vh}\n.dtop{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 0;color:var(--white)}\n.round{width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.4);background:transparent;display:grid;place-items:center;color:var(--white)}\n.round svg{width:22px;height:22px}\n.gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px;padding:20px 40px 34px;scrollbar-width:none}\n.gallery::-webkit-scrollbar{display:none}\n.pola{position:relative;flex:0 0 100%;scroll-snap-align:center;background:var(--white);padding:10px 10px 38px;border-radius:6px;\n  box-shadow:0 18px 30px -14px rgba(0,0,0,.5);transform:rotate(-2deg)}\n.pola:nth-child(even){transform:rotate(1.5deg)}\n.pola img,.pola video,.pola .ph{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:var(--blue-soft);border-radius:2px}\n.pola .cap{position:absolute;left:10px;right:10px;bottom:10px;text-align:center;font-family:var(--display);font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.pricetag{position:absolute;right:-12px;top:-14px;min-width:74px;height:74px;padding:0 8px;border-radius:37px;background:var(--lemon);color:var(--ink);\n  display:grid;place-items:center;text-align:center;font-family:var(--display);font-weight:800;font-size:13px;line-height:1.1;transform:rotate(12deg);box-shadow:var(--pop);z-index:1}\n.dots{display:flex;justify-content:center;gap:6px;margin-top:-18px;margin-bottom:16px}\n.dots i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.45)}.dots i.on{width:20px;background:var(--lemon)}\n.sheet{background:var(--paper);border-radius:30px 30px 0 0;padding:24px 16px 8px;min-height:50vh}\n.sheet h1{font-size:23px}\n.where{display:flex;align-items:center;gap:6px;margin:8px 0 18px;font-size:14px;font-weight:600;color:var(--ink-soft)}\n.where svg{width:16px;height:16px;color:var(--blue);flex:0 0 auto}\n.cells{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}\n.cell{border:2px solid var(--ink);border-radius:14px;padding:9px 12px;min-width:0;background:var(--white)}\n.cell.wide{grid-column:1 / -1}\n.cell small{display:block;font-size:12px;color:var(--muted)}\n.cell b{display:block;font-size:15px;overflow-wrap:anywhere}\n.posttext{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.55;background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:14px;margin-bottom:16px}\n.warn{display:flex;gap:10px;align-items:flex-start;background:var(--warn-soft);border:2px solid var(--ink);border-radius:14px;padding:11px 12px;font-size:14px;font-weight:600;margin-bottom:16px}\n.warn svg{width:20px;height:20px;flex:0 0 auto}\n.note-box{background:var(--white);border:2px dashed var(--ink);border-radius:16px;padding:14px;text-align:center;font-weight:700;margin-bottom:12px}\n.ctas{display:flex;gap:10px}\n.ctas .btn{flex:1}\n.ctas .call{flex:0 0 58px;width:58px;background:var(--white)}\n\n/* --- e'lon berish --- */\n.back{display:inline-flex;align-items:center;gap:4px;background:none;border:0;color:var(--blue);padding:0;margin-bottom:12px;font-weight:700;font-size:15px}\n.types{display:grid;gap:12px}\n.type{display:flex;gap:14px;align-items:center;background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:14px;text-align:left;box-shadow:var(--pop)}\n.type:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}\n.type .dot{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;border:2px solid var(--ink)}\n.type .dot svg{width:24px;height:24px}\n.type b{display:block;font-size:16px}.type small{color:var(--muted);font-size:13px}\n.type .pr{margin-left:auto;font-family:var(--display);font-size:12px;font-weight:600;white-space:nowrap}\n.slots{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:12px;align-items:end;margin:8px 0}\n.slot{position:relative;background:var(--white);padding:6px 6px 22px;border-radius:4px;border:0;\n  box-shadow:0 2px 0 rgba(18,18,58,.12),0 8px 16px -8px rgba(18,18,58,.4);transform:rotate(var(--r));transition:transform .2s}\n.slot:nth-child(1){--r:-2.5deg}.slot:nth-child(2){--r:1.5deg}.slot:nth-child(3){--r:-1deg}\n.slot:active{transform:rotate(0) scale(.97)}\n.slot .pic{aspect-ratio:1;background:var(--blue-soft) center/cover no-repeat;display:grid;place-items:center;color:var(--blue);overflow:hidden}\n.slot .pic svg{width:30%;height:30%}\n.slot .pic video{width:100%;height:100%;object-fit:cover}\n.slot .cap{position:absolute;left:0;right:0;bottom:3px;font-size:11px;font-weight:600;color:var(--muted);text-align:center}\n.slot .rm{position:absolute;top:-9px;right:-9px;width:28px;height:28px;border-radius:50%;background:var(--danger);color:#fff;\n  border:2px solid var(--ink);font-size:16px;line-height:1;display:none}\n.slot.filled .rm{display:block}.slot.filled .pic svg{display:none}\n.hint{font-size:13px;color:var(--muted);margin:12px 0 18px}\n.group{background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:2px 14px;margin-bottom:14px}\n.field{padding:12px 0;border-bottom:1.5px solid var(--line)}.field:last-child{border:0}\n.lbl{display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px}\n.field input:not([type=radio]):not([type=checkbox]),.field textarea,.field select{width:100%;border:0;background:transparent;padding:2px 0;outline:none;font-size:16px}\n.field input::placeholder,.field textarea::placeholder{color:#A3A3BC}\n.field select{appearance:none}\n.field textarea{resize:none;min-height:76px}\n.err{color:var(--danger);font-size:13px;font-weight:600;margin-top:6px;display:none}.bad .err{display:block}\n.count{font-size:12px;color:var(--muted);text-align:right}\n.contact-err:not(.bad){display:none}\n#f-username{border-bottom:0}#f-either{border-top:1.5px solid var(--line)}\n.report{background:none;border:0;color:var(--muted);font-size:13px;font-weight:600;text-decoration:underline;display:block;margin:4px auto 14px;padding:6px}\n.report-box{background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:12px 14px;margin-bottom:14px}\n.report-box .chips{flex-direction:column;align-items:stretch}\n.report-box textarea{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:8px;margin-top:10px;font-size:15px;resize:none;min-height:60px}\n#fallbackSubmit{margin-top:6px}\n\n/* --- mening e'lonlarim --- */\n.mine{display:flex;gap:12px;background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:10px;margin-bottom:12px}\n.mine .ph{width:76px;height:76px;border-radius:10px;flex:0 0 auto;aspect-ratio:auto}\n.mine .body{flex:1;min-width:0}\n.mine .t{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.st{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:8px;background:var(--line);margin:5px 0}\n.st.published{background:var(--ok-soft);color:var(--ok)}\n.st.given,.st.sold{background:var(--lemon)}\n.st.rejected,.st.expired{background:var(--danger-soft);color:var(--danger)}\n.st.awaiting_payment,.st.payment_review{background:var(--blue-soft);color:var(--blue-dark)}\n.sub{font-size:13px;color:var(--muted)}\n.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}\n.acts button{min-height:38px;font-size:13px;font-weight:700;padding:0 12px;border-radius:10px;border:2px solid var(--ink);background:var(--white)}\n.acts button:first-child{background:var(--lemon)}\n\n/* --- statistika --- */\n.bigstat{position:relative;background:var(--blue);color:var(--white);border-radius:24px;padding:22px 18px 24px;margin-bottom:14px;overflow:hidden}\n.bigstat .ring{width:140px;height:140px;border-radius:50%;background:var(--lemon);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;\n  margin:4px auto 14px;transform:rotate(-6deg);box-shadow:var(--pop)}\n.bigstat .ring b{font-family:var(--display);font-weight:800;font-size:44px;line-height:1;font-variant-numeric:tabular-nums}\n.bigstat .ring span{font-size:12px;font-weight:700}\n.bigstat p{margin:0;text-align:center;font-weight:600;font-size:15px}\n.kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}\n.kpi{background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:12px 14px}\n.kpi .n{font-family:var(--display);font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}\n.kpi .l{font-size:13px;color:var(--muted)}\n.kpi.alert{background:var(--lemon)}.kpi.alert .l{color:var(--ink)}\n.box{background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:16px;margin-bottom:14px}\n.bar{margin:12px 0}.bar .row{display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:5px}\n.track{height:12px;background:var(--blue-soft);border-radius:6px;overflow:hidden}.fill{height:100%;background:var(--blue);border-radius:6px}\n\n/* --- savol (AI) --- */\n.chat{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}\n.bubble{max-width:88%;padding:11px 14px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}\n.bubble.me{align-self:flex-end;background:var(--blue);color:var(--white);border-bottom-right-radius:6px}\n.bubble.ai{align-self:flex-start;background:var(--white);border:2px solid var(--ink);border-bottom-left-radius:6px}\n.bubble.wait{color:var(--muted);border-style:dashed}\n.suggest{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}\n.suggest button{text-align:left;background:var(--white);border:2px solid var(--ink);border-radius:14px;padding:11px 14px;font-size:14px;font-weight:600}\n.askbox{display:flex;gap:8px;align-items:flex-end;background:var(--white);border:2px solid var(--ink);border-radius:20px;padding:7px 7px 7px 14px}\n.askbox textarea{flex:1;min-width:0;border:0;background:transparent;outline:none;resize:none;min-height:26px;max-height:120px;padding:8px 0;font-size:16px}\n.askbox button{flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:2px solid var(--ink);background:var(--lemon);display:grid;place-items:center}\n.askbox button:disabled{opacity:.5}\n.askbox svg{width:20px;height:20px}\n.bubble a{color:var(--blue);font-weight:700;text-decoration:underline}\n.adminbtn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:12px;border:2px solid var(--ink);background:var(--white);font-weight:700;font-size:14px;color:var(--ink);box-shadow:0 3px 0 var(--ink)}\n.adminbtn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}\n.adminbtn svg{width:18px;height:18px}\n.helpline{display:flex;justify-content:center;margin:18px 0 4px}\n.ai-meta{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted);margin-top:8px}\n\n/* --- admin --- */\n.queue .q{display:flex;gap:10px;align-items:center;border-bottom:1.5px solid var(--line);padding:10px 0}\n.queue .q:last-child{border:0}\n.queue .q .ph{width:50px;height:50px;border-radius:8px;flex:0 0 auto;aspect-ratio:auto}\n.queue .q .body{flex:1;min-width:0}\n.queue .q .t{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.cmds{font-size:14px;line-height:1.75}.cmds code{background:var(--paper);border:1.5px solid var(--line);padding:1px 6px;border-radius:6px;font-weight:600}\n#outside{background:var(--lemon);border:2px solid var(--ink);padding:12px;border-radius:14px;margin:12px 16px 0;font-size:14px;font-weight:600}\n@media (prefers-reduced-motion:reduce){.slot,.item{transition:none}}\n</style>\n</head>\n<body>\n<div id=\"outside\" hidden>Ilova Telegram ichida to'liq ishlaydi. Botga kirib «Ilova» tugmasini bosing.</div>\n\n<section class=\"view\" id=\"v-search\">\n  <div class=\"hero\">\n    <span class=\"eyebrow\">Hadyaga mushuklar</span>\n    <h1>Har bir mushukka uy kerak</h1>\n    <div class=\"sticker\" id=\"heroSticker\" hidden><b id=\"heroCount\">0</b><span>uy<br>topdi</span></div>\n    <div class=\"place\">\n      <label><small>Hudud</small><select id=\"fRegion\" aria-label=\"Hudud\"><option value=\"\">Barcha hududlar</option></select></label>\n      <label><small>Tuman</small><select id=\"fDistrict\" aria-label=\"Tuman\" disabled><option value=\"\">Barcha tumanlar</option></select></label>\n    </div>\n  </div>\n  <div class=\"pad\">\n    <div class=\"chips kinds\">\n      <input type=\"radio\" name=\"fk\" id=\"fk-all\" value=\"\" checked><label for=\"fk-all\">Hammasi</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-h\" value=\"hadya\"><label for=\"fk-h\">Hadya</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-s\" value=\"sotuv\"><label for=\"fk-s\">Sotuv</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-r\" value=\"reklama\"><label for=\"fk-r\">Reklama</label>\n    </div>\n    <div class=\"grid\" id=\"results\"></div>\n    <div class=\"empty\" id=\"noResults\" hidden>Bu yerda hozircha e'lon yo'q</div>\n    <button class=\"btn ghost more\" id=\"loadMore\" hidden>Yana ko'rsatish</button>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-detail\" hidden><div id=\"detail\"></div></section>\n\n<section class=\"view pad\" id=\"v-new\" hidden>\n  <div id=\"stepType\">\n    <h1>E'lon berish</h1>\n    <p class=\"lead\">E'lon admin tekshiruvidan so'ng kanalga chiqadi</p>\n    <div class=\"types\">\n      <button class=\"type\" data-kind=\"hadya\"><span class=\"dot\" style=\"background:var(--lemon)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z\"/></svg></span>\n        <span><b>Hadyaga mushuk</b><small>Yangi uy izlayotgan mushuk</small></span><span class=\"pr\">BEPUL</span></button>\n      <button class=\"type\" data-kind=\"sotuv\"><span class=\"dot\" style=\"background:var(--ink);color:var(--white)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z\"/><circle cx=\"7\" cy=\"7\" r=\"1.5\"/></svg></span>\n        <span><b>Mushuk sotish</b><small>Zotli yoki oddiy mushuk</small></span><span class=\"pr js-price\"></span></button>\n      <button class=\"type\" data-kind=\"reklama\"><span class=\"dot\" style=\"background:var(--blue);color:var(--white)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8\"/></svg></span>\n        <span><b>Reklama</b><small>Klinika, do'kon, xizmat, mahsulot</small></span><span class=\"pr js-price\"></span></button>\n    </div>\n  </div>\n\n  <div id=\"stepForm\" hidden>\n    <button class=\"back\" id=\"backToType\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 6l-6 6 6 6\"/></svg>E'lon turi</button>\n    <h1 id=\"formTitle\"></h1>\n    <p class=\"lead\" id=\"formLead\"></p>\n    <div class=\"slots\">\n      <button type=\"button\" class=\"slot\" data-i=\"0\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/></svg></div><div class=\"cap\">Asosiy</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n      <button type=\"button\" class=\"slot\" data-i=\"1\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M12 6v12M6 12h12\"/></svg></div><div class=\"cap\">Rasm/video</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n      <button type=\"button\" class=\"slot\" data-i=\"2\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M12 6v12M6 12h12\"/></svg></div><div class=\"cap\">Rasm/video</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n    </div>\n    <input type=\"file\" id=\"file\" accept=\"image/*,video/*\" hidden>\n    <div id=\"f-media\"><div class=\"err\">Kamida bitta rasm yoki video qo'shing.</div></div>\n    <p class=\"hint\">3 tagacha rasm yoki video (video 20 MB gacha).</p>\n\n    <div class=\"group k-cat\">\n      <div class=\"field\"><label class=\"lbl\" for=\"breed\">Zoti</label><input id=\"breed\" maxlength=\"40\" placeholder=\"Masalan, britan, oddiy\"></div>\n      <div class=\"field\" id=\"f-age\"><label class=\"lbl\" for=\"age\">Yoshi</label><input id=\"age\" maxlength=\"30\" placeholder=\"Masalan, 3 oylik\"><div class=\"err\">Yoshini yozing.</div></div>\n      <div class=\"field\" id=\"f-gender\"><span class=\"lbl\">Jinsi</span><div class=\"chips\">\n        <input type=\"radio\" name=\"gender\" id=\"g-f\" value=\"f\"><label for=\"g-f\">Urg'ochi</label>\n        <input type=\"radio\" name=\"gender\" id=\"g-m\" value=\"m\"><label for=\"g-m\">Erkak</label>\n        <input type=\"radio\" name=\"gender\" id=\"g-u\" value=\"u\"><label for=\"g-u\">Bilmayman</label></div><div class=\"err\">Jinsini tanlang.</div></div>\n      <div class=\"field\"><span class=\"lbl\">Sog'lig'i</span><div class=\"chips\">\n        <input type=\"checkbox\" name=\"health\" id=\"h-1\" value=\"soglom\"><label for=\"h-1\">Sog'lom</label>\n        <input type=\"checkbox\" name=\"health\" id=\"h-2\" value=\"emlangan\"><label for=\"h-2\">Emlangan</label>\n        <input type=\"checkbox\" name=\"health\" id=\"h-3\" value=\"steril\"><label for=\"h-3\">Sterilizatsiya qilingan</label></div>\n        <input id=\"health_note\" maxlength=\"80\" placeholder=\"Qo'shimcha (ixtiyoriy)\" style=\"margin-top:10px\"></div>\n      <div class=\"field\" id=\"f-delivery\"><span class=\"lbl\">Dostafka</span><div class=\"chips\">\n        <input type=\"radio\" name=\"delivery\" id=\"d-1\" value=\"bor\"><label for=\"d-1\">Bor</label>\n        <input type=\"radio\" name=\"delivery\" id=\"d-2\" value=\"yoq\"><label for=\"d-2\">Yo'q</label>\n        <input type=\"radio\" name=\"delivery\" id=\"d-3\" value=\"kelish\"><label for=\"d-3\">Kelishiladi</label></div><div class=\"err\">Tanlang.</div></div>\n      <div class=\"field k-sotuv\" id=\"f-price\"><label class=\"lbl\" for=\"price\">Narxi (so'm)</label><input id=\"price\" inputmode=\"numeric\" maxlength=\"15\" placeholder=\"Masalan, 500000\"><div class=\"err\">Narxni yozing.</div></div>\n    </div>\n\n    <div class=\"group k-reklama\">\n      <div class=\"field\" id=\"f-title\"><label class=\"lbl\" for=\"title\">Nomi</label><input id=\"title\" maxlength=\"60\" placeholder=\"Masalan, «Mushukjon» veterinar klinikasi\"><div class=\"err\">Nomini yozing.</div></div>\n      <div class=\"field\" id=\"f-about\"><label class=\"lbl\" for=\"about\">Tavsif</label><textarea id=\"about\" maxlength=\"300\" placeholder=\"Nima taklif qilasiz?\"></textarea><div class=\"err\">Tavsif yozing.</div></div>\n      <div class=\"field\"><label class=\"lbl\" for=\"rprice\">Narxi (ixtiyoriy)</label><input id=\"rprice\" maxlength=\"40\" placeholder=\"Masalan, 50 000 so'mdan\"></div>\n    </div>\n\n    <div class=\"group\">\n      <div class=\"field\" id=\"f-region\"><label class=\"lbl\" for=\"region\">Hudud</label><select id=\"region\"><option value=\"\">Tanlang…</option></select><div class=\"err\">Hududni tanlang.</div></div>\n      <div class=\"field\" id=\"f-district\"><label class=\"lbl\" for=\"district\">Tuman / shahar</label><select id=\"district\" disabled><option value=\"\">Avval hududni tanlang</option></select><div class=\"err\">Tanlang.</div></div>\n      <div class=\"field\"><label class=\"lbl\" for=\"extra\">Qo'shimcha ma'lumot</label><textarea id=\"extra\" maxlength=\"400\" placeholder=\"Xarakteri, sharti va boshqalar\"></textarea><div class=\"count\"><span id=\"cnt\">0</span>/<span id=\"cntMax\">400</span></div></div>\n    </div>\n\n    <h2 style=\"margin-top:4px\">Bog'lanish</h2>\n    <p class=\"hint\" style=\"margin:-6px 0 10px\">Telefon yoki Telegram — kamida bittasini yozing. Ikkalasi ham bo'lishi mumkin.</p>\n    <div class=\"group\" id=\"f-contact\">\n      <div class=\"field\" id=\"f-phone\"><label class=\"lbl\" for=\"phone\">Telefon (ixtiyoriy)</label><input id=\"phone\" type=\"tel\" inputmode=\"tel\" value=\"+998 \" maxlength=\"20\" autocomplete=\"tel\"><div class=\"err\">+998 XX XXX XX XX ko'rinishida yozing yoki bo'sh qoldiring.</div></div>\n      <div class=\"field\" id=\"f-username\"><label class=\"lbl\" for=\"tg_username\">Telegram username (ixtiyoriy)</label><input id=\"tg_username\" maxlength=\"40\" placeholder=\"@username\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><div class=\"err\">Masalan: @ism_familiya — 5–32 ta lotin harf, raqam yoki _.</div></div>\n      <div class=\"field contact-err\" id=\"f-either\"><div class=\"err\" style=\"margin-top:0\">Telefon raqam yoki Telegram username'dan kamida bittasini yozing.</div></div>\n    </div>\n    <button class=\"btn\" id=\"fallbackSubmit\" hidden>E'lonni yuborish</button>\n  </div>\n</section>\n\n<section class=\"view pad\" id=\"v-my\" hidden>\n  <h1>Mening e'lonlarim</h1>\n  <p class=\"lead\">Mushuk egasini topganda shu yerda belgilang</p>\n  <div id=\"myList\"></div>\n  <div class=\"helpline js-admin\" hidden><button class=\"adminbtn\" data-admin><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>E'lon bo'yicha savol? Adminga yozing</button></div>\n</section>\n\n<section class=\"view pad\" id=\"v-stats\" hidden>\n  <h1>Statistika</h1>\n  <p class=\"lead\">Kanalimiz orqali yangi uy topgan mushuklar</p>\n  <div id=\"statsBox\"></div>\n</section>\n\n<section class=\"view pad\" id=\"v-ask\" hidden>\n  <h1>Mushuk haqida savol</h1>\n  <p class=\"lead\">Parvarish, ovqat, sog'liq va xulq haqida so'rang</p>\n  <div class=\"chat\" id=\"chat\"></div>\n  <div class=\"suggest\" id=\"suggest\">\n    <button>2 oylik mushukchani nima bilan boqish kerak?</button>\n    <button>Mushukni lotokka qanday o'rgataman?</button>\n    <button>Mushukni qachon emlash kerak?</button>\n  </div>\n  <form class=\"askbox\" id=\"askForm\">\n    <textarea id=\"q\" rows=\"1\" maxlength=\"500\" placeholder=\"Savolingizni yozing…\" aria-label=\"Savol\"></textarea>\n    <button id=\"askBtn\" aria-label=\"Yuborish\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg></button>\n  </form>\n  <div class=\"ai-meta\"><span id=\"aiLeft\"></span><span>Jiddiy holatda veterinarga murojaat qiling</span></div>\n  <div class=\"err\" id=\"askErr\" style=\"display:block\"></div>\n  <div class=\"helpline js-admin\" hidden><button class=\"adminbtn\" data-admin><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>Adminga yozish</button></div>\n</section>\n\n<section class=\"view pad\" id=\"v-admin\" hidden>\n  <h1>Admin panel</h1>\n  <p class=\"lead\">Faqat adminlarga ko'rinadi</p>\n  <div id=\"adminBox\"><div class=\"empty\">Yuklanmoqda…</div></div>\n  <div class=\"group\" style=\"padding:14px\">\n    <h2>To'lov sozlamalari</h2>\n    <div class=\"field\" style=\"padding-top:0\"><label class=\"lbl\" for=\"sPrice\">Pullik e'lon narxi (so'm)</label><input id=\"sPrice\" inputmode=\"numeric\" maxlength=\"9\"></div>\n    <div class=\"field\"><label class=\"lbl\" for=\"sCard\">Karta raqami</label><input id=\"sCard\" inputmode=\"numeric\" maxlength=\"23\" placeholder=\"8600 0000 0000 0000\"></div>\n    <div class=\"field\"><label class=\"lbl\" for=\"sOwner\">Karta egasi</label><input id=\"sOwner\" maxlength=\"60\" placeholder=\"Ism Familiya\"></div>\n    <button class=\"btn\" id=\"saveSettings\" style=\"margin-top:12px\">Saqlash</button>\n  </div>\n  <div class=\"box cmds\">\n    <h2>Bot buyruqlari</h2>\n    <div><code>/berilgan</code> — eski berilgan postlarni statistikaga kiritish rejimi</div>\n    <div><code>/oddiy</code> — rejimni o'chirish</div>\n    <div><code>/ban 123456789</code> yoki <code>/ban @username</code> — foydalanuvchini bloklash</div>\n    <div><code>/unban 123456789</code> — blokdan chiqarish</div>\n    <div>Kanaldagi postni ilovaga qo'shish uchun uni botga forward qiling.</div>\n    <div>E'lon va cheklarni bot chatidagi tugmalar orqali tasdiqlaysiz.</div>\n  </div>\n</section>\n\n<nav><div class=\"in\">\n  <button data-view=\"search\" class=\"on\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/></svg>Qidirish</button>\n  <button data-view=\"new\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><path d=\"M12 8v8M8 12h8\"/></svg>E'lon</button>\n  <button data-view=\"ask\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z\"/></svg>Savol</button>\n  <button data-view=\"my\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path d=\"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01\"/></svg>Mening</button>\n  <button data-view=\"stats\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/></svg>Statistika</button>\n  <button data-view=\"admin\" id=\"navAdmin\" hidden><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z\"/><path d=\"M9 12l2 2 4-4\"/></svg>Admin</button>\n</div></nav>\n\n<script>\nconst tg = window.Telegram?.WebApp, inTg = !!(tg && tg.initData);\nconst $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];\nconst esc = s => String(s ?? \"\").replace(/[&<>\"']/g, c => ({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[c]));\nconst KIND = {hadya:\"Hadya\", sotuv:\"Sotuv\", reklama:\"Reklama\"};\nconst TAG = {hadya:\"#hadyaga\", sotuv:\"#sotiladi\", reklama:\"#reklama\"};\nconst ICON = {\n  back: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 6l-6 6 6 6\"/></svg>',\n  pin: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\"><path d=\"M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z\"/><circle cx=\"12\" cy=\"11\" r=\"2\"/></svg>',\n  phone: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2\"/></svg>',\n  send: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>',\n  warn: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M12 3l9 16H3z\"/><path d=\"M12 10v4M12 17h.01\"/></svg>',\n  ext: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 4h6v6M20 4l-9 9M18 14v6H4V6h6\"/></svg>',\n  share: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><path d=\"M8.6 13.5l6.8 4M15.4 6.5l-6.8 4\"/></svg>',\n};\nlet REGIONS = [], CONFIG = {price_text:\"7 000 so'm\"}, current = \"search\";\n\nasync function api(path, opts = {}) {\n  opts.headers = {...(opts.headers || {}), \"X-Init-Data\": tg?.initData || \"\"};\n  try {\n    const r = await fetch(path, opts);\n    const j = await r.json().catch(() => ({ok:false, error:\"Server javob bermadi.\"}));\n    if (!r.ok && !j.error) j.error = \"Xatolik yuz berdi.\";\n    return j;\n  } catch { return {ok:false, error:\"Internet aloqasini tekshiring.\"}; }\n}\nconst say = (m, cb) => tg?.showAlert ? tg.showAlert(m, cb) : (alert(m), cb && cb());\nconst ask = m => new Promise(res => tg?.showConfirm ? tg.showConfirm(m, res) : res(confirm(m)));\nconst haptic = t => tg?.HapticFeedback?.notificationOccurred(t);\nconst openTg = url => tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url);\nconst thumb = (url, cls = \"ph\") => url ? `<div class=\"${cls}\" style=\"background-image:url('${url}')\">` : `<div class=\"${cls} empty-ph\">`;\nfunction headerColor(c) { try { tg?.setHeaderColor(c); } catch {} }\n\nfunction fillRegions(sel, first) { sel.innerHTML = `<option value=\"\">${first}</option>` + REGIONS.map(r => `<option>${esc(r.name)}</option>`).join(\"\"); }\nfunction fillDistricts(sel, region, first) {\n  const r = REGIONS.find(x => x.name === region);\n  sel.innerHTML = `<option value=\"\">${first}</option>` + (r ? r.d.map(d => `<option>${esc(d[0])}</option>`).join(\"\") : \"\");\n  sel.disabled = !r;\n}\n\n/* ---------- navigatsiya ---------- */\nfunction show(view) {\n  current = view;\n  $$(\".view\").forEach(v => v.hidden = v.id !== \"v-\" + view);\n  $$(\"nav button\").forEach(b => b.classList.toggle(\"on\", b.dataset.view === view || (view === \"detail\" && b.dataset.view === \"search\")));\n  window.scrollTo(0, 0);\n  headerColor(view === \"search\" || view === \"detail\" ? \"#2D46F0\" : \"#F4F1EA\");\n  updateMainButton();\n  if (view === \"detail\") tg?.BackButton.show(); else tg?.BackButton.hide();\n  if (view === \"my\") loadMy();\n  if (view === \"stats\") loadStats();\n  if (view === \"admin\") loadAdmin();\n  if (view === \"ask\") refreshAiLeft();\n}\n$$(\"nav button\").forEach(b => b.onclick = () => show(b.dataset.view));\ntg?.BackButton.onClick(() => show(\"search\"));\n\n/* ---------- qidiruv ---------- */\nlet offset = 0;\nasync function search(reset = true) {\n  if (reset) { offset = 0; $(\"#results\").innerHTML = \"\"; }\n  const q = new URLSearchParams({kind: $('input[name=\"fk\"]:checked').value, region: $(\"#fRegion\").value, district: $(\"#fDistrict\").value, offset});\n  const j = await api(\"api/listings?\" + q);\n  (j.items || []).forEach(it => {\n    const b = document.createElement(\"button\");\n    b.className = \"item\";\n    b.innerHTML = `${thumb(it.thumb)}<span class=\"badge b-${it.kind}\">${KIND[it.kind]}</span></div>\n      <div class=\"meta\"><div class=\"t\">${esc(it.title)}</div><div class=\"s\">${esc(it.district || it.region || \"\")}</div><div class=\"p\">${esc(it.kind === \"hadya\" ? \"BEPUL\" : it.price)}</div></div>`;\n    b.onclick = () => openDetail(it.id);\n    $(\"#results\").append(b);\n  });\n  offset += (j.items || []).length;\n  $(\"#loadMore\").hidden = !j.more;\n  $(\"#noResults\").hidden = offset > 0;\n  if (j.error) { $(\"#noResults\").textContent = j.error; $(\"#noResults\").hidden = false; }\n}\n$$('input[name=\"fk\"]').forEach(i => i.onchange = () => search());\n$(\"#fRegion\").onchange = () => { fillDistricts($(\"#fDistrict\"), $(\"#fRegion\").value, \"Barcha tumanlar\"); search(); };\n$(\"#fDistrict\").onchange = () => search();\n$(\"#loadMore\").onclick = () => search(false);\n\nasync function openDetail(id) {\n  const j = await api(\"api/listings/\" + id);\n  if (j.error) return say(j.error);\n  const tag = j.kind === \"hadya\" ? \"BEPUL\" : esc(j.price);\n  const media = j.media.length ? j.media : [null];\n  const gal = media.map((m, i) => `<div class=\"pola\">${i === 0 ? `<span class=\"pricetag\">${tag}</span>` : \"\"}\n    ${!m ? `<div class=\"ph empty-ph\"></div>` : m.type === \"video\" ? `<video src=\"${m.url}\" controls playsinline preload=\"metadata\"></video>` : `<img src=\"${m.url}\" alt=\"\">`}\n    <span class=\"cap\">${esc(j.title)}</span></div>`).join(\"\");\n  const dots = media.length > 1 ? `<div class=\"dots\">${media.map((_, i) => `<i class=\"${i ? \"\" : \"on\"}\"></i>`).join(\"\")}</div>` : \"\";\n  const rowsNoPlace = j.rows.filter(([k]) => k !== \"Manzil\" && k !== \"Narxi\");\n  const short = rowsNoPlace.filter(([, v]) => String(v).length <= 22), long = rowsNoPlace.filter(([, v]) => String(v).length > 22);\n  const cell = ([k, v], wide) => `<div class=\"cell${wide ? \" wide\" : \"\"}\"><small>${esc(k)}</small><b>${esc(v)}</b></div>`;\n  const cells = short.map((r, i) => cell(r, short.length % 2 === 1 && i === short.length - 1)).join(\"\") + long.map(r => cell(r, true)).join(\"\");\n  const place = (j.rows.find(([k]) => k === \"Manzil\") || [, j.district || j.region || \"\"])[1];\n  let actions = \"\";\n  if (j.contact) {\n    const call = j.contact.phone ? `<a class=\"btn call\" href=\"tel:${j.contact.phone.replace(/\\s/g, \"\")}\" aria-label=\"Qo'ng'iroq: ${esc(j.contact.phone)}\">${ICON.phone}</a>` : \"\";\n    const write = j.contact.username ? `<button class=\"btn\" id=\"dWrite\">${ICON.send}Egasiga yozish</button>`\n      : j.contact.phone ? `<a class=\"btn\" href=\"tel:${j.contact.phone.replace(/\\s/g, \"\")}\">${ICON.phone}${esc(j.contact.phone)}</a>` : \"\";\n    actions += `<div class=\"ctas\">${j.contact.username ? call : \"\"}${write}</div>`;\n    if (j.contact.phone && j.contact.username) actions += `<p class=\"sub\" style=\"text-align:center;margin:0 0 12px\">Telefon: ${esc(j.contact.phone)}</p>`;\n  } else if (j.status === \"published\") {\n    // Kontaktlar faqat Telegram ichida ko'rinadi (raqamlarni skript bilan yig'ib bo'lmasin)\n    actions += `<div class=\"note-box\">${j.contact_hidden ? \"Egasining kontaktini ko'rish uchun ilovani Telegram'dagi bot orqali oching\" : \"Kontakt uchun kanaldagi postni ko'ring\"}</div>`;\n  } else {\n    actions += `<div class=\"note-box\">${j.status === \"given\" ? \"Bu mushuk yangi uyini topdi\" : j.status === \"sold\" ? \"Sotilgan\" : \"E'lon dolzarb emas\"}</div>`;\n  }\n  if (CONFIG.bot && j.status === \"published\") actions += `<button class=\"btn ghost\" id=\"dShare\">${ICON.share}Do'stlarga ulashish</button>`;\n  if (j.post) actions += `<button class=\"btn ghost\" id=\"dPost\">${ICON.ext}Kanalda ko'rish</button>`;\n  if (inTg && j.status === \"published\" && !j.mine) actions += `<button class=\"report\" id=\"dReport\">🚩 Shikoyat qilish</button><div id=\"reportBox\"></div>`;\n  $(\"#detail\").innerHTML = `\n    <div class=\"dtop\"><button class=\"round\" id=\"dBack\" aria-label=\"Orqaga\">${ICON.back}</button><span class=\"eyebrow\">${TAG[j.kind]}</span><span style=\"width:44px\"></span></div>\n    <div class=\"gallery\" id=\"gal\">${gal}</div>${dots}\n    <div class=\"sheet\">\n      <h1>${esc(j.title)}</h1>\n      <div class=\"where\">${ICON.pin}${esc(place)}</div>\n      ${j.kind === \"sotuv\" && j.contact ? `<div class=\"warn\">${ICON.warn}<span>Oldindan pul o'tkazmang. Mushukni ko'rib, keyin to'lang.</span></div>` : \"\"}\n      ${cells ? `<div class=\"cells\">${cells}</div>` : \"\"}\n      ${j.text ? `<div class=\"posttext\">${esc(j.text)}</div>` : \"\"}\n      ${actions}\n    </div>`;\n  $(\"#dBack\").onclick = () => show(\"search\");\n  if ($(\"#dWrite\")) $(\"#dWrite\").onclick = () => openTg(\"https://t.me/\" + j.contact.username);\n  if ($(\"#dPost\")) $(\"#dPost\").onclick = () => openTg(j.post);\n  if ($(\"#dShare\")) $(\"#dShare\").onclick = () => {\n    // Havola botni ochadi, bot esa shu e'lonni ilovada ochadigan tugma beradi\n    const link = `https://t.me/${CONFIG.bot}?start=l${j.id}`;\n    const text = `🐾 ${KIND[j.kind]}: ${j.title} — ${place}`;\n    openTg(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);\n  };\n  if ($(\"#dReport\")) $(\"#dReport\").onclick = () => showReport(j.id);\n  const g = $(\"#gal\");\n  if (media.length > 1) g.onscroll = () => {\n    const i = Math.round(g.scrollLeft / g.clientWidth);\n    $$(\".dots i\").forEach((d, k) => d.classList.toggle(\"on\", k === i));\n  };\n  show(\"detail\");\n}\n\n/* ---------- shikoyat ---------- */\nfunction showReport(id) {\n  const box = $(\"#reportBox\");\n  if (box.innerHTML) { box.innerHTML = \"\"; return; }\n  const reasons = Object.entries(CONFIG.report_reasons || {other: \"Boshqa sabab\"});\n  box.innerHTML = `<div class=\"report-box\"><span class=\"lbl\">Shikoyat sababi</span><div class=\"chips\">\n    ${reasons.map(([k, t], i) => `<input type=\"radio\" name=\"rr\" id=\"rr-${k}\" value=\"${k}\"${i ? \"\" : \" checked\"}><label for=\"rr-${k}\">${esc(t)}</label>`).join(\"\")}\n    </div><textarea id=\"rNote\" maxlength=\"300\" placeholder=\"Izoh (ixtiyoriy)\"></textarea>\n    <button class=\"btn\" id=\"rSend\" style=\"margin:10px 0 0\">Adminga yuborish</button></div>`;\n  box.scrollIntoView({behavior: \"smooth\", block: \"center\"});\n  $(\"#rSend\").onclick = async () => {\n    $(\"#rSend\").disabled = true;\n    const r = await api(`api/listings/${id}/report`, {method: \"POST\", headers: {\"Content-Type\": \"application/json\"},\n      body: JSON.stringify({reason: val(\"rr\"), note: $(\"#rNote\").value})});\n    $(\"#rSend\").disabled = false;\n    if (r.ok) { haptic(\"success\"); box.innerHTML = \"\"; $(\"#dReport\").hidden = true; say(\"Shikoyatingiz adminga yuborildi. Rahmat!\"); }\n    else say(r.error || \"Xatolik yuz berdi.\");\n  };\n}\n\n/* ---------- e'lon berish ---------- */\nlet kind = null, slotIdx = 0, sending = false;\nconst media = [null, null, null];\n\n$$(\".type\").forEach(b => b.onclick = () => {\n  kind = b.dataset.kind;\n  $(\"#formTitle\").textContent = {hadya:\"Hadyaga mushuk\", sotuv:\"Mushuk sotish\", reklama:\"Reklama\"}[kind];\n  $(\"#formLead\").textContent = kind === \"hadya\" ? \"Bepul. Admin tekshirgach kanalga chiqadi\" : `Admin ma'qullagach ${CONFIG.price_text} to'lov qilasiz`;\n  $$(\".k-cat\").forEach(e => e.hidden = kind === \"reklama\");\n  $$(\".k-sotuv\").forEach(e => e.hidden = kind !== \"sotuv\");\n  $$(\".k-reklama\").forEach(e => e.hidden = kind !== \"reklama\");\n  const max = kind === \"reklama\" ? 300 : 400;\n  $(\"#extra\").maxLength = max; $(\"#cntMax\").textContent = max;\n  $(\"#stepType\").hidden = true; $(\"#stepForm\").hidden = false;\n  window.scrollTo(0, 0); updateMainButton();\n});\n$(\"#backToType\").onclick = () => { $(\"#stepForm\").hidden = true; $(\"#stepType\").hidden = false; kind = null; updateMainButton(); };\n\n$$(\".slot\").forEach(s => s.onclick = e => {\n  const i = +s.dataset.i;\n  if (e.target.classList.contains(\"rm\")) return setMedia(i, null);\n  slotIdx = media[i] ? i : Math.max(0, media.findIndex(m => !m));\n  $(\"#file\").value = \"\"; $(\"#file\").click();\n});\n$(\"#file\").onchange = async () => {\n  const f = $(\"#file\").files[0]; if (!f) return;\n  try {\n    if (f.type.startsWith(\"video/\")) {\n      if (f.size > 20 * 1024 * 1024) return say(\"Video 20 MB dan oshmasin. Qisqaroq video tanlang.\");\n      setMedia(slotIdx, {blob: f, video: true});\n    } else setMedia(slotIdx, {blob: await compress(f), video: false});\n  } catch { say(\"Bu faylni ochib bo'lmadi. Boshqasini tanlang.\"); }\n};\nfunction setMedia(i, m) {\n  media[i] = m;\n  const s = $(`.slot[data-i=\"${i}\"]`), pic = s.querySelector(\".pic\");\n  pic.querySelector(\"video\")?.remove(); pic.style.backgroundImage = \"\";\n  if (m) {\n    const url = URL.createObjectURL(m.blob);\n    if (m.video) pic.insertAdjacentHTML(\"beforeend\", `<video src=\"${url}\" muted playsinline></video>`);\n    else pic.style.backgroundImage = `url(${url})`;\n  }\n  s.classList.toggle(\"filled\", !!m);\n  $(\"#f-media\").classList.remove(\"bad\");\n}\n// Rasmni 1600px gacha kichraytirib JPEG qiladi (iPhone HEIC ham shu yerda JPEG'ga aylanadi)\nasync function compress(file) {\n  const url = URL.createObjectURL(file);\n  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });\n  const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));\n  const c = document.createElement(\"canvas\");\n  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);\n  c.getContext(\"2d\").drawImage(img, 0, 0, c.width, c.height);\n  URL.revokeObjectURL(url);\n  return new Promise(res => c.toBlob(res, \"image/jpeg\", 0.85));\n}\n$(\"#region\").onchange = () => { fillDistricts($(\"#district\"), $(\"#region\").value, \"Tanlang…\"); $(\"#f-region\").classList.remove(\"bad\"); };\n$(\"#extra\").oninput = () => $(\"#cnt\").textContent = $(\"#extra\").value.length;\n$$(\"#stepForm input, #stepForm select, #stepForm textarea\").forEach(el =>\n  el.addEventListener(\"input\", () => el.closest(\".field\")?.classList.remove(\"bad\")));\n\nconst val = n => $(`input[name=\"${n}\"]:checked`)?.value || \"\";\n// \"+998 \" yolg'iz qolsa — telefon kiritilmagan hisoblanadi\nconst phoneDigits = () => { const d = $(\"#phone\").value.replace(/\\D/g, \"\"); return d === \"998\" ? \"\" : d; };\n// \"\" — kiritilmagan, false — noto'g'ri, aks holda @ belgisisiz username (t.me/... havolasi ham bo'ladi)\nfunction cleanUser() {\n  const s = $(\"#tg_username\").value.trim().replace(/^(https?:\\/\\/)?(t\\.me|telegram\\.me)\\//i, \"\").replace(/^@/, \"\");\n  if (!s) return \"\";\n  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) ? s : false;\n}\n// Telegram profilida username bo'lsa, maydonga oldindan yozib qo'yiladi (foydalanuvchi o'chirishi mumkin)\nconst myUsername = () => tg?.initDataUnsafe?.user?.username ? \"@\" + tg.initDataUnsafe.user.username : \"\";\n[\"#phone\", \"#tg_username\"].forEach(s => $(s).addEventListener(\"input\", () => $(\"#f-either\").classList.remove(\"bad\")));\nfunction validate() {\n  $$(\"#stepForm .bad, #f-media.bad\").forEach(e => e.classList.remove(\"bad\"));\n  const bad = [], need = (ok, id) => { if (!ok) bad.push(id); };\n  need(media.some(Boolean), \"f-media\");\n  if (kind === \"reklama\") { need($(\"#title\").value.trim(), \"f-title\"); need($(\"#about\").value.trim(), \"f-about\"); }\n  else {\n    need($(\"#age\").value.trim(), \"f-age\"); need(val(\"gender\"), \"f-gender\"); need(val(\"delivery\"), \"f-delivery\");\n    if (kind === \"sotuv\") need(+$(\"#price\").value.replace(/\\D/g, \"\") >= 1000, \"f-price\");\n  }\n  need($(\"#region\").value, \"f-region\"); need($(\"#district\").value, \"f-district\");\n  // Kontakt: ikkalasi ham ixtiyoriy, lekin yozilgan bo'lsa to'g'ri bo'lsin va kamida bittasi bo'lsin\n  const phone = phoneDigits(), user = cleanUser();\n  need(!phone || /^998\\d{9}$/.test(phone), \"f-phone\");\n  need(user !== false, \"f-username\");\n  if (!phone && !user && user !== false) bad.push(\"f-either\");\n  bad.forEach(id => $(\"#\" + id).classList.add(\"bad\"));\n  if (bad.length) { $(\"#\" + bad[0]).scrollIntoView({behavior:\"smooth\", block:\"center\"}); haptic(\"error\"); }\n  return !bad.length;\n}\n\nasync function submit() {\n  if (sending || !validate()) return;\n  sending = true; tg?.MainButton.showProgress(); $(\"#fallbackSubmit\").disabled = true;\n  const fd = new FormData();\n  fd.append(\"initData\", tg?.initData || \"\"); fd.append(\"kind\", kind);\n  [\"breed\", \"age\", \"health_note\", \"title\", \"about\", \"region\", \"district\", \"phone\", \"tg_username\", \"extra\"].forEach(id => fd.append(id, $(\"#\" + id).value));\n  fd.append(\"price\", kind === \"reklama\" ? $(\"#rprice\").value : $(\"#price\").value);\n  fd.append(\"gender\", val(\"gender\")); fd.append(\"delivery\", val(\"delivery\"));\n  fd.append(\"health\", $$('input[name=\"health\"]:checked').map(i => i.value).join(\",\"));\n  media.filter(Boolean).forEach((m, i) => fd.append(\"media\", m.blob, m.video ? `v${i}.mp4` : `p${i}.jpg`));\n  const j = await api(\"api/submit\", {method: \"POST\", body: fd});\n  sending = false; tg?.MainButton.hideProgress(); $(\"#fallbackSubmit\").disabled = false;\n  if (j.ok) {\n    haptic(\"success\");\n    say(\"E'lon adminga yuborildi! Natija haqida bot xabar beradi.\", () => { resetForm(); show(\"my\"); });\n  } else say(j.error || \"Xatolik. Qayta urinib ko'ring.\");\n}\nfunction resetForm() {\n  [0, 1, 2].forEach(i => setMedia(i, null));\n  $$(\"#stepForm input:not([type=radio]):not([type=checkbox]), #stepForm textarea\").forEach(e => e.value = \"\");\n  $$(\"#stepForm input[type=radio], #stepForm input[type=checkbox]\").forEach(e => e.checked = false);\n  $(\"#phone\").value = \"+998 \"; $(\"#tg_username\").value = myUsername(); $(\"#cnt\").textContent = \"0\";\n  $(\"#region\").value = \"\"; fillDistricts($(\"#district\"), \"\", \"Avval hududni tanlang\");\n  $(\"#stepForm\").hidden = true; $(\"#stepType\").hidden = false; kind = null;\n}\n\nfunction updateMainButton() {\n  const on = current === \"new\" && !!kind;\n  if (inTg) { if (on) { tg.MainButton.setText(\"E'lonni yuborish\"); tg.MainButton.show(); } else tg.MainButton.hide(); }\n  else $(\"#fallbackSubmit\").hidden = !on;\n}\nif (inTg) tg.MainButton.onClick(submit); else $(\"#fallbackSubmit\").onclick = submit;\n\n/* ---------- mening e'lonlarim ---------- */\nasync function loadMy() {\n  const box = $(\"#myList\");\n  if (!inTg) return box.innerHTML = `<div class=\"empty\">Ilovani bot orqali oching.</div>`;\n  const j = await api(\"api/my\");\n  if (j.error) return box.innerHTML = `<div class=\"empty\">${esc(j.error)}</div>`;\n  if (!j.items.length) return box.innerHTML = `<div class=\"empty\">Hali e'lon bermagansiz. «E'lon» bo'limidan boshlang.</div>`;\n  box.innerHTML = \"\";\n  j.items.forEach(it => {\n    const el = document.createElement(\"div\");\n    el.className = \"mine\";\n    const acts = it.status !== \"published\" ? \"\" : [\n      it.kind === \"hadya\" ? `<button data-s=\"given\">Berildi</button>` : \"\",\n      it.kind === \"sotuv\" ? `<button data-s=\"sold\">Sotildi</button>` : \"\",\n      `<button data-s=\"closed\">Dolzarb emas</button>`].join(\"\");\n    el.innerHTML = `${thumb(it.thumb)}</div>\n      <div class=\"body\"><div class=\"t\">#${it.id} · ${esc(it.title)}</div>\n      <span class=\"st ${it.status}\">${esc(it.status_text)}</span> <small class=\"sub\">${KIND[it.kind]}</small>\n      ${it.status === \"rejected\" && it.reject_reason ? `<div class=\"sub\">Sabab: ${esc(it.reject_reason)}</div>` : \"\"}\n      ${it.status === \"awaiting_payment\" ? `<div class=\"sub\">${esc(CONFIG.price_text)} o'tkazib, chek rasmini botga yuboring</div>` : \"\"}\n      ${it.status === \"pending\" ? `<div class=\"sub\">Natija haqida bot xabar beradi</div>` : \"\"}\n      <div class=\"acts\">${acts}</div></div>`;\n    el.querySelectorAll(\".acts button\").forEach(b => b.onclick = async () => {\n      const label = {given:\"Berildi\", sold:\"Sotildi\", closed:\"Dolzarb emas\"}[b.dataset.s];\n      if (!await ask(`E'lonni «${label}» deb belgilaysizmi? Kanaldagi postdan kontaktlaringiz olib tashlanadi.`)) return;\n      const r = await api(`api/my/${it.id}/close`, {method:\"POST\", headers:{\"Content-Type\":\"application/json\"}, body: JSON.stringify({status: b.dataset.s})});\n      if (r.ok) { haptic(\"success\"); loadMy(); } else say(r.error);\n    });\n    box.append(el);\n  });\n}\n\n/* ---------- statistika ---------- */\nlet STATS = null;\nfunction setSticker(s) {\n  if (!s || s.error) return;\n  $(\"#heroCount\").textContent = s.given; $(\"#heroSticker\").hidden = !s.given;\n}\nasync function loadStats() {\n  const s = STATS = await api(\"api/stats\");\n  if (s.error) return $(\"#statsBox\").innerHTML = `<div class=\"empty\">${esc(s.error)}</div>`;\n  setSticker(s);\n  const max = Math.max(1, ...s.top_regions.map(r => r.n));\n  $(\"#statsBox\").innerHTML = `\n    <div class=\"bigstat\"><div class=\"ring\"><b>${s.given}</b><span>mushuk</span></div><p>hadya orqali yangi uy topdi</p></div>\n    <div class=\"kpis\">\n      <div class=\"kpi\"><div class=\"n\">${s.given_month}</div><div class=\"l\">shu oyda berildi</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.sold}</div><div class=\"l\">sotildi</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.active_hadya}</div><div class=\"l\">hozir hadyada</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.users}</div><div class=\"l\">foydalanuvchi</div></div>\n    </div>\n    ${s.top_regions.length ? `<div class=\"box\"><h2>Eng faol hududlar</h2>${s.top_regions.map(r =>\n      `<div class=\"bar\"><div class=\"row\"><span>${esc(r.region)}</span><b>${r.n}</b></div><div class=\"track\"><div class=\"fill\" style=\"width:${r.n / max * 100}%\"></div></div></div>`).join(\"\")}</div>` : \"\"}`;\n}\n\n/* ---------- AI savol-javob ---------- */\nlet ME = {is_admin:false, ai_left:5, ai_limit:5, ai_on:true}, chatHistory = [], asking = false;\nfunction refreshAiLeft() {\n  $(\"#aiLeft\").textContent = !ME.ai_on ? \"AI hali ulanmagan\" : ME.is_admin ? \"Admin: cheklovsiz\" : `Bugun ${ME.ai_left} ta savol qoldi`;\n}\n// AI javobidagi @username'larni bosiladigan havolaga aylantiradi\nfunction linkify(text) {\n  return esc(text).replace(/(^|[^\\w@])@([A-Za-z][A-Za-z0-9_]{3,31})\\b/g,\n    (m, pre, u) => `${pre}<a href=\"https://t.me/${u}\" data-tg=\"${u}\">@${u}</a>`);\n}\nfunction bubble(text, who) {\n  const d = document.createElement(\"div\");\n  d.className = \"bubble \" + who;\n  if (who === \"ai\") d.innerHTML = linkify(text); else d.textContent = text;\n  $(\"#chat\").append(d); d.scrollIntoView({behavior:\"smooth\", block:\"end\"});\n  return d;\n}\nasync function askAI(question) {\n  question = question.trim();\n  if (asking || question.length < 3) return;\n  if (!inTg) return $(\"#askErr\").textContent = \"Savol berish uchun ilovani bot orqali oching.\";\n  asking = true; $(\"#askBtn\").disabled = true; $(\"#askErr\").textContent = \"\"; $(\"#suggest\").hidden = true;\n  bubble(question, \"me\"); $(\"#q\").value = \"\"; autoGrow();\n  const wait = bubble(\"Javob yozilmoqda…\", \"ai wait\");\n  const j = await api(\"api/ask\", {method:\"POST\", headers:{\"Content-Type\":\"application/json\"}, body: JSON.stringify({question, history: chatHistory})});\n  wait.remove();\n  if (j.ok) {\n    bubble(j.answer, \"ai\");\n    chatHistory.push({role:\"user\", content:question}, {role:\"assistant\", content:j.answer});\n    chatHistory = chatHistory.slice(-6);\n    ME.ai_left = j.left; haptic(\"success\");\n  } else {\n    $(\"#askErr\").textContent = j.error || \"Xatolik yuz berdi.\";\n    if (!chatHistory.length && !$(\"#chat\").children.length) $(\"#suggest\").hidden = false;\n  }\n  refreshAiLeft(); asking = false; $(\"#askBtn\").disabled = false;\n}\nconst autoGrow = () => { const t = $(\"#q\"); t.style.height = \"auto\"; t.style.height = Math.min(t.scrollHeight, 120) + \"px\"; };\n$(\"#q\").addEventListener(\"input\", autoGrow);\n$(\"#q\").addEventListener(\"keydown\", e => { if (e.key === \"Enter\" && !e.shiftKey) { e.preventDefault(); askAI($(\"#q\").value); } });\n$(\"#askForm\").onsubmit = e => { e.preventDefault(); askAI($(\"#q\").value); };\n$$(\"#suggest button\").forEach(b => b.onclick = () => askAI(b.textContent));\n\n/* ---------- admin panel ---------- */\nasync function loadAdmin() {\n  const j = await api(\"api/admin/overview\");\n  if (j.error) return $(\"#adminBox\").innerHTML = `<div class=\"empty\">${esc(j.error)}</div>`;\n  const c = j.counts, n = k => c[k] || 0;\n  const kpi = (v, l, alert) => `<div class=\"kpi${alert && v ? \" alert\" : \"\"}\"><div class=\"n\">${v}</div><div class=\"l\">${l}</div></div>`;\n  const q = j.queue.map(it => `<div class=\"q\">${thumb(it.thumb)}</div>\n    <div class=\"body\"><div class=\"t\">#${it.id} · ${esc(it.title)}</div>\n    <span class=\"st ${it.status}\">${esc(it.status_text)}</span> <small class=\"sub\">${KIND[it.kind]} · ${esc(it.district || it.region)} · ${it.hours ? it.hours + \" soat oldin\" : \"hozirgina\"}</small>\n    ${it.user ? `<div class=\"sub\">${esc(it.user)}</div>` : \"\"}</div></div>`).join(\"\");\n  $(\"#adminBox\").innerHTML = `\n    <div class=\"kpis\">\n      ${kpi(n(\"pending\"), \"admin tekshiruvini kutmoqda\", true)}\n      ${kpi(n(\"payment_review\"), \"chek tekshiruvini kutmoqda\", true)}\n      ${kpi(n(\"awaiting_payment\"), \"to'lov kutilmoqda\")}\n      ${kpi(j.today, \"oxirgi 24 soatda yangi\")}\n      ${kpi(n(\"published\"), \"kanalda faol\")}\n      ${kpi(n(\"given\"), \"berildi\")}\n      ${kpi(n(\"sold\"), \"sotildi\")}\n      ${kpi(j.users, \"foydalanuvchi\")}\n    </div>\n    <div class=\"box\"><h2>Navbatdagilar</h2>\n      ${q ? `<div class=\"queue\">${q}</div><p class=\"sub\" style=\"margin:8px 0 0\">Tasdiqlash bot chatidagi tugmalar orqali qilinadi.</p>` : `<p class=\"sub\" style=\"margin:0\">Hozir kutayotgan e'lon yo'q.</p>`}\n    </div>\n    ${j.ai_on ? \"\" : `<div class=\"warn\">${ICON.warn}<span>AI savol-javob o'chiq. Cloudflare'da OPENAI_API_KEY qo'shilsa yoqiladi.</span></div>`}`;\n  $(\"#sPrice\").value = j.settings.price; $(\"#sCard\").value = j.settings.card; $(\"#sOwner\").value = j.settings.card_owner;\n}\n$(\"#saveSettings\").onclick = async () => {\n  const r = await api(\"api/admin/settings\", {method:\"POST\", headers:{\"Content-Type\":\"application/json\"},\n    body: JSON.stringify({price: $(\"#sPrice\").value, card: $(\"#sCard\").value, card_owner: $(\"#sOwner\").value})});\n  if (r.ok) { haptic(\"success\"); CONFIG.price_text = r.price_text; $$(\".js-price\").forEach(e => e.textContent = r.price_text); say(\"Saqlandi\"); }\n  else say(r.error);\n};\n\ndocument.addEventListener(\"click\", e => {\n  const a = e.target.closest(\"a[data-tg]\");\n  if (a) { e.preventDefault(); openTg(\"https://t.me/\" + a.dataset.tg); return; }\n  if (e.target.closest(\"[data-admin]\") && CONFIG.admin) openTg(\"https://t.me/\" + CONFIG.admin);\n});\n\n/* ---------- ishga tushirish ---------- */\n(async () => {\n  if (inTg) {\n    tg.ready(); tg.expand();\n    tg.MainButton.setParams({color: \"#FFD84A\", text_color: \"#12123A\"});\n    try { tg.setBackgroundColor(\"#F4F1EA\"); tg.setBottomBarColor?.(\"#F4F1EA\"); } catch {}\n    headerColor(\"#2D46F0\");\n  } else $(\"#outside\").hidden = false;\n  const [regions, config, stats] = await Promise.all([\n    fetch(\"regions.json\").then(r => r.json()).catch(() => []), api(\"api/config\"), api(\"api/stats\")]);\n  REGIONS = regions; if (config.price_text) CONFIG = config;\n  setSticker(stats);\n  fillRegions($(\"#fRegion\"), \"Barcha hududlar\");\n  fillRegions($(\"#region\"), \"Tanlang…\");\n  $$(\".js-price\").forEach(e => e.textContent = CONFIG.price_text);\n  $$(\".js-admin\").forEach(e => e.hidden = !CONFIG.admin);\n  $(\"#tg_username\").value = myUsername();\n  search();\n  // Ulashilgan e'lon: bot tugmasi #l123 bilan ochadi; t.me/<bot>/<app>?startapp=l123 bo'lsa start_param keladi\n  const shared = (location.hash.match(/^#l(\\d+)$/) || String(tg?.initDataUnsafe?.start_param || \"\").match(/^l(\\d+)$/) || [])[1];\n  if (shared) openDetail(+shared);\n  if (inTg) {\n    const me = await api(\"api/me\");\n    if (!me.error) ME = me;\n    $(\"#navAdmin\").hidden = !ME.is_admin;\n    if (ME.is_admin && location.hash === \"#admin\") show(\"admin\");\n  }\n  refreshAiLeft();\n})();\n</script>\n</body>\n</html>\n";
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
const DAY = 86400;
const CHECK_DAYS = 30; // shuncha kundan keyin egasidan «Hali dolzarbmi?» deb so'raladi
const ANSWER_DAYS = 3; // javob bo'lmasa, shuncha kundan keyin «Dolzarb emas» deb yopiladi
const PAY_REMIND_HOURS = 24; // to'lov muddati tugashiga shuncha soat qolganda eslatma
const ADMIN_REMIND_HOURS = 6; // admin shuncha soatdan beri ko'rmagan e'lonlar haqida eslatma
const TEMP_KEEP_DAYS = 2; // vaqtinchalik sozlamalar (albom, chek tanlovi) shuncha kun saqlanadi
// Shu holatdagi e'lonlar hammaga ochiq (ilovada ko'rinadi)
const PUBLIC_STATUSES = ["published", "given", "sold", "closed"];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, first_name TEXT,
     banned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS listings (
     id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, username TEXT, first_name TEXT,
     kind TEXT NOT NULL, region TEXT NOT NULL, district TEXT NOT NULL,
     data TEXT NOT NULL, media TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'pending',
     reject_reason TEXT, price_due INTEGER, pay_deadline INTEGER, receipt_file_id TEXT,
     channel_msg_id INTEGER, channel_username TEXT,
     created_at INTEGER NOT NULL, published_at INTEGER, closed_at INTEGER, admin_msgs TEXT, pay_msgs TEXT)`,
  `CREATE TABLE IF NOT EXISTS ai_usage (user_id INTEGER NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day))`,
  `CREATE TABLE IF NOT EXISTS reports (listing_id INTEGER NOT NULL, user_id INTEGER NOT NULL, reason TEXT,
     created_at INTEGER NOT NULL, PRIMARY KEY (listing_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS ix_status ON listings(status, region, district)`,
  `CREATE INDEX IF NOT EXISTS ix_user ON listings(user_id)`,
];
// Eski bazaga yangi ustunlar qo'shish (bor bo'lsa xato beradi — e'tiborsiz qoldiriladi)
const MIGRATIONS = [
  "ALTER TABLE listings ADD COLUMN admin_msgs TEXT",
  "ALTER TABLE listings ADD COLUMN pay_msgs TEXT",
  "ALTER TABLE listings ADD COLUMN check_at INTEGER", // keyingi «Hali dolzarbmi?» savoli vaqti
  "ALTER TABLE listings ADD COLUMN asked_at INTEGER", // savol yuborilgan vaqt (javob kutilmoqda)
  "ALTER TABLE listings ADD COLUMN pay_reminded INTEGER", // to'lov eslatmasi yuborilganmi
  "ALTER TABLE settings ADD COLUMN updated_at INTEGER", // vaqtinchalik yozuvlarni tozalash uchun
];
// Sxema o'zgarsa shu raqam oshiriladi — shunda migratsiyalar bir marta qayta ishga tushadi
const SCHEMA_VERSION = "2";
let schemaReady = false;
async function ensureSchema(env, force = false) {
  if ((schemaReady && !force) || !env.DB) return;
  if (!force) {
    const v = await env.DB.prepare("SELECT value FROM settings WHERE key='schema_v'").first("value").catch(() => null);
    if (v === SCHEMA_VERSION) return void (schemaReady = true);
  }
  try {
    await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  } catch (e) {
    console.log("Sxema:", e.message);
  }
  for (const q of MIGRATIONS) await env.DB.prepare(q).run().catch(() => {});
  await setSetting(env, "schema_v", SCHEMA_VERSION).catch((e) => console.log("Sxema versiyasi:", e.message));
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
  if (!p) return "";
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
// value === null bo'lsa yozuv o'chiriladi (bo'sh qatorlar bazada to'planib qolmasin)
async function setSetting(env, key, value) {
  if (value === null || value === undefined) {
    await env.DB.prepare("DELETE FROM settings WHERE key=?").bind(key).run();
    return;
  }
  await env.DB.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?,?,?) " +
    "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
  ).bind(key, String(value), now()).run();
}
const getPrice = async (env) => parseInt(await getSetting(env, "price", DEFAULT_PRICE), 10);

async function upsertUser(env, u) {
  await env.DB.prepare(
    "INSERT INTO users (id, username, first_name, created_at) VALUES (?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name"
  ).bind(u.id, u.username || null, u.first_name || null, now()).run();
}
// "123456789" yoki "@username" bo'yicha foydalanuvchini topadi (u botga kamida bir marta yozgan bo'lishi kerak)
async function findUser(env, who) {
  const s = String(who || "").trim();
  if (/^\d+$/.test(s)) return env.DB.prepare("SELECT * FROM users WHERE id=?").bind(+s).first();
  const name = cleanUsername(s);
  if (!name) return null;
  return env.DB.prepare("SELECT * FROM users WHERE lower(username)=lower(?)").bind(name).first();
}
const isBanned = async (env, id) =>
  !!(await env.DB.prepare("SELECT banned FROM users WHERE id=?").bind(id).first("banned"));

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
    // Kontakt: foydalanuvchi qaysi birini kiritgan bo'lsa, faqat o'shasi chiqadi
    if (l.username) lines.push(`🌎 Telegram: @${esc(l.username)}`);
    if (d.phone) lines.push(`📞 ${fmtPhone(d.phone)}`);
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
// "" → "" (kiritilmagan), noto'g'ri → false, to'g'ri → "username" (@ belgisisiz).
// t.me/username havolasi yozilsa ham qabul qilinadi.
function cleanUsername(raw) {
  const s = String(raw || "").trim().replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "");
  if (!s) return "";
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) ? s : false;
}

function cleanForm(form) {
  const g = (k, n = 80) => String(form.get(k) ?? "").trim().slice(0, n);
  const kind = g("kind", 10);
  if (!KINDS[kind]) return "E'lon turini tanlang.";
  const region = g("region"), district = g("district");
  const r = findRegion(region);
  if (!r) return "Hududni tanlang.";
  if (!r.d.some((x) => x[0] === district)) return "Tuman yoki shaharni tanlang.";
  // Kontakt: telefon va Telegram username ixtiyoriy, lekin kamida bittasi bo'lishi shart
  let phone = g("phone", 25).replace(/\D/g, "");
  if (phone === "998") phone = ""; // faqat "+998 " qolgan bo'lsa — kiritilmagan hisoblanadi
  if (phone && !/^998\d{9}$/.test(phone)) return "Telefon raqam +998 XX XXX XX XX ko'rinishida bo'lsin.";
  const username = cleanUsername(g("tg_username", 40));
  if (username === false) return "Telegram username noto'g'ri. Masalan: @ism_familiya (5–32 ta lotin harf, raqam yoki _).";
  if (!phone && !username) return "Telefon raqam yoki Telegram username'dan kamida bittasini yozing.";
  const data = { phone: phone ? "+" + phone : null, contact_username: username || null };

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
const appKb = (origin, hash = "", text = "📱 Ilovani ochish") =>
  ({ inline_keyboard: [[{ text, web_app: { url: origin + "/" + (hash ? "#" + hash : "") } }]] });
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
  const header = `🆕 <b>${KIND_NAMES[l.kind]}</b> e'lon #${l.id} — ${esc(l.region)}, ${esc(l.district)}\n` +
    `👤 <a href="tg://user?id=${l.user_id}">${esc(l.first_name || "Foydalanuvchi")}</a> (ID: <code>${l.user_id}</code>)`;
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
    check_at: now() + CHECK_DAYS * DAY, asked_at: null,
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
    // Kanaldan import qilingan post: asl matn va formatlash saqlanadi, faqat kontakt qatorlari almashtiriladi
    const isCap = l.media.length > 0;
    const { text, entities } = closedRaw(l, status, isCap ? 1024 : 4096);
    await tgSafe(env, isCap ? "editMessageCaption" : "editMessageText", {
      chat_id: env.CHANNEL, message_id: l.channel_msg_id, [isCap ? "caption" : "text"]: text,
      ...(entities.length ? { [isCap ? "caption_entities" : "entities"]: entities } : {}),
    });
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

// Import qilingan postning asl matnidan kontakt qatorlarini olib tashlaydi (o'rniga `label` qo'yiladi).
// Formatlash (qalin yozuv, havolalar) ham saqlanadi: Telegram uni matndan alohida "entities" ro'yxatida
// beradi — har biri "shu joydan (offset) shuncha belgi (length) qalin" degan ma'lumot. Qatorlar
// o'chirilganda matn suriladi, shuning uchun har bir entity'ning joyi qayta hisoblanadi.
function stripContacts(l, label, limit) {
  const own = l.username ? "@" + l.username.toLowerCase() : null;
  const isContact = (ln) => {
    const n = normTxt(ln);
    if (/telegram|telefon|📞|☎|\btel\b/.test(n)) return true;
    if (own && n.includes(own)) return true;
    return ln.replace(/\D/g, "").length >= 9 && !/narx|som|sum|\$/.test(n);
  };
  const lines = String(l.data.raw).split("\n");
  let out = "";
  let pos = 0; // asl matndagi joriy o'rin
  let placed = !label;
  const segs = []; // saqlangan bo'laklar: [asl boshi, asl oxiri, yangi boshi]
  lines.forEach((ln, i) => {
    const piece = ln + (i < lines.length - 1 ? "\n" : "");
    if (isContact(ln)) {
      if (!placed) out += label + (piece.endsWith("\n") ? "\n" : "");
      placed = true;
    } else {
      const last = segs.at(-1);
      // ketma-ket saqlangan qatorlar bitta bo'lak (bir necha qatorli qalin yozuv ham saqlansin)
      if (last && last[1] === pos && last[2] + (last[1] - last[0]) === out.length) last[1] += piece.length;
      else segs.push([pos, pos + piece.length, out.length]);
      out += piece;
    }
    pos += piece.length;
  });
  if (!placed) out += "\n\n" + label;
  const text = out.replace(/\n+$/, "").slice(0, limit);
  const entities = [];
  for (const e of Array.isArray(l.data.entities) ? l.data.entities : []) {
    const seg = segs.find(([a, b]) => a <= e.offset && e.offset + e.length <= b);
    if (!seg) continue; // kontakt qatoriga tegishli formatlash — tashlab yuboriladi
    const offset = seg[2] + (e.offset - seg[0]);
    if (offset + e.length <= text.length) entities.push({ ...e, offset });
  }
  return { text, entities };
}
const CLOSED_RAW_LABEL = { given: "✅ Berildi", sold: "✅ Sotildi", closed: "⛔️ E'lon dolzarb emas" };
const closedRaw = (l, status, limit = 1024) => stripContacts(l, CLOSED_RAW_LABEL[status], limit);

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
  // Formatlash (qalin, havola...) saqlanadi — e'lon yopilganda kanaldagi post shu bilan qayta yoziladi
  const ents = m.caption_entities || m.entities;
  if (ents?.length) p.data.entities = ents;
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
      // Ulashilgan havola: t.me/<bot>?start=l123 → ilova shu e'lonni ochadi
      const shared = args.match(/^l(\d+)$/);
      if (shared) {
        const l = await getListing(env, +shared[1]);
        if (l && PUBLIC_STATUSES.includes(l.status)) {
          return reply(`🐾 ${KIND_NAMES[l.kind]}: ${shortTitle(l)}\n📍 ${placeText(l)}\n\nE'lonni ko'rish uchun tugmani bosing 👇`,
            { reply_markup: appKb(origin, "l" + l.id, "🐱 E'lonni ochish") });
        }
      }
      let t = "Assalomu alaykum! 🐾\n\nBu yerda mushukni hadyaga berish (bepul), sotish yoki reklama joylash uchun " +
        "e'lon berasiz va hududingizdagi mushuklarni qidirasiz.\n\nPastdagi tugmani bosing 👇";
      return reply(t, { reply_markup: appKb(origin) });
    }
    if (isAdmin(env, u.id)) {
      if (cmd === "/ban" || cmd === "/unban") {
        const ban = cmd === "/ban";
        const [who, ...why] = args.split(/\s+/);
        const target = await findUser(env, who);
        if (!target) return reply(`Foydalanuvchi topilmadi. Masalan:\n${cmd} 123456789\n${cmd} @username`);
        if (ban && isAdmin(env, target.id)) return reply("Adminni ban qilib bo'lmaydi.");
        await env.DB.prepare("UPDATE users SET banned=? WHERE id=?").bind(ban ? 1 : 0, target.id).run();
        const name = target.username ? "@" + target.username : target.first_name || target.id;
        return reply(ban
          ? `🚫 ${name} (ID ${target.id}) ban qilindi${why.length ? ": " + why.join(" ") : ""}.\n` +
            "Endi u e'lon bera olmaydi, shikoyat va AI savol yubora olmaydi. Kanaldagi faol e'lonlari o'zgarmaydi."
          : `✅ ${name} (ID ${target.id}) bandan chiqarildi.`);
      }
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
    "/oddiy — rejimni o'chirish\n" +
    "/ban 123456789 yoki /ban @username — foydalanuvchini bloklash\n" +
    "/unban 123456789 — blokdan chiqarish\n\n" +
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

  // E'lon egasi: «Hali dolzarbmi?» savoliga javob
  if (ns === "u") {
    const l = await getListing(env, Number(idStr));
    if (!l || l.user_id !== cq.from.id) return answer("E'lon topilmadi.", true);
    if (l.status !== S.PUBLISHED) {
      await setKb(null);
      return answer("Bu e'lon allaqachon yopilgan.", true);
    }
    if (a === "keep") {
      await updateListing(env, l.id, { check_at: now() + CHECK_DAYS * DAY, asked_at: null });
      await edit(chat, mid, `👍 #${l.id} e'loni faol qoldi. ${CHECK_DAYS} kundan keyin yana so'raymiz.`);
      return answer("Faol qoldi");
    }
    if (!["given", "sold", "closed"].includes(a)) return answer();
    if (!(await closeListing(env, l, a))) return answer("Holati allaqachon o'zgargan.", true);
    await edit(chat, mid, `${CLOSED_REPLY[a]}: #${l.id} yopildi, kanaldagi postdan kontaktlaringiz olib tashlandi. Rahmat! 🐾`);
    return answer("Belgilandi");
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
    // Shikoyat xabaridagi tugmalar
    if (a === "ignore") {
      await done(`👌 #${id} bo'yicha shikoyat ko'rib chiqildi, o'zgarish qilinmadi — ${who}`);
      return answer();
    }
    if (a === "ban") {
      if (!l.user_id) return answer("Bu e'lon kanaldan import qilingan, egasi botda yo'q.", true);
      if (isAdmin(env, l.user_id)) return answer("Adminni ban qilib bo'lmaydi.", true);
      await env.DB.prepare("UPDATE users SET banned=1 WHERE id=?").bind(l.user_id).run();
      await setKb(adminManageKb(l)); // ban tugmasi yo'qoladi, e'lonni yopish tugmalari qoladi
      await tgSafe(env, "sendMessage", { chat_id: chat, text: `🚫 #${id} egasi (ID ${l.user_id}) ban qilindi — ${who}` });
      return answer("Ban qilindi");
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
// Yopiq e'lon (admin tekshiruvida, to'lov kutilmoqda...) rasmini faqat egasi va admin ko'radi.
// Ular uchun rasm manzili oxiriga maxfiy kalit (k=...) qo'shiladi. Kalitni faqat server yasay oladi
// (BOT_TOKEN asosida), shuning uchun begona odam /api/media/5/0 deb terib, rasmni ocha olmaydi.
async function mediaKey(env, id) {
  return hex(await hmacRaw(new TextEncoder().encode("media:" + env.BOT_TOKEN), String(id))).slice(0, 24);
}
function card(l, key = "") {
  const first = l.media[0];
  // Videoning kichik rasmi (thumbnail) bo'lmasa, kartada rasm o'rniga belgi chiqadi
  const hasThumb = first && (first.type === "photo" || first.thumb);
  return {
    id: l.id, kind: l.kind, title: shortTitle(l), region: l.region, district: l.district,
    price: priceText(l), thumb: hasThumb ? `api/media/${l.id}/0?thumb=1${key ? "&k=" + key : ""}` : null,
    status: l.status, status_text: STATUS_TEXT[l.status] || l.status, reject_reason: l.reject_reason || null,
    published_at: l.published_at || null,
  };
}
// Ochiq bo'lmagan e'lonlar uchun kalit qo'shib karta yasaydi
const privateCard = async (env, l) => card(l, PUBLIC_STATUSES.includes(l.status) ? "" : await mediaKey(env, l.id));

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

async function apiDetail(env, request, id) {
  const l = await getListing(env, id);
  if (!l || !PUBLIC_STATUSES.includes(l.status)) return err("E'lon topilmadi", 404);
  const d = l.data;
  const open = l.status === S.PUBLISHED;
  // Kontaktlar (telefon, username) faqat Telegram ichidan ochilgan ilovaga beriladi —
  // shunda skript bilan barcha raqamlarni yig'ib olib bo'lmaydi
  const viewer = open ? await authUser(env, request.headers.get("x-init-data")) : null;
  let rows, text = null;
  if (d.imported) {
    // Kanaldan import qilingan: asl post matni ko'rsatiladi (yopilgan bo'lsa yoki ko'ruvchi noma'lum bo'lsa — kontaktlarsiz)
    rows = [["Narxi", priceText(l)], ["Manzil", placeText(l)]];
    const body = open && viewer ? d.raw
      : open ? stripContacts(l, null, 4096).text
      : closedRaw(l, l.status === S.SOLD ? "sold" : l.status === S.CLOSED ? "closed" : "given", 4096).text;
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
    contact: hasContact && viewer ? { username: l.username, phone: d.phone ? fmtPhone(d.phone) : null } : null,
    contact_hidden: !!(hasContact && !viewer), // kontakt bor, lekin ko'rish uchun ilovani bot orqali ochish kerak
    mine: !!(viewer && viewer.id === l.user_id),
  });
}

// Shikoyat: foydalanuvchi e'lonni adminlarga yuboradi (bitta e'longa bir kishi bir marta)
const REPORT_REASONS = {
  scam: "Firibgarlik / oldindan pul so'rayapti",
  sold: "Mushuk allaqachon berilgan yoki sotilgan",
  wrong: "Ma'lumot noto'g'ri (narx, tur, joy)",
  other: "Boshqa sabab",
};
async function apiReport(env, request, id) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Shikoyat qilish uchun ilovani bot orqali oching.", 401);
  if (await isBanned(env, user.id)) return err("Sizga bu amal cheklangan.", 403);
  const l = await getListing(env, id);
  if (!l || l.status !== S.PUBLISHED) return err("E'lon topilmadi.", 404);
  if (l.user_id === user.id) return err("O'z e'loningizga shikoyat qilib bo'lmaydi.");
  const b = await request.json().catch(() => ({}));
  const reason = REPORT_REASONS[b.reason] ? b.reason : "other";
  const note = String(b.note || "").trim().slice(0, 300);
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO reports (listing_id, user_id, reason, created_at) VALUES (?,?,?,?)")
    .bind(id, user.id, reason + (note ? ": " + note : ""), now()).run();
  if (ins.meta.changes !== 1) return err("Bu e'longa allaqachon shikoyat yuborgansiz. Rahmat!");
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE listing_id=?").bind(id).first("n");
  const from = user.username ? "@" + esc(user.username) : esc(user.first_name || "Foydalanuvchi");
  const link = l.channel_username ? `\nhttps://t.me/${l.channel_username}/${l.channel_msg_id}` : "";
  const text = `🚩 <b>Shikoyat</b>: e'lon #${id} (${KIND_NAMES[l.kind]}, ${esc(placeText(l))})${link}\n` +
    `Sabab: ${esc(REPORT_REASONS[reason])}${note ? "\nIzoh: " + esc(note) : ""}\n` +
    `Kimdan: ${from} (<code>${user.id}</code>)\nBu e'longa jami shikoyatlar: ${total}`;
  const kb = adminManageKb(l);
  kb.inline_keyboard.push([
    ...(l.user_id ? [{ text: "🚫 Egasini ban qilish", callback_data: `a:ban:${id}` }] : []),
    { text: "👌 E'tiborsiz qoldirish", callback_data: `a:ignore:${id}` },
  ]);
  for (const admin of adminIds(env)) {
    await tgSafe(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", reply_markup: kb, disable_web_page_preview: true });
  }
  return json({ ok: true });
}

// Telegram faylining yuklab olish manzili (file_path) kamida 1 soat amal qiladi. Har safar getFile
// so'ramaslik uchun xotirada 50 daqiqa saqlanadi (Worker bir necha so'rovni bitta nusxada bajaradi).
const filePathMemo = new Map();
async function telegramFilePath(env, fileId) {
  const hit = filePathMemo.get(fileId);
  if (hit && hit.until > Date.now()) return hit.path;
  const f = await tg(env, "getFile", { file_id: fileId });
  if (filePathMemo.size > 500) filePathMemo.clear();
  filePathMemo.set(fileId, { path: f.file_path, until: Date.now() + 50 * 60e3 });
  return f.file_path;
}

// Telegram'dagi rasm/videoni ilovaga uzatadi (token foydalanuvchiga ko'rinmaydi)
async function apiMedia(env, request, ctx, url, id, idx) {
  const thumb = url.searchParams.get("thumb") === "1";
  const l = await getListing(env, id);
  if (!l || idx >= l.media.length) return new Response("Topilmadi", { status: 404 });
  // Ochiq bo'lmagan e'lon rasmi faqat to'g'ri kalit bilan beriladi (egasi va admin uchun)
  const isPublic = PUBLIC_STATUSES.includes(l.status);
  if (!isPublic && url.searchParams.get("k") !== (await mediaKey(env, id))) return new Response("Topilmadi", { status: 404 });
  const m = l.media[idx];
  // Videoning thumbnail'i bo'lmasa, butun videoni "rasm" deb yubormaymiz
  if (thumb && m.type === "video" && !m.thumb) return new Response("Topilmadi", { status: 404 });
  const isVideo = m.type === "video" && !thumb;

  // Rasmlar Cloudflare keshida saqlanadi: keyingi ko'rishlarda Telegram'ga umuman murojaat qilinmaydi.
  // (Faqat ochiq e'lonlar; kalit kesh manziliga kirmaydi — tekshiruv yuqorida bo'ldi.)
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/__media/${id}/${idx}/${thumb ? "t" : "f"}/${m.file_id.slice(-16)}`);
  if (cache && !isVideo && isPublic) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const fileId = thumb ? m.thumb || m.file_id : m.file_id;
  let path;
  try {
    path = await telegramFilePath(env, fileId);
  } catch {
    return new Response("Fayl katta yoki topilmadi", { status: 404 });
  }
  const headers = {};
  const range = request.headers.get("range");
  if (isVideo && range) headers.range = range;
  const base = env.TG_API || "https://api.telegram.org";
  const up = await fetch(`${base}/file/bot${env.BOT_TOKEN}/${path}`, { headers });
  if (!up.ok) {
    filePathMemo.delete(fileId);
    return new Response("Topilmadi", { status: 404 });
  }
  const h = new Headers({
    "content-type": isVideo ? "video/mp4" : "image/jpeg",
    // yopiq e'lon rasmi umumiy keshlarda saqlanmasin
    "cache-control": isPublic ? "public, max-age=604800" : "private, max-age=3600",
  });
  for (const k of ["content-length", "content-range", "accept-ranges"]) if (up.headers.get(k)) h.set(k, up.headers.get(k));
  const res = new Response(up.body, { status: up.status, headers: h });
  if (cache && !isVideo && isPublic && up.status === 200) ctx.waitUntil(cache.put(cacheKey, res.clone()).catch(() => {}));
  return res;
}

async function apiMy(env, request) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Ilovani bot orqali oching.", 401);
  const { results } = await env.DB.prepare("SELECT * FROM listings WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(user.id).all();
  return json({ items: await Promise.all(results.map((r) => privateCard(env, parseRow(r)))) });
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
  if (await isBanned(env, user.id)) return err("Sizga e'lon berish cheklangan.", 403);

  const res = cleanForm(form);
  if (typeof res === "string") return err(res);
  const { kind, region, district, data } = res;
  // Postda ko'rsatiladigan username — foydalanuvchi formaga yozgani (Telegram profilidagi emas)
  const contactUsername = data.contact_username;
  delete data.contact_username;

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
  ).bind(user.id, contactUsername, user.first_name || null, kind, region, district, JSON.stringify(data), now()).run();
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
  { command: "ban", description: "Foydalanuvchini bloklash: /ban ID yoki @username" },
  { command: "unban", description: "Blokdan chiqarish" },
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
    queue: await Promise.all(queue.map(async (r) => {
      const l = parseRow(r);
      return { ...(await privateCard(env, l)), user: l.username ? "@" + l.username : l.first_name || "", hours: Math.floor((now() - l.created_at) / 3600) };
    })),
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
  if (await isBanned(env, user.id)) return err("Sizga bu bo'lim cheklangan.", 403);
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
    await ensureSchema(env, true);
    await env.DB.prepare("SELECT admin_msgs, pay_msgs, check_at FROM listings LIMIT 1").all();
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
      // drop_pending_updates: false — navbatda turgan xabarlar o'chib ketmasin
      allowed_updates: ["message", "callback_query", "channel_post"], drop_pending_updates: false,
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

// /setup kalitini tekshirish. Ikkala qiymatning SHA-256 xeshi solishtiriladi — shunda javob vaqtiga
// qarab kalitni harfma-harf taxmin qilib bo'lmaydi.
async function setupKeyOk(env, given) {
  if (!env.SETUP_KEY || !given) return false;
  const h = async (s) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s))));
  return (await h(given)) === (await h(env.SETUP_KEY));
}
const setupLocked = (env) => setupPage([["bad", env.SETUP_KEY
  ? "Kalit noto'g'ri. Manzilni shunday oching: /setup?key=SIZNING_KALITINGIZ"
  : "Xavfsizlik uchun avval Cloudflare'da SETUP_KEY (Secret) qo'shing: Worker → Settings → Variables and Secrets. " +
    "Qiymati — o'zingiz o'ylab topgan uzun so'z (masalan 20+ tasodifiy harf/raqam). Keyin /setup?key=SHU_SOZ ni oching."]]);

// ---------------------------------------------------------------- fon vazifalari (cron, har soatda)
const sendTo = (env, chatId, text, extra = {}) => tgSafe(env, "sendMessage", { chat_id: chatId, text, ...extra });

async function expirePayments(env) {
  const { results } = await env.DB.prepare("SELECT id, user_id FROM listings WHERE status=? AND pay_deadline<?")
    .bind(S.AWAIT_PAY, now()).all();
  for (const l of results) {
    if (await changeStatus(env, l.id, S.AWAIT_PAY, S.EXPIRED)) {
      await sendTo(env, l.user_id, `⌛️ E'lon #${l.id} uchun to'lov muddati o'tdi, e'lon bekor qilindi. Kerak bo'lsa, qayta yuboring.`);
    }
  }
}

// To'lov muddati tugashiga PAY_REMIND_HOURS qolganda bir marta eslatish
async function remindPayments(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, user_id, price_due, pay_deadline FROM listings WHERE status=? AND pay_deadline<? AND pay_reminded IS NULL"
  ).bind(S.AWAIT_PAY, now() + PAY_REMIND_HOURS * 3600).all();
  const card = await getSetting(env, "card", "");
  const owner = await getSetting(env, "card_owner", "");
  for (const l of results) {
    await updateListing(env, l.id, { pay_reminded: now() });
    const left = Math.max(1, Math.round((l.pay_deadline - now()) / 3600));
    await sendTo(env, l.user_id,
      `⏰ Eslatma: e'lon #${l.id} uchun to'lov muddati tugashiga ${left} soat qoldi.\n\n` +
      `Summa: <b>${fmtSum(l.price_due || (await getPrice(env)))}</b>\nKarta: <code>${esc(card)}</code>\n${esc(owner)}\n\n` +
      "To'lovni qilib, chek rasmini shu botga yuboring.", { parse_mode: "HTML" });
  }
}

// Admin uzoq vaqt ko'rmagan e'lonlar haqida eslatma (har ADMIN_REMIND_HOURS soatda ko'pi bilan bir marta)
async function remindAdmins(env) {
  const last = Number(await getSetting(env, "admin_reminded", 0));
  if (now() - last < ADMIN_REMIND_HOURS * 3600 - 300) return;
  const old = now() - ADMIN_REMIND_HOURS * 3600;
  const [pending, pay] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE status=? AND created_at<?").bind(S.PENDING, old).first("n"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM listings WHERE status=?").bind(S.PAY_REVIEW).first("n"),
  ]);
  if (!pending && !pay) return;
  await setSetting(env, "admin_reminded", now());
  const lines = ["⏰ <b>Ko'rib chiqilmagan e'lonlar bor</b>"];
  if (pending) lines.push(`• ${pending} ta e'lon ${ADMIN_REMIND_HOURS} soatdan ko'p tekshiruv kutmoqda`);
  if (pay) lines.push(`• ${pay} ta to'lov cheki tekshirilmagan`);
  lines.push("", "Tugmalar avvalgi xabarlarda. Ro'yxat: /admin");
  for (const admin of adminIds(env)) await sendTo(env, admin, lines.join("\n"), { parse_mode: "HTML" });
}

// 30 kunlik tekshiruv: egasidan «Hali dolzarbmi?» deb so'raladi; ANSWER_DAYS ichida javob bo'lmasa
// e'lon «Dolzarb emas» deb yopiladi (kanaldagi post ham yangilanadi). Kanaldan import qilingan
// postlarning egasi botda yo'q (user_id = 0), ular bu tekshiruvga kirmaydi.
const stillKb = (l) => ({
  inline_keyboard: [
    [{ text: "👍 Ha, hali dolzarb", callback_data: `u:keep:${l.id}` }],
    [
      ...(l.kind === "hadya" ? [{ text: "✅ Berildi", callback_data: `u:given:${l.id}` }] : []),
      ...(l.kind === "sotuv" ? [{ text: "✅ Sotildi", callback_data: `u:sold:${l.id}` }] : []),
      { text: "⛔️ Dolzarb emas", callback_data: `u:closed:${l.id}` },
    ],
  ],
});
async function checkStale(env) {
  // 1) Javob bermaganlarni yopish
  const { results: overdue } = await env.DB.prepare(
    // LIMIT: Cloudflare bitta ishga tushishda tashqi so'rovlar sonini cheklaydi; qolganlari keyingi soatda
    "SELECT * FROM listings WHERE status=? AND user_id<>0 AND asked_at IS NOT NULL AND asked_at<? LIMIT 10"
  ).bind(S.PUBLISHED, now() - ANSWER_DAYS * DAY).all();
  for (const r of overdue) {
    const l = parseRow(r);
    if (await closeListing(env, l, "closed")) {
      await sendTo(env, l.user_id,
        `⛔️ E'lon #${l.id} (${shortTitle(l)}) ${ANSWER_DAYS} kun javob bo'lmagani uchun «Dolzarb emas» deb yopildi.\n` +
        "Agar mushuk hali uy izlayotgan bo'lsa, ilova orqali yangi e'lon bering.");
    }
  }
  // 2) Muddati kelganlardan so'rash (check_at bo'sh bo'lsa — eski e'lon, joylangan vaqtdan 30 kun hisoblanadi)
  const { results: due } = await env.DB.prepare(
    "SELECT * FROM listings WHERE status=? AND user_id<>0 AND asked_at IS NULL " +
    "AND COALESCE(check_at, published_at + ?) < ? LIMIT 15"
  ).bind(S.PUBLISHED, CHECK_DAYS * DAY, now()).all();
  for (const r of due) {
    const l = parseRow(r);
    await updateListing(env, l.id, { asked_at: now() });
    const link = l.channel_username ? `\nhttps://t.me/${l.channel_username}/${l.channel_msg_id}` : "";
    await sendTo(env, l.user_id,
      `🐾 E'loningiz #${l.id} (${shortTitle(l)}, ${placeText(l)}) ${CHECK_DAYS} kundan beri kanalda turibdi.${link}\n\n` +
      `Hali dolzarbmi? ${ANSWER_DAYS} kun ichida javob bo'lmasa, e'lon «Dolzarb emas» deb yopiladi.`,
      { reply_markup: stillKb(l), disable_web_page_preview: true });
  }
}

// Vaqtinchalik sozlamalarni tozalash: albom bog'lanishi (mg:), chek tanlovi (rcpt:), tugagan
// «berilganlar rejimi» (done:). Ular faqat bir necha daqiqa kerak, keyin bazada keraksiz yotadi.
async function cleanupSettings(env) {
  await env.DB.prepare(
    "DELETE FROM settings WHERE (key LIKE 'mg:%' OR key LIKE 'rcpt:%') AND COALESCE(updated_at, 0) < ?"
  ).bind(now() - TEMP_KEEP_DAYS * DAY).run();
  await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'done:%' AND CAST(value AS INTEGER) < ?").bind(now()).run();
}

async function hourly(env) {
  // Har bir vazifa alohida: bittasi xato bersa, qolganlari baribir bajariladi
  for (const [name, job] of [["to'lov muddati", expirePayments], ["to'lov eslatmasi", remindPayments],
    ["admin eslatmasi", remindAdmins], ["30 kunlik tekshiruv", checkStale], ["tozalash", cleanupSettings]]) {
    try {
      await job(env);
    } catch (e) {
      console.log(`Cron (${name}):`, e.stack || e.message);
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
      if (method === "GET" && path === "/setup") {
        if (!(await setupKeyOk(env, url.searchParams.get("key")))) return setupLocked(env);
        return await setup(env, origin);
      }
      if (method === "GET" && path === "/regions.json") {
        return new Response(JSON.stringify(REGIONS), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=86400" },
        });
      }
      if (method === "GET" && path === "/api/config") {
        const price = await getPrice(env);
        return json({ price, price_text: fmtSum(price), channel: env.CHANNEL || "", free_per_day: FREE_PER_DAY,
          admin: String(env.ADMIN_CONTACT || "").replace(/^@/, ""), bot: await botUsername(env).catch(() => ""),
          report_reasons: REPORT_REASONS });
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
      if (method === "GET" && (m = path.match(/^\/api\/listings\/(\d+)$/))) return await apiDetail(env, request, +m[1]);
      if (method === "POST" && (m = path.match(/^\/api\/listings\/(\d+)\/report$/))) return await apiReport(env, request, +m[1]);
      if (method === "GET" && (m = path.match(/^\/api\/media\/(\d+)\/(\d+)$/)))
        return await apiMedia(env, request, ctx, url, +m[1], +m[2]);
      if (method === "POST" && (m = path.match(/^\/api\/my\/(\d+)\/close$/))) return await apiClose(env, request, +m[1]);
      return new Response("Topilmadi", { status: 404 });
    } catch (e) {
      console.log("Xato:", e.stack || e.message);
      if (String(e.message).includes("no such table")) return err("Bot hali sozlanmagan: /setup?key=... sahifasini oching.", 503);
      return err("Server xatosi. Birozdan keyin qayta urinib ko'ring.", 500);
    }
  },

  async scheduled(event, env, ctx) {
    await ensureSchema(env);
    ctx.waitUntil(hourly(env));
  },
};
