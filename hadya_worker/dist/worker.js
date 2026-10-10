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
// Triggers → Cron: */15 * * * * (har 15 daqiqada — eslatmalar, muddatlar, tozalash; har soatda ham ishlaydi, faqat sekinroq)
// Birinchi marta: brauzerda https://<worker-manzili>/setup?key=<SETUP_KEY> ni oching.

const INDEX_HTML = "<!doctype html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<title>Hadyaga mushuklar</title>\n<script src=\"https://telegram.org/js/telegram-web-app.js\"></script>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Onest:wght@400;500;600;700&display=swap\">\n<style>\n/* Uslub: «Yorqin va jasur» — ko'k blok, limon-sariq stikerlar, qalin siyoh hoshiyalar, polaroid kartalar */\n:root{\n  color-scheme: light;\n  --blue:#2D46F0; --blue-dark:#1C30C4; --blue-soft:#DCE1FF;\n  --lemon:#FFD84A; --ink:#12123A; --ink-soft:#4A4A72; --muted:#6A6A8A;\n  --paper:#F4F1EA; --white:#FFFFFF; --line:#E2DED3;\n  --danger:#D63B3B; --danger-soft:#FBE3E1; --ok:#1F8A5B; --ok-soft:#DDF3E8; --warn-soft:#FFF1C2;\n  --display:\"Unbounded\", \"Arial Black\", system-ui, sans-serif;\n  --body:\"Onest\", -apple-system, \"Segoe UI\", system-ui, sans-serif;\n  --pop:0 4px 0 var(--ink);\n}\n*{box-sizing:border-box}\nhtml,body{background:var(--paper)}\nbody{margin:0;color:var(--ink);font:15px/1.45 var(--body);padding:0 0 calc(96px + env(safe-area-inset-bottom,0px));-webkit-tap-highlight-color:transparent}\nbutton{font:inherit;color:inherit;cursor:pointer}\ninput,select,textarea{font:inherit;color:var(--ink)}\n:focus-visible{outline:3px solid var(--blue);outline-offset:2px}\nh1,h2{font-family:var(--display);margin:0;text-wrap:balance}\nh1{font-weight:800;font-size:24px;line-height:1.1}\nh2{font-weight:600;font-size:16px;margin-bottom:12px}\n.lead{color:var(--muted);margin:6px 0 16px;font-size:14px}\n.pad{padding:20px 16px 0}\n.eyebrow{font-family:var(--display);font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase}\n[hidden]{display:none!important}\n\n/* --- pastki menyu --- */\nnav{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:5}\nnav .in{max-width:520px;margin:0 auto;background:var(--ink);border-radius:22px;padding:6px;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;box-shadow:0 10px 24px -10px rgba(18,18,58,.55)}\nnav button{background:none;border:0;border-radius:16px;padding:7px 0 6px;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10.5px;font-weight:600;color:#C9C9E6;min-width:0}\nnav svg{width:21px;height:21px}\nnav button.on{background:var(--lemon);color:var(--ink)}\n\n/* --- bosh sahifa: ko'k blok --- */\n.hero{position:relative;background:var(--blue);color:var(--white);padding:20px 16px 26px;border-radius:0 0 32px 32px;display:flex;flex-direction:column;gap:14px}\n.hero h1{font-size:31px;line-height:1.04;max-width:240px}\n.sticker{position:absolute;right:14px;top:50px;width:88px;height:88px;border-radius:50%;background:var(--lemon);color:var(--ink);\n  display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(10deg);box-shadow:var(--pop);text-align:center}\n.sticker b{font-family:var(--display);font-weight:800;font-size:24px;line-height:1;font-variant-numeric:tabular-nums}\n.sticker span{font-size:11px;font-weight:700;line-height:1.15;margin-top:2px}\n.place{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n.place label{position:relative;display:block;background:var(--white);border-radius:14px;min-width:0}\n.place label:first-child{background:var(--lemon)}\n.place select{width:100%;min-width:0;height:50px;border:0;background:transparent;padding:16px 30px 0 12px;font-weight:600;font-size:14px;appearance:none;text-overflow:ellipsis}\n.place small{position:absolute;left:12px;top:7px;font-size:11px;font-weight:600;color:var(--ink-soft)}\n.place label::after{content:\"\";position:absolute;right:12px;top:50%;width:8px;height:8px;border:solid var(--ink);border-width:0 2px 2px 0;transform:translateY(-70%) rotate(45deg);pointer-events:none}\n.place select:disabled{color:var(--muted)}\n\n/* --- tanlov tugmalari --- */\n.chips{display:flex;gap:8px;flex-wrap:wrap}\n.chips input{position:absolute;opacity:0;width:1px;height:1px}\n.chips label{min-height:40px;display:inline-flex;align-items:center;padding:0 14px;border-radius:12px;border:2px solid var(--ink);font-size:14px;font-weight:700;background:transparent}\n.chips input:checked+label{background:var(--ink);color:var(--white)}\n.chips input:focus-visible+label{outline:3px solid var(--blue);outline-offset:2px}\n.field .chips label{background:var(--white)}\n.chips.kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n.chips.kinds label{justify-content:center;padding:0 4px;font-size:13px}\n.field .chips input:checked+label{background:var(--ink)}\n\n/* --- polaroid kartalar --- */\n.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 14px;margin-top:18px}\n.item{background:var(--white);border:0;padding:8px 8px 12px;border-radius:6px;text-align:left;min-width:0;\n  box-shadow:0 2px 0 rgba(18,18,58,.1),0 10px 20px -12px rgba(18,18,58,.4);transform:rotate(var(--r,0deg));transition:transform .15s}\n.item:nth-child(4n+1){--r:-1.2deg}.item:nth-child(4n+2){--r:1deg}.item:nth-child(4n+3){--r:.8deg}.item:nth-child(4n){--r:-.9deg}\n.item:active{transform:rotate(0) scale(.98)}\n.ph{aspect-ratio:1;max-width:100%;background:var(--blue-soft) center/cover no-repeat;position:relative;border-radius:2px}\n.ph.empty-ph{display:grid;place-items:center}\n.ph.empty-ph::before{content:\"\";width:42%;height:42%;opacity:.35;background:var(--blue);\n  -webkit-mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cellipse cx='12' cy='15.5' rx='4.6' ry='3.8'/%3E%3Ccircle cx='6' cy='10' r='2.1'/%3E%3Ccircle cx='18' cy='10' r='2.1'/%3E%3Ccircle cx='9.2' cy='6' r='2'/%3E%3Ccircle cx='14.8' cy='6' r='2'/%3E%3C/svg%3E\") center/contain no-repeat;\n  mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cellipse cx='12' cy='15.5' rx='4.6' ry='3.8'/%3E%3Ccircle cx='6' cy='10' r='2.1'/%3E%3Ccircle cx='18' cy='10' r='2.1'/%3E%3Ccircle cx='9.2' cy='6' r='2'/%3E%3Ccircle cx='14.8' cy='6' r='2'/%3E%3C/svg%3E\") center/contain no-repeat}\n.badge{display:inline-block;font-size:11px;font-weight:800;padding:3px 8px;border-radius:6px;line-height:1.3}\n.item .badge{position:absolute;left:6px;bottom:6px}\n.b-hadya{background:var(--lemon);color:var(--ink)}.b-sotuv{background:var(--ink);color:var(--white)}.b-reklama{background:var(--blue);color:var(--white)}\n.item .meta{padding:8px 2px 0}\n.item .t,.item .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.item .t{font-size:14px;font-weight:700}.item .s{font-size:12px;color:var(--muted)}\n.item .p{font-family:var(--display);font-weight:600;font-size:12.5px;margin-top:4px;font-variant-numeric:tabular-nums}\n.empty{color:var(--muted);text-align:center;padding:40px 10px}\n.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:54px;padding:12px;border:2px solid var(--ink);border-radius:16px;\n  background:var(--lemon);color:var(--ink);font-family:var(--display);font-weight:800;font-size:14px;text-decoration:none;box-shadow:var(--pop);margin-bottom:12px}\n.btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}\n.btn.ghost{background:var(--white);font-family:var(--body);font-weight:700;font-size:15px}\n.btn svg{width:20px;height:20px;flex:0 0 auto}\n.more{margin:22px auto 0;width:auto;padding:0 22px;display:flex}\n\n/* --- e'lon sahifasi --- */\n#v-detail{background:var(--blue);min-height:100vh}\n.dtop{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 0;color:var(--white)}\n.round{width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.4);background:transparent;display:grid;place-items:center;color:var(--white)}\n.round svg{width:22px;height:22px}\n.gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:16px;padding:20px 40px 34px;scrollbar-width:none}\n.gallery::-webkit-scrollbar{display:none}\n.pola{position:relative;flex:0 0 100%;scroll-snap-align:center;background:var(--white);padding:10px 10px 38px;border-radius:6px;\n  box-shadow:0 18px 30px -14px rgba(0,0,0,.5);transform:rotate(-2deg)}\n.pola:nth-child(even){transform:rotate(1.5deg)}\n.pola img,.pola video,.pola .ph{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:var(--blue-soft);border-radius:2px}\n.pola .cap{position:absolute;left:10px;right:10px;bottom:10px;text-align:center;font-family:var(--display);font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.pricetag{position:absolute;right:-12px;top:-14px;min-width:74px;height:74px;padding:0 8px;border-radius:37px;background:var(--lemon);color:var(--ink);\n  display:grid;place-items:center;text-align:center;font-family:var(--display);font-weight:800;font-size:13px;line-height:1.1;transform:rotate(12deg);box-shadow:var(--pop);z-index:1}\n.dots{display:flex;justify-content:center;gap:6px;margin-top:-18px;margin-bottom:16px}\n.dots i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.45)}.dots i.on{width:20px;background:var(--lemon)}\n.sheet{background:var(--paper);border-radius:30px 30px 0 0;padding:24px 16px 8px;min-height:50vh}\n.sheet h1{font-size:23px}\n.where{display:flex;align-items:center;gap:6px;margin:8px 0 18px;font-size:14px;font-weight:600;color:var(--ink-soft)}\n.where svg{width:16px;height:16px;color:var(--blue);flex:0 0 auto}\n.cells{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}\n.cell{border:2px solid var(--ink);border-radius:14px;padding:9px 12px;min-width:0;background:var(--white)}\n.cell.wide{grid-column:1 / -1}\n.cell small{display:block;font-size:12px;color:var(--muted)}\n.cell b{display:block;font-size:15px;overflow-wrap:anywhere}\n.posttext{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.55;background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:14px;margin-bottom:16px}\n.warn{display:flex;gap:10px;align-items:flex-start;background:var(--warn-soft);border:2px solid var(--ink);border-radius:14px;padding:11px 12px;font-size:14px;font-weight:600;margin-bottom:16px}\n.warn svg{width:20px;height:20px;flex:0 0 auto}\n.note-box{background:var(--white);border:2px dashed var(--ink);border-radius:16px;padding:14px;text-align:center;font-weight:700;margin-bottom:12px}\n.ctas{display:flex;gap:10px}\n.ctas .btn{flex:1}\n.ctas .call{flex:0 0 58px;width:58px;background:var(--white)}\n\n/* --- e'lon berish --- */\n.back{display:inline-flex;align-items:center;gap:4px;background:none;border:0;color:var(--blue);padding:0;margin-bottom:12px;font-weight:700;font-size:15px}\n.types{display:grid;gap:12px}\n.type{display:flex;gap:14px;align-items:center;background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:14px;text-align:left;box-shadow:var(--pop)}\n.type:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}\n.type .dot{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;border:2px solid var(--ink)}\n.type .dot svg{width:24px;height:24px}\n.type b{display:block;font-size:16px}.type small{color:var(--muted);font-size:13px}\n.type .pr{margin-left:auto;font-family:var(--display);font-size:12px;font-weight:600;white-space:nowrap}\n.slots{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:12px;align-items:end;margin:8px 0}\n.slot{position:relative;background:var(--white);padding:6px 6px 22px;border-radius:4px;border:0;\n  box-shadow:0 2px 0 rgba(18,18,58,.12),0 8px 16px -8px rgba(18,18,58,.4);transform:rotate(var(--r));transition:transform .2s}\n.slot:nth-child(1){--r:-2.5deg}.slot:nth-child(2){--r:1.5deg}.slot:nth-child(3){--r:-1deg}\n.slot:active{transform:rotate(0) scale(.97)}\n.slot .pic{aspect-ratio:1;background:var(--blue-soft) center/cover no-repeat;display:grid;place-items:center;color:var(--blue);overflow:hidden}\n.slot .pic svg{width:30%;height:30%}\n.slot .pic video{width:100%;height:100%;object-fit:cover}\n.slot .cap{position:absolute;left:0;right:0;bottom:3px;font-size:11px;font-weight:600;color:var(--muted);text-align:center}\n.slot .rm{position:absolute;top:-9px;right:-9px;width:28px;height:28px;border-radius:50%;background:var(--danger);color:#fff;\n  border:2px solid var(--ink);font-size:16px;line-height:1;display:none}\n.slot.filled .rm{display:block}.slot.filled .pic svg{display:none}\n.hint{font-size:13px;color:var(--muted);margin:12px 0 18px}\n.group{background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:2px 14px;margin-bottom:14px}\n/* Ajratuvchi chiziq maydonning TEPASIGA, faqat oldida ko'rinadigan maydon bo'lsa chiziladi.\n   (Pastdan chizilsa, yashirilgan oxirgi maydon tufayli ko'rinadigan oxirgisida ortiqcha chiziq qolardi.) */\n.field{padding:12px 0}\n.field:not([hidden]) ~ .field:not([hidden]){border-top:1.5px solid var(--line)}\n.lbl{display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:6px}\n.field input:not([type=radio]):not([type=checkbox]),.field textarea,.field select{width:100%;border:0;background:transparent;padding:2px 0;outline:none;font-size:16px}\n.field input::placeholder,.field textarea::placeholder{color:#A3A3BC}\n.field select{appearance:none}\n.field textarea{resize:none;min-height:76px}\n.err{color:var(--danger);font-size:13px;font-weight:600;margin-top:6px;display:none}.bad .err{display:block}\n.count{font-size:12px;color:var(--muted);text-align:right}\n.contact-err:not(.bad){display:none}\n.report{display:flex;align-items:center;gap:6px;background:none;border:0;color:var(--muted);font-size:13px;font-weight:700;margin:4px auto 14px;padding:8px 10px;min-height:40px}\n.report svg{width:16px;height:16px;flex:0 0 auto}\n.report-box{background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:12px 14px;margin-bottom:14px}\n.report-box .chips{flex-direction:column;align-items:stretch}\n.report-box textarea{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:8px;margin-top:10px;font-size:15px;resize:none;min-height:60px}\n#fallbackSubmit{margin-top:6px}\n\n/* --- mening e'lonlarim --- */\n.mine{display:flex;gap:12px;background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:10px;margin-bottom:12px}\n.mine .ph{width:76px;height:76px;border-radius:10px;flex:0 0 auto;aspect-ratio:auto}\n.mine .body{flex:1;min-width:0}\n.mine .t{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.st{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:8px;background:var(--line);margin:5px 0}\n.st.published{background:var(--ok-soft);color:var(--ok)}\n.st.given,.st.sold{background:var(--lemon)}\n.st.rejected,.st.expired,.st.reported{background:var(--danger-soft);color:var(--danger)}\n.st.awaiting_payment,.st.payment_review{background:var(--blue-soft);color:var(--blue-dark)}\n.sub{font-size:13px;color:var(--muted)}\n.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}\n.acts button{min-height:38px;font-size:13px;font-weight:700;padding:0 12px;border-radius:10px;border:2px solid var(--ink);background:var(--white)}\n.acts button:first-child{background:var(--lemon)}\n\n/* --- statistika --- */\n.bigstat{position:relative;background:var(--blue);color:var(--white);border-radius:24px;padding:22px 18px 24px;margin-bottom:14px;overflow:hidden}\n.bigstat .ring{width:140px;height:140px;border-radius:50%;background:var(--lemon);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;\n  margin:4px auto 14px;transform:rotate(-6deg);box-shadow:var(--pop)}\n.bigstat .ring b{font-family:var(--display);font-weight:800;font-size:44px;line-height:1;font-variant-numeric:tabular-nums}\n.bigstat .ring span{font-size:12px;font-weight:700}\n.bigstat p{margin:0;text-align:center;font-weight:600;font-size:15px}\n.kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}\n.kpi{background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:12px 14px}\n.kpi .n{font-family:var(--display);font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}\n.kpi .l{font-size:13px;color:var(--muted)}\n.kpi.alert{background:var(--lemon)}.kpi.alert .l{color:var(--ink)}\n.box{background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:16px;margin-bottom:14px}\n.bar{margin:12px 0}.bar .row{display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:5px}\n.track{height:12px;background:var(--blue-soft);border-radius:6px;overflow:hidden}.fill{height:100%;background:var(--blue);border-radius:6px}\n\n/* --- savol (AI) --- */\n.chat{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}\n.bubble{max-width:88%;padding:11px 14px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px}\n.bubble.me{align-self:flex-end;background:var(--blue);color:var(--white);border-bottom-right-radius:6px}\n.bubble.ai{align-self:flex-start;background:var(--white);border:2px solid var(--ink);border-bottom-left-radius:6px}\n.bubble.wait{color:var(--muted);border-style:dashed}\n.suggest{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}\n.suggest button{text-align:left;background:var(--white);border:2px solid var(--ink);border-radius:14px;padding:11px 14px;font-size:14px;font-weight:600}\n.askbox{display:flex;gap:8px;align-items:flex-end;background:var(--white);border:2px solid var(--ink);border-radius:20px;padding:7px 7px 7px 14px}\n.askbox textarea{flex:1;min-width:0;border:0;background:transparent;outline:none;resize:none;min-height:26px;max-height:120px;padding:8px 0;font-size:16px}\n.askbox button{flex:0 0 auto;width:44px;height:44px;border-radius:14px;border:2px solid var(--ink);background:var(--lemon);display:grid;place-items:center}\n.askbox button:disabled{opacity:.5}\n.askbox svg{width:20px;height:20px}\n.bubble a{color:var(--blue);font-weight:700;text-decoration:underline}\n.adminbtn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:12px;border:2px solid var(--ink);background:var(--white);font-weight:700;font-size:14px;color:var(--ink);box-shadow:0 3px 0 var(--ink)}\n.adminbtn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}\n.adminbtn svg{width:18px;height:18px}\n.helpline{display:flex;justify-content:center;margin:18px 0 4px}\n.ai-meta{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted);margin-top:8px}\n\n/* --- oynalar (modal) --- */\n.mbg{position:fixed;inset:0;z-index:50;background:rgba(18,18,58,.55);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .18s ease-out}\n.mbg.center{align-items:center;padding:20px}\n.modal{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--paper);border:2px solid var(--ink);border-bottom:0;border-radius:28px 28px 0 0;\n  padding:22px 16px calc(16px + env(safe-area-inset-bottom,0px));animation:slideUp .26s cubic-bezier(.2,.9,.3,1.1)}\n.mbg.center .modal{border-bottom:2px solid var(--ink);border-radius:28px;box-shadow:0 8px 0 var(--ink);animation:popIn .32s cubic-bezier(.2,.9,.3,1.25)}\n.modal h2{font-size:20px;margin-bottom:6px}\n.modal .lead{margin:0 0 14px}\n.mbtns{display:flex;gap:10px;margin-top:16px}\n.mbtns .btn{margin:0;flex:1;min-height:52px;font-size:14px}\n.btn.danger{background:var(--danger);color:#fff}\n.sum{background:var(--white);border:2px solid var(--ink);border-radius:18px;padding:4px 14px;margin-bottom:12px}\n.sum .r{display:flex;gap:12px;justify-content:space-between;padding:10px 0;font-size:14px}\n.sum .r + .r{border-top:1.5px solid var(--line)}\n.sum .r span{color:var(--muted);flex:0 0 auto}\n.sum .r b{text-align:right;overflow-wrap:anywhere;font-weight:700}\n.sum .r b.empty{color:#A3A3BC;font-weight:600}\n.sumpics{display:flex;gap:8px;margin-bottom:12px}\n.sumpics div{width:76px;height:76px;border-radius:12px;border:2px solid var(--ink);background:var(--blue-soft) center/cover no-repeat;overflow:hidden}\n.sumpics video{width:100%;height:100%;object-fit:cover}\n.kindtag{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:13px;padding:6px 12px;border-radius:10px;border:2px solid var(--ink);margin-bottom:12px}\n.okmark{width:96px;height:96px;margin:6px auto 16px;border-radius:50%;background:var(--lemon);border:3px solid var(--ink);box-shadow:0 5px 0 var(--ink);display:grid;place-items:center;animation:popIn .45s .05s both cubic-bezier(.2,.9,.3,1.4)}\n.okmark svg{width:50px;height:50px;stroke-dasharray:40;stroke-dashoffset:40;animation:draw .4s .35s forwards ease-out}\n.steps{display:grid;gap:8px;margin:14px 0 4px;text-align:left}\n.steps div{display:flex;gap:12px;align-items:center;background:var(--white);border:2px solid var(--ink);border-radius:14px;padding:10px 12px;font-size:14px;font-weight:600}\n.steps i{flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px}\n.mcenter{text-align:center}\n.mcenter .lead{margin:6px 0 0}\n.check{display:flex;gap:10px;align-items:flex-start;background:var(--white);border:2px solid var(--ink);border-radius:14px;padding:12px;font-size:14px;font-weight:600;margin-top:12px}\n.check input{width:22px;height:22px;flex:0 0 auto;accent-color:var(--ink)}\n@keyframes fadeIn{from{opacity:0}}\n@keyframes slideUp{from{transform:translateY(60%)}}\n@keyframes popIn{from{transform:scale(.6);opacity:0}}\n@keyframes draw{to{stroke-dashoffset:0}}\n@media (prefers-reduced-motion:reduce){.mbg,.modal,.okmark,.okmark svg{animation:none!important;stroke-dashoffset:0}}\n\n/* --- admin: e'lonni boshqarish --- */\n.adminbox{background:var(--white);border:2px dashed var(--ink);border-radius:18px;padding:14px;margin:4px 0 16px}\n.adminbox .ah{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;font-family:var(--display);font-weight:600;font-size:14px}\n.adminbox .ah .st{margin:0}\n.abtns{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n.abtns button{min-height:46px;border-radius:12px;border:2px solid var(--ink);background:var(--white);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;gap:6px}\n.abtns button.y{background:var(--lemon)}\n.abtns button.r{color:var(--danger)}\n.abtns button.w{grid-column:1 / -1}\n.chips.status{margin-top:10px}\n.chips.status label{min-height:34px;font-size:12px;padding:0 10px;border-style:dashed}\n.st.hidden{background:var(--danger-soft);color:var(--danger)}\n\n\n/* --- Navbat (admin) --- */\nnav button{position:relative}\n.nbadge{position:absolute;top:2px;right:calc(50% - 22px);min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--danger);color:#fff;font:800 11px/18px var(--body);font-style:normal;border:2px solid var(--ink)}\n.qhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}\n.qhead h2{margin:0;display:flex;align-items:center;gap:8px}\n.qhead h2 b{background:var(--danger);color:#fff;border-radius:10px;padding:2px 9px;font-size:13px;font-family:var(--body)}\n.qhead button{border:2px solid var(--ink);background:var(--white);border-radius:12px;min-height:38px;padding:0 12px;font-weight:700;font-size:13px}\n.seg{display:grid;grid-template-columns:1fr 1fr;background:var(--white);border:2px solid var(--ink);border-radius:14px;padding:4px;gap:4px;margin-bottom:12px}\n.seg button{border:0;border-radius:10px;min-height:40px;background:transparent;font-weight:700;font-size:14px}\n.seg button.on{background:var(--ink);color:#fff}\n.seg button b{display:inline-block;min-width:22px;padding:0 6px;margin-left:4px;border-radius:8px;background:var(--lemon);color:var(--ink);font-size:12px;line-height:20px}\n.qcard{background:var(--white);border:2px solid var(--ink);border-radius:20px;padding:12px;margin-bottom:14px;box-shadow:0 4px 0 var(--ink);transition:transform .25s,opacity .25s}\n.qcard.gone{transform:translateX(110%);opacity:0}\n.qtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;font-size:13px;color:var(--muted);font-weight:600}\n.qtop .kindtag{margin:0}\n.qpics{display:flex;gap:8px;overflow-x:auto;margin:0 -12px 10px;padding:0 12px;scrollbar-width:none}\n.qpics::-webkit-scrollbar{display:none}\n.qpics button{flex:0 0 auto;width:132px;height:132px;border-radius:14px;border:2px solid var(--ink);background:var(--blue-soft) center/cover no-repeat;padding:0;overflow:hidden;position:relative}\n.qpics .vid::after{content:\"▶\";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:30px;text-shadow:0 2px 6px rgba(0,0,0,.5)}\n.qcard h3{font-family:var(--display);font-size:17px;margin:0 0 2px}\n.qcard .where{margin:2px 0 10px}\n.qcard .sum{margin-bottom:10px}\n.qwho{display:flex;flex-direction:column;gap:2px;background:var(--paper);border-radius:14px;padding:10px 12px;font-size:13px;margin-bottom:10px}\n.qwho b{font-size:14px}\n.qwho a{color:var(--blue);font-weight:700;text-decoration:none}\n.qwarn{background:#FFF1C2;border:2px solid var(--ink);border-radius:12px;padding:9px 11px;font-size:13px;font-weight:700;margin-bottom:10px}\n.qbtns{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}\n.qbtns button{min-height:50px;border-radius:14px;border:2px solid var(--ink);font-weight:800;font-size:14px;background:var(--white)}\n.qbtns .ok{background:var(--lemon);box-shadow:0 3px 0 var(--ink)}\n.qbtns .no{color:var(--danger)}\n.qreceipt{display:block;width:100%;max-height:420px;object-fit:contain;background:var(--paper);border:2px solid var(--ink);border-radius:14px;margin-bottom:10px}\n.qempty{background:var(--white);border:2px dashed var(--ink);border-radius:18px;padding:22px 16px;text-align:center;font-weight:700}\n.qempty span{display:block;font-size:34px;margin-bottom:6px}\n.zoom{width:100%;border-radius:14px;border:2px solid var(--ink);display:block}\n.toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:60;background:var(--ink);color:#fff;\n  padding:12px 18px;border-radius:14px;font-weight:700;font-size:14px;max-width:calc(100% - 32px);box-shadow:0 8px 20px -8px rgba(0,0,0,.5);animation:popIn .25s}\n\n/* --- admin --- */\n.queue .q{display:flex;gap:10px;align-items:center;border-bottom:1.5px solid var(--line);padding:10px 0}\n.queue .q:last-child{border:0}\n.queue .q .ph{width:50px;height:50px;border-radius:8px;flex:0 0 auto;aspect-ratio:auto}\n.queue .q .body{flex:1;min-width:0}\n.queue .q .t{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.cmds{font-size:14px;line-height:1.75}.cmds code{background:var(--paper);border:1.5px solid var(--line);padding:1px 6px;border-radius:6px;font-weight:600}\n#outside{background:var(--lemon);border:2px solid var(--ink);padding:12px;border-radius:14px;margin:12px 16px 0;font-size:14px;font-weight:600}\n@media (prefers-reduced-motion:reduce){.slot,.item{transition:none}}\n</style>\n</head>\n<body>\n<div id=\"outside\" hidden>Ilova Telegram ichida to'liq ishlaydi. Botga kirib «Ilova» tugmasini bosing.</div>\n\n<section class=\"view\" id=\"v-search\">\n  <div class=\"hero\">\n    <span class=\"eyebrow\">Hadyaga mushuklar</span>\n    <h1>Har bir mushukka uy kerak</h1>\n    <div class=\"sticker\" id=\"heroSticker\" hidden><b id=\"heroCount\">0</b><span>uy<br>topdi</span></div>\n    <div class=\"place\">\n      <label><small>Hudud</small><select id=\"fRegion\" aria-label=\"Hudud\"><option value=\"\">Barcha hududlar</option></select></label>\n      <label><small>Tuman</small><select id=\"fDistrict\" aria-label=\"Tuman\" disabled><option value=\"\">Barcha tumanlar</option></select></label>\n    </div>\n  </div>\n  <div class=\"pad\">\n    <div class=\"chips kinds\">\n      <input type=\"radio\" name=\"fk\" id=\"fk-all\" value=\"\" checked><label for=\"fk-all\">Hammasi</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-h\" value=\"hadya\"><label for=\"fk-h\">Hadya</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-s\" value=\"sotuv\"><label for=\"fk-s\">Sotuv</label>\n      <input type=\"radio\" name=\"fk\" id=\"fk-r\" value=\"reklama\"><label for=\"fk-r\">Reklama</label>\n    </div>\n    <!-- faqat adminga: yopilgan va shikoyatli e'lonlarni ham ko'rish -->\n    <div class=\"chips status\" id=\"adminFilter\" hidden>\n      <input type=\"radio\" name=\"fs\" id=\"fs-p\" value=\"published\" checked><label for=\"fs-p\">Faol</label>\n      <input type=\"radio\" name=\"fs\" id=\"fs-c\" value=\"closed\"><label for=\"fs-c\">Berilgan / yopilgan</label>\n      <input type=\"radio\" name=\"fs\" id=\"fs-r\" value=\"reported\"><label for=\"fs-r\">Shikoyatli</label>\n    </div>\n    <div class=\"grid\" id=\"results\"></div>\n    <div class=\"empty\" id=\"noResults\" hidden>Bu yerda hozircha e'lon yo'q</div>\n    <button class=\"btn ghost more\" id=\"loadMore\" hidden>Yana ko'rsatish</button>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-detail\" hidden><div id=\"detail\"></div></section>\n\n<section class=\"view pad\" id=\"v-new\" hidden>\n  <div id=\"stepType\">\n    <h1>E'lon berish</h1>\n    <p class=\"lead\">E'lon admin tekshiruvidan so'ng kanalga chiqadi</p>\n    <div class=\"types\">\n      <button class=\"type\" data-kind=\"hadya\"><span class=\"dot\" style=\"background:var(--lemon)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z\"/></svg></span>\n        <span><b>Hadyaga mushuk</b><small>Yangi uy izlayotgan mushuk</small></span><span class=\"pr\">BEPUL</span></button>\n      <button class=\"type\" data-kind=\"sotuv\"><span class=\"dot\" style=\"background:var(--ink);color:var(--white)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z\"/><circle cx=\"7\" cy=\"7\" r=\"1.5\"/></svg></span>\n        <span><b>Mushuk sotish</b><small>Zotli yoki oddiy mushuk</small></span><span class=\"pr js-price\"></span></button>\n      <button class=\"type\" data-kind=\"reklama\"><span class=\"dot\" style=\"background:var(--blue);color:var(--white)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8\"/></svg></span>\n        <span><b>Reklama</b><small>Klinika, do'kon, xizmat, mahsulot</small></span><span class=\"pr js-price\"></span></button>\n    </div>\n  </div>\n\n  <div id=\"stepForm\" hidden>\n    <button class=\"back\" id=\"backToType\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 6l-6 6 6 6\"/></svg>E'lon turi</button>\n    <h1 id=\"formTitle\"></h1>\n    <p class=\"lead\" id=\"formLead\"></p>\n    <div class=\"slots\">\n      <button type=\"button\" class=\"slot\" data-i=\"0\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/></svg></div><div class=\"cap\">Asosiy</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n      <button type=\"button\" class=\"slot\" data-i=\"1\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M12 6v12M6 12h12\"/></svg></div><div class=\"cap\">Rasm/video</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n      <button type=\"button\" class=\"slot\" data-i=\"2\"><div class=\"pic\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\"><path d=\"M12 6v12M6 12h12\"/></svg></div><div class=\"cap\">Rasm/video</div><span class=\"rm\" aria-label=\"O'chirish\">×</span></button>\n    </div>\n    <input type=\"file\" id=\"file\" accept=\"image/*,video/*\" hidden>\n    <div id=\"f-media\"><div class=\"err\">Kamida bitta rasm yoki video qo'shing.</div></div>\n    <p class=\"hint\">3 tagacha rasm yoki video (video 20 MB gacha).</p>\n\n    <div class=\"group k-cat\">\n      <div class=\"field\"><label class=\"lbl\" for=\"breed\">Zoti</label><input id=\"breed\" maxlength=\"40\" placeholder=\"Masalan, britan, oddiy\"></div>\n      <div class=\"field\" id=\"f-age\"><label class=\"lbl\" for=\"age\">Yoshi</label><input id=\"age\" maxlength=\"30\" placeholder=\"Masalan, 3 oylik\"><div class=\"err\">Yoshini yozing.</div></div>\n      <div class=\"field\" id=\"f-gender\"><span class=\"lbl\">Jinsi</span><div class=\"chips\">\n        <input type=\"radio\" name=\"gender\" id=\"g-f\" value=\"f\"><label for=\"g-f\">Urg'ochi</label>\n        <input type=\"radio\" name=\"gender\" id=\"g-m\" value=\"m\"><label for=\"g-m\">Erkak</label>\n        <input type=\"radio\" name=\"gender\" id=\"g-u\" value=\"u\"><label for=\"g-u\">Bilmayman</label></div><div class=\"err\">Jinsini tanlang.</div></div>\n      <div class=\"field\"><span class=\"lbl\">Sog'lig'i</span><div class=\"chips\">\n        <input type=\"checkbox\" name=\"health\" id=\"h-1\" value=\"soglom\"><label for=\"h-1\">Sog'lom</label>\n        <input type=\"checkbox\" name=\"health\" id=\"h-2\" value=\"emlangan\"><label for=\"h-2\">Emlangan</label>\n        <input type=\"checkbox\" name=\"health\" id=\"h-3\" value=\"steril\"><label for=\"h-3\">Sterilizatsiya qilingan</label></div>\n        <input id=\"health_note\" maxlength=\"80\" placeholder=\"Qo'shimcha (ixtiyoriy)\" style=\"margin-top:10px\"></div>\n      <div class=\"field\" id=\"f-delivery\"><span class=\"lbl\">Dostafka</span><div class=\"chips\">\n        <input type=\"radio\" name=\"delivery\" id=\"d-1\" value=\"bor\"><label for=\"d-1\">Bor</label>\n        <input type=\"radio\" name=\"delivery\" id=\"d-2\" value=\"yoq\"><label for=\"d-2\">Yo'q</label>\n        <input type=\"radio\" name=\"delivery\" id=\"d-3\" value=\"kelish\"><label for=\"d-3\">Kelishiladi</label></div><div class=\"err\">Tanlang.</div></div>\n      <div class=\"field k-sotuv\" id=\"f-price\"><label class=\"lbl\" for=\"price\">Narxi (so'm)</label><input id=\"price\" inputmode=\"numeric\" maxlength=\"15\" placeholder=\"Masalan, 500000\"><div class=\"err\">Narxni yozing.</div></div>\n    </div>\n\n    <div class=\"group k-reklama\">\n      <div class=\"field\" id=\"f-title\"><label class=\"lbl\" for=\"title\">Nomi</label><input id=\"title\" maxlength=\"60\" placeholder=\"Masalan, «Mushukjon» veterinar klinikasi\"><div class=\"err\">Nomini yozing.</div></div>\n      <div class=\"field\" id=\"f-about\"><label class=\"lbl\" for=\"about\">Tavsif</label><textarea id=\"about\" maxlength=\"300\" placeholder=\"Nima taklif qilasiz?\"></textarea><div class=\"err\">Tavsif yozing.</div></div>\n      <div class=\"field\"><label class=\"lbl\" for=\"rprice\">Narxi (ixtiyoriy)</label><input id=\"rprice\" maxlength=\"40\" placeholder=\"Masalan, 50 000 so'mdan\"></div>\n    </div>\n\n    <div class=\"group\">\n      <div class=\"field\" id=\"f-region\"><label class=\"lbl\" for=\"region\">Hudud</label><select id=\"region\"><option value=\"\">Tanlang…</option></select><div class=\"err\">Hududni tanlang.</div></div>\n      <div class=\"field\" id=\"f-district\"><label class=\"lbl\" for=\"district\">Tuman / shahar</label><select id=\"district\" disabled><option value=\"\">Avval hududni tanlang</option></select><div class=\"err\">Tanlang.</div></div>\n      <div class=\"field\"><label class=\"lbl\" for=\"extra\">Qo'shimcha ma'lumot</label><textarea id=\"extra\" maxlength=\"400\" placeholder=\"Xarakteri, sharti va boshqalar\"></textarea><div class=\"count\"><span id=\"cnt\">0</span>/<span id=\"cntMax\">400</span></div></div>\n    </div>\n\n    <h2 style=\"margin-top:4px\">Bog'lanish</h2>\n    <p class=\"hint\" style=\"margin:-6px 0 10px\">Telefon yoki Telegram — kamida bittasini yozing. Ikkalasi ham bo'lishi mumkin.</p>\n    <div class=\"group\" id=\"f-contact\">\n      <div class=\"field\" id=\"f-phone\"><label class=\"lbl\" for=\"phone\">Telefon (ixtiyoriy)</label><input id=\"phone\" type=\"tel\" inputmode=\"tel\" value=\"+998 \" maxlength=\"20\" autocomplete=\"tel\"><div class=\"err\">+998 XX XXX XX XX ko'rinishida yozing yoki bo'sh qoldiring.</div></div>\n      <div class=\"field\" id=\"f-username\"><label class=\"lbl\" for=\"tg_username\">Telegram username (ixtiyoriy)</label><input id=\"tg_username\" maxlength=\"40\" placeholder=\"@username\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><div class=\"err\">Masalan: @ism_familiya — 5–32 ta lotin harf, raqam yoki _.</div></div>\n      <div class=\"field contact-err\" id=\"f-either\"><div class=\"err\" style=\"margin-top:0\">Telefon raqam yoki Telegram username'dan kamida bittasini yozing.</div></div>\n    </div>\n    <button class=\"btn\" id=\"fallbackSubmit\" hidden>E'lonni yuborish</button>\n  </div>\n</section>\n\n<section class=\"view pad\" id=\"v-my\" hidden>\n  <h1>Mening e'lonlarim</h1>\n  <p class=\"lead\">Mushuk egasini topganda shu yerda belgilang</p>\n  <div id=\"myList\"></div>\n  <div class=\"helpline js-admin\" hidden><button class=\"adminbtn\" data-admin><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>E'lon bo'yicha savol? Adminga yozing</button></div>\n</section>\n\n<section class=\"view pad\" id=\"v-stats\" hidden>\n  <h1>Statistika</h1>\n  <p class=\"lead\">Kanalimiz orqali yangi uy topgan mushuklar</p>\n  <div id=\"statsBox\"></div>\n</section>\n\n<section class=\"view pad\" id=\"v-ask\" hidden>\n  <h1>Mushuk haqida savol</h1>\n  <p class=\"lead\">Parvarish, ovqat, sog'liq va xulq haqida so'rang</p>\n  <div class=\"chat\" id=\"chat\"></div>\n  <div class=\"suggest\" id=\"suggest\">\n    <button>2 oylik mushukchani nima bilan boqish kerak?</button>\n    <button>Mushukni lotokka qanday o'rgataman?</button>\n    <button>Mushukni qachon emlash kerak?</button>\n  </div>\n  <form class=\"askbox\" id=\"askForm\">\n    <textarea id=\"q\" rows=\"1\" maxlength=\"500\" placeholder=\"Savolingizni yozing…\" aria-label=\"Savol\"></textarea>\n    <button id=\"askBtn\" aria-label=\"Yuborish\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12h14M13 6l6 6-6 6\"/></svg></button>\n  </form>\n  <div class=\"ai-meta\"><span id=\"aiLeft\"></span><span>Jiddiy holatda veterinarga murojaat qiling</span></div>\n  <div class=\"err\" id=\"askErr\" style=\"display:block\"></div>\n  <div class=\"helpline js-admin\" hidden><button class=\"adminbtn\" data-admin><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>Adminga yozish</button></div>\n</section>\n\n<section class=\"view pad\" id=\"v-admin\" hidden>\n  <h1>Admin panel</h1>\n  <p class=\"lead\">Faqat adminlarga ko'rinadi</p>\n  <div id=\"queueBox\"></div>\n  <h2 style=\"margin-top:22px\">Statistika</h2>\n  <div id=\"adminBox\"><div class=\"empty\">Yuklanmoqda…</div></div>\n  <div class=\"group\" style=\"padding:14px\">\n    <h2>Bildirishnomalar</h2>\n    <p class=\"sub\" style=\"margin:0 0 4px\">Tinch soatlarda navbat haqidagi xabar ovozsiz keladi. Tinch soatlar tugagach, navbatda so'rov qolgan bo'lsa, ovozli eslatma beriladi.</p>\n    <div class=\"field\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">\n      <div><label class=\"lbl\" for=\"sQuietFrom\">Tinch soat boshi</label><select id=\"sQuietFrom\"></select></div>\n      <div><label class=\"lbl\" for=\"sQuietTo\">Tugashi</label><select id=\"sQuietTo\"></select></div>\n    </div>\n  </div>\n  <div class=\"group\" style=\"padding:14px\">\n    <h2>To'lov sozlamalari</h2>\n    <div class=\"field\" style=\"padding-top:0\"><label class=\"lbl\" for=\"sPrice\">Pullik e'lon narxi (so'm)</label><input id=\"sPrice\" inputmode=\"numeric\" maxlength=\"9\"></div>\n    <div class=\"field\"><label class=\"lbl\" for=\"sCard\">Karta raqami</label><input id=\"sCard\" inputmode=\"numeric\" maxlength=\"23\" placeholder=\"8600 0000 0000 0000\"></div>\n    <div class=\"field\"><label class=\"lbl\" for=\"sOwner\">Karta egasi</label><input id=\"sOwner\" maxlength=\"60\" placeholder=\"Ism Familiya\"></div>\n    <button class=\"btn\" id=\"saveSettings\" style=\"margin-top:12px\">Saqlash</button>\n  </div>\n  <div class=\"box cmds\">\n    <h2>Bot buyruqlari</h2>\n    <div><code>/berilgan</code> — eski berilgan postlarni statistikaga kiritish rejimi</div>\n    <div><code>/oddiy</code> — rejimni o'chirish</div>\n    <div><code>/ban 123456789</code> yoki <code>/ban @username</code> — foydalanuvchini bloklash</div>\n    <div><code>/unban 123456789</code> — blokdan chiqarish</div>\n    <div>Kanaldagi postni ilovaga qo'shish uchun uni botga forward qiling.</div>\n    <div>E'lon va cheklar yuqoridagi «Navbat»da tasdiqlanadi. Botda faqat bitta yig'ma xabar turadi.</div>\n  </div>\n</section>\n\n<nav><div class=\"in\">\n  <button data-view=\"search\" class=\"on\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M21 21l-4.3-4.3\"/></svg>Qidirish</button>\n  <button data-view=\"new\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><path d=\"M12 8v8M8 12h8\"/></svg>E'lon</button>\n  <button data-view=\"ask\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z\"/></svg>Savol</button>\n  <button data-view=\"my\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path d=\"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01\"/></svg>Mening</button>\n  <button data-view=\"stats\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/></svg>Statistika</button>\n  <button data-view=\"admin\" id=\"navAdmin\" hidden><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z\"/><path d=\"M9 12l2 2 4-4\"/></svg>Admin<i class=\"nbadge\" id=\"qBadge\" hidden></i></button>\n</div></nav>\n\n<script>\nconst tg = window.Telegram?.WebApp, inTg = !!(tg && tg.initData);\nconst $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];\nconst esc = s => String(s ?? \"\").replace(/[&<>\"']/g, c => ({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[c]));\nconst KIND = {hadya:\"Hadya\", sotuv:\"Sotuv\", reklama:\"Reklama\"};\nconst TAG = {hadya:\"#hadyaga\", sotuv:\"#sotiladi\", reklama:\"#reklama\"};\nconst ICON = {\n  back: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 6l-6 6 6 6\"/></svg>',\n  pin: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\"><path d=\"M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z\"/><circle cx=\"12\" cy=\"11\" r=\"2\"/></svg>',\n  phone: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2\"/></svg>',\n  send: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M21 3L3 10.5l7 2.5 2.5 7z\"/><path d=\"M10 13l4-4\"/></svg>',\n  warn: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M12 3l9 16H3z\"/><path d=\"M12 10v4M12 17h.01\"/></svg>',\n  ext: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 4h6v6M20 4l-9 9M18 14v6H4V6h6\"/></svg>',\n  flag: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 21V4\"/><path d=\"M5 4h11l-2 4 2 4H5\"/></svg>',\n  share: '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><path d=\"M8.6 13.5l6.8 4M15.4 6.5l-6.8 4\"/></svg>',\n};\nlet REGIONS = [], CONFIG = {price_text:\"7 000 so'm\"}, current = \"search\";\n\nasync function api(path, opts = {}) {\n  opts.headers = {...(opts.headers || {}), \"X-Init-Data\": tg?.initData || \"\"};\n  try {\n    const r = await fetch(path, opts);\n    const j = await r.json().catch(() => ({ok:false, error:\"Server javob bermadi.\"}));\n    if (!r.ok && !j.error) j.error = \"Xatolik yuz berdi.\";\n    return j;\n  } catch { return {ok:false, error:\"Internet aloqasini tekshiring.\"}; }\n}\nconst say = (m, cb) => tg?.showAlert ? tg.showAlert(m, cb) : (alert(m), cb && cb());\n/* ---------- oynalar (modal) ---------- */\n// Oyna ochiq paytda Telegram'ning pastki tugmasi yashiriladi, yopilganda qaytariladi\nfunction openModal(html, {center = false} = {}) {\n  const bg = document.createElement(\"div\");\n  bg.className = \"mbg\" + (center ? \" center\" : \"\");\n  bg.innerHTML = `<div class=\"modal\" role=\"dialog\" aria-modal=\"true\">${html}</div>`;\n  document.body.append(bg);\n  if (inTg) tg.MainButton.hide();\n  const close = () => { bg.remove(); updateMainButton(); };\n  return {el: bg.querySelector(\".modal\"), bg, close};\n}\n// Tasdiqlash oynasi → Promise<boolean>\nfunction confirmBox({title, text = \"\", ok = \"Ha\", cancel = \"Bekor qilish\", danger = false, extra = \"\"}) {\n  return new Promise(res => {\n    const m = openModal(`<h2>${esc(title)}</h2>${text ? `<p class=\"lead\">${text}</p>` : \"\"}${extra}\n      <div class=\"mbtns\"><button class=\"btn ghost\" data-no>${esc(cancel)}</button><button class=\"btn${danger ? \" danger\" : \"\"}\" data-yes>${esc(ok)}</button></div>`, {center: true});\n    const done = v => { const box = m.el; m.close(); res(v ? box : false); };\n    m.el.querySelector(\"[data-no]\").onclick = () => done(false);\n    m.el.querySelector(\"[data-yes]\").onclick = () => { haptic(\"success\"); done(true); };\n    m.bg.onclick = e => { if (e.target === m.bg) done(false); };\n  });\n}\nconst ask = m => confirmBox({title: \"Tasdiqlang\", text: esc(m)});\nconst OK_SVG = '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></svg>';\nconst haptic = t => tg?.HapticFeedback?.notificationOccurred(t);\nconst openTg = url => tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url);\nconst thumb = (url, cls = \"ph\") => url ? `<div class=\"${cls}\" style=\"background-image:url('${url}')\">` : `<div class=\"${cls} empty-ph\">`;\nfunction headerColor(c) { try { tg?.setHeaderColor(c); } catch {} }\n\nfunction fillRegions(sel, first) { sel.innerHTML = `<option value=\"\">${first}</option>` + REGIONS.map(r => `<option>${esc(r.name)}</option>`).join(\"\"); }\nfunction fillDistricts(sel, region, first) {\n  const r = REGIONS.find(x => x.name === region);\n  sel.innerHTML = `<option value=\"\">${first}</option>` + (r ? r.d.map(d => `<option>${esc(d[0])}</option>`).join(\"\") : \"\");\n  sel.disabled = !r;\n}\n\n/* ---------- navigatsiya ---------- */\nfunction show(view) {\n  current = view;\n  $$(\".view\").forEach(v => v.hidden = v.id !== \"v-\" + view);\n  $$(\"nav button\").forEach(b => b.classList.toggle(\"on\", b.dataset.view === view || (view === \"detail\" && b.dataset.view === \"search\")));\n  window.scrollTo(0, 0);\n  headerColor(view === \"search\" || view === \"detail\" ? \"#2D46F0\" : \"#F4F1EA\");\n  updateMainButton();\n  if (view === \"detail\") tg?.BackButton.show(); else tg?.BackButton.hide();\n  if (view === \"my\") loadMy();\n  if (view === \"stats\") loadStats();\n  if (view === \"admin\") { loadQueue(); loadAdmin(); }\n  if (view === \"ask\") refreshAiLeft();\n}\n$$(\"nav button\").forEach(b => b.onclick = () => show(b.dataset.view));\ntg?.BackButton.onClick(() => show(\"search\"));\n\n/* ---------- qidiruv ---------- */\nlet offset = 0;\nasync function search(reset = true) {\n  if (reset) { offset = 0; $(\"#results\").innerHTML = \"\"; }\n  const q = new URLSearchParams({kind: $('input[name=\"fk\"]:checked').value, region: $(\"#fRegion\").value, district: $(\"#fDistrict\").value, offset});\n  if (ME.is_admin && val(\"fs\") !== \"published\") q.set(\"status\", val(\"fs\"));\n  const j = await api(\"api/listings?\" + q);\n  (j.items || []).forEach(it => {\n    const b = document.createElement(\"button\");\n    b.className = \"item\";\n    const stBadge = it.status !== \"published\" ? `<span class=\"badge\" style=\"left:auto;right:6px;bottom:auto;top:6px;position:absolute;background:var(--white);color:var(--ink)\">${esc(it.status_text)}</span>` : \"\";\n    b.innerHTML = `${thumb(it.thumb)}<span class=\"badge b-${it.kind}\">${KIND[it.kind]}</span>${stBadge}</div>\n      <div class=\"meta\"><div class=\"t\">${esc(it.title)}</div><div class=\"s\">${esc(it.district || it.region || \"\")}</div><div class=\"p\">${esc(it.kind === \"hadya\" ? \"BEPUL\" : it.price)}</div></div>`;\n    b.onclick = () => openDetail(it.id);\n    $(\"#results\").append(b);\n  });\n  offset += (j.items || []).length;\n  $(\"#loadMore\").hidden = !j.more;\n  $(\"#noResults\").hidden = offset > 0;\n  if (j.error) { $(\"#noResults\").textContent = j.error; $(\"#noResults\").hidden = false; }\n}\n$$('input[name=\"fk\"], input[name=\"fs\"]').forEach(i => i.onchange = () => search());\n$(\"#fRegion\").onchange = () => { fillDistricts($(\"#fDistrict\"), $(\"#fRegion\").value, \"Barcha tumanlar\"); search(); };\n$(\"#fDistrict\").onchange = () => search();\n$(\"#loadMore\").onclick = () => search(false);\n\nasync function openDetail(id) {\n  const j = await api(\"api/listings/\" + id);\n  if (j.error) return say(j.error);\n  const tag = j.kind === \"hadya\" ? \"BEPUL\" : esc(j.price);\n  const media = j.media.length ? j.media : [null];\n  const gal = media.map((m, i) => `<div class=\"pola\">${i === 0 ? `<span class=\"pricetag\">${tag}</span>` : \"\"}\n    ${!m ? `<div class=\"ph empty-ph\"></div>` : m.type === \"video\" ? `<video src=\"${m.url}\" controls playsinline preload=\"metadata\"></video>` : `<img src=\"${m.url}\" alt=\"\">`}\n    <span class=\"cap\">${esc(j.title)}</span></div>`).join(\"\");\n  const dots = media.length > 1 ? `<div class=\"dots\">${media.map((_, i) => `<i class=\"${i ? \"\" : \"on\"}\"></i>`).join(\"\")}</div>` : \"\";\n  const rowsNoPlace = j.rows.filter(([k]) => k !== \"Manzil\" && k !== \"Narxi\");\n  const short = rowsNoPlace.filter(([, v]) => String(v).length <= 22), long = rowsNoPlace.filter(([, v]) => String(v).length > 22);\n  const cell = ([k, v], wide) => `<div class=\"cell${wide ? \" wide\" : \"\"}\"><small>${esc(k)}</small><b>${esc(v)}</b></div>`;\n  const cells = short.map((r, i) => cell(r, short.length % 2 === 1 && i === short.length - 1)).join(\"\") + long.map(r => cell(r, true)).join(\"\");\n  const place = (j.rows.find(([k]) => k === \"Manzil\") || [, j.district || j.region || \"\"])[1];\n  let actions = \"\";\n  if (j.contact) {\n    const call = j.contact.phone ? `<a class=\"btn call\" href=\"tel:${j.contact.phone.replace(/\\s/g, \"\")}\" aria-label=\"Qo'ng'iroq: ${esc(j.contact.phone)}\">${ICON.phone}</a>` : \"\";\n    const write = j.contact.username ? `<button class=\"btn\" id=\"dWrite\">${ICON.send}Egasiga yozish</button>`\n      : j.contact.phone ? `<a class=\"btn\" href=\"tel:${j.contact.phone.replace(/\\s/g, \"\")}\">${ICON.phone}${esc(j.contact.phone)}</a>` : \"\";\n    actions += `<div class=\"ctas\">${j.contact.username ? call : \"\"}${write}</div>`;\n    if (j.contact.phone && j.contact.username) actions += `<p class=\"sub\" style=\"text-align:center;margin:0 0 12px\">Telefon: ${esc(j.contact.phone)}</p>`;\n  } else if (j.status === \"published\") {\n    // Kontaktlar faqat Telegram ichida ko'rinadi (raqamlarni skript bilan yig'ib bo'lmasin)\n    actions += `<div class=\"note-box\">${j.contact_hidden ? \"Egasining kontaktini ko'rish uchun ilovani Telegram'dagi bot orqali oching\" : \"Kontakt uchun kanaldagi postni ko'ring\"}</div>`;\n  } else {\n    actions += `<div class=\"note-box\">${j.status === \"given\" ? \"Bu mushuk yangi uyini topdi\" : j.status === \"sold\" ? \"Sotilgan\"\n      : j.status === \"reported\" ? \"Shikoyat sabab ilovadan vaqtincha yashirilgan\" : j.status === \"hidden\" ? \"Ilovadan olib tashlangan\" : \"E'lon dolzarb emas\"}</div>`;\n  }\n  if (j.admin) actions = adminBox(j) + actions;\n  if (CONFIG.bot && j.status === \"published\") actions += `<button class=\"btn ghost\" id=\"dShare\">${ICON.share}Do'stlarga ulashish</button>`;\n  if (j.post) actions += `<button class=\"btn ghost\" id=\"dPost\">${ICON.ext}Kanalda ko'rish</button>`;\n  if (inTg && j.status === \"published\" && !j.mine && !j.admin) actions += `<button class=\"report\" id=\"dReport\">${ICON.flag}Shikoyat qilish</button><div id=\"reportBox\"></div>`;\n  $(\"#detail\").innerHTML = `\n    <div class=\"dtop\"><button class=\"round\" id=\"dBack\" aria-label=\"Orqaga\">${ICON.back}</button><span class=\"eyebrow\">${TAG[j.kind]}</span><span style=\"width:44px\"></span></div>\n    <div class=\"gallery\" id=\"gal\">${gal}</div>${dots}\n    <div class=\"sheet\">\n      <h1>${esc(j.title)}</h1>\n      <div class=\"where\">${ICON.pin}${esc(place)}</div>\n      ${j.kind === \"sotuv\" && j.contact ? `<div class=\"warn\">${ICON.warn}<span>Oldindan pul o'tkazmang. Mushukni ko'rib, keyin to'lang.</span></div>` : \"\"}\n      ${cells ? `<div class=\"cells\">${cells}</div>` : \"\"}\n      ${j.text ? `<div class=\"posttext\">${esc(j.text)}</div>` : \"\"}\n      ${actions}\n    </div>`;\n  $(\"#dBack\").onclick = () => show(\"search\");\n  if ($(\"#dWrite\")) $(\"#dWrite\").onclick = () => openTg(\"https://t.me/\" + j.contact.username);\n  if ($(\"#dPost\")) $(\"#dPost\").onclick = () => openTg(j.post);\n  if ($(\"#dShare\")) $(\"#dShare\").onclick = () => {\n    // Havola botni ochadi, bot esa shu e'lonni ilovada ochadigan tugma beradi\n    const link = `https://t.me/${CONFIG.bot}?start=l${j.id}`;\n    const text = `🐾 ${KIND[j.kind]}: ${j.title} — ${place}`;\n    openTg(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);\n  };\n  if ($(\"#dReport\")) $(\"#dReport\").onclick = () => showReport(j.id);\n  if (j.admin) bindAdminBox(j);\n  const g = $(\"#gal\");\n  if (media.length > 1) g.onscroll = () => {\n    const i = Math.round(g.scrollLeft / g.clientWidth);\n    $$(\".dots i\").forEach((d, k) => d.classList.toggle(\"on\", k === i));\n  };\n  show(\"detail\");\n}\n\n\n/* ---------- admin: e'lonni boshqarish (faqat adminga ko'rinadi) ---------- */\nconst AICON = {\n  edit: '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linejoin=\"round\"><path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"M14 6l4 4\"/></svg>',\n  trash: '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\"><path d=\"M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13\"/></svg>',\n  undo: '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 14L4 9l5-5\"/><path d=\"M4 9h10a6 6 0 0 1 0 12h-3\"/></svg>',\n  check: '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12l5 5 9-10\"/></svg>',\n  stop: '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M6 6l12 12\"/></svg>',\n};\nfunction adminBox(j) {\n  const st = j.status, open = st === \"published\" || st === \"reported\";\n  const doneBtn = j.kind === \"hadya\" ? [\"given\", \"Berildi\"] : j.kind === \"sotuv\" ? [\"sold\", \"Sotildi\"] : null;\n  const b = [];\n  if (st === \"hidden\") return `<div class=\"adminbox\"><div class=\"ah\">Admin<span class=\"st hidden\">${esc(j.status_text)}</span></div><p class=\"sub\" style=\"margin:0\">Bu e'lon ilovadan olib tashlangan.</p></div>`;\n  if (!open) b.push(`<button class=\"y w\" data-a=\"published\">${AICON.undo}Yana faol qilish</button>`);\n  if (st === \"reported\") b.push(`<button class=\"y w\" data-a=\"published\">${AICON.undo}Ilovaga qaytarish (shikoyat asossiz)</button>`);\n  b.push(`<button data-a=\"edit\">${AICON.edit}Tahrirlash</button>`);\n  if (doneBtn && st !== doneBtn[0]) b.push(`<button data-a=\"${doneBtn[0]}\">${AICON.check}${doneBtn[1]}</button>`);\n  if (st !== \"closed\") b.push(`<button data-a=\"closed\">${AICON.stop}Dolzarb emas</button>`);\n  b.push(`<button class=\"r\" data-a=\"delete\">${AICON.trash}O'chirish</button>`);\n  return `<div class=\"adminbox\"><div class=\"ah\">Admin boshqaruvi<span class=\"st ${st}\">${esc(j.status_text)}</span></div><div class=\"abtns\">${b.join(\"\")}</div></div>`;\n}\nconst adminPost = (id, what, body) => api(`api/admin/listings/${id}/${what}`, {method: \"POST\", headers: {\"Content-Type\": \"application/json\"}, body: JSON.stringify(body || {})});\nfunction bindAdminBox(j) {\n  $$(\".adminbox [data-a]\").forEach(btn => btn.onclick = async () => {\n    const a = btn.dataset.a;\n    if (a === \"edit\") return editListing(j);\n    if (a === \"delete\") {\n      const box = await confirmBox({title: \"E'lonni o'chirasizmi?\", text: `<b>#${j.id} · ${esc(j.title)}</b><br>E'lon ilovadan olib tashlanadi.`,\n        ok: \"O'chirish\", cancel: \"Bekor qilish\", danger: true,\n        extra: j.post ? `<label class=\"check\"><input type=\"checkbox\" id=\"delCh\"><span>Kanaldagi postni ham o'chirish<br><small class=\"sub\">Bot kanalda «Xabarlarni o'chirish» huquqiga ega bo'lishi kerak</small></span></label>` : \"\"});\n      if (!box) return;\n      const r = await adminPost(j.id, \"delete\", {channel: !!box.querySelector(\"#delCh\")?.checked});\n      if (!r.ok) return say(r.error);\n      haptic(\"success\");\n      say(r.channel_deleted === false ? \"Ilovadan o'chirildi. Kanaldagi postni bot o'chira olmadi — uni kanalda qo'lda o'chiring.\" : \"O'chirildi.\", () => { show(\"search\"); search(); });\n      return;\n    }\n    const texts = {\n      published: [\"E'lonni yana faol qilasizmi?\", \"E'lon ilovada qayta ko'rinadi, kanaldagi postga kontaktlar qaytariladi.\", \"Ha, faol qilish\"],\n      given: [\"«Berildi» deb belgilaysizmi?\", \"Kanaldagi post «Berildi» deb tahrirlanadi va kanalga qisqa «✅ Berildi» javobi yoziladi.\", \"Ha, berildi\"],\n      sold: [\"«Sotildi» deb belgilaysizmi?\", \"Kanaldagi post «Sotildi» deb tahrirlanadi va kanalga qisqa «✅ Sotildi» javobi yoziladi.\", \"Ha, sotildi\"],\n      closed: [\"«Dolzarb emas» deb belgilaysizmi?\", \"Kanaldagi post tahrirlanadi (kontaktlar olib tashlanadi). Kanalga alohida xabar yuborilmaydi.\", \"Ha, dolzarb emas\"],\n    }[a];\n    if (!await confirmBox({title: texts[0], text: `<b>#${j.id} · ${esc(j.title)}</b><br>${texts[1]}`, ok: texts[2], cancel: \"Yo'q\"})) return;\n    const r = await adminPost(j.id, \"status\", {status: a});\n    if (!r.ok) return say(r.error);\n    haptic(\"success\");\n    openDetail(j.id);\n  });\n}\nfunction editListing(j) {\n  const A = j.admin, d = A.data || {};\n  const opt = (list, cur) => list.map(([v, t]) => `<option value=\"${esc(v)}\"${v === cur ? \" selected\" : \"\"}>${esc(t)}</option>`).join(\"\");\n  const kinds = [[\"hadya\", \"Hadya\"], [\"sotuv\", \"Sotuv\"], [\"reklama\", \"Reklama\"]];\n  const place = `<div class=\"field\"><label class=\"lbl\">Hudud</label><select id=\"eRegion\"><option value=\"\">Tanlanmagan</option>${opt(REGIONS.map(r => [r.name, r.name]), A.region)}</select></div>\n    <div class=\"field\"><label class=\"lbl\">Tuman / shahar</label><select id=\"eDistrict\"></select></div>`;\n  const body = A.imported ? `\n    <p class=\"lead\">Bu e'lon kanaldan qo'shilgan. Post matnini tahrirlaysiz — kanaldagi post ham yangilanadi (qalin yozuv kabi formatlash yo'qoladi).</p>\n    <div class=\"group\"><div class=\"field\"><label class=\"lbl\">Turi</label><select id=\"eKind\">${opt(kinds, A.kind)}</select></div>${place}</div>\n    <div class=\"group\"><div class=\"field\"><label class=\"lbl\">Post matni</label><textarea id=\"eRaw\" style=\"min-height:220px\">${esc(A.raw || \"\")}</textarea><div class=\"count\"><span id=\"eCnt\"></span></div></div></div>`\n  : `\n    <div class=\"group\">\n      <div class=\"field\"><label class=\"lbl\">Turi</label><select id=\"eKind\">${opt(kinds, A.kind)}</select></div>\n      <div class=\"field ek-cat\"><label class=\"lbl\">Zoti</label><input id=\"eBreed\" maxlength=\"40\" value=\"${esc(d.breed || \"\")}\"></div>\n      <div class=\"field ek-cat\"><label class=\"lbl\">Yoshi</label><input id=\"eAge\" maxlength=\"30\" value=\"${esc(d.age || \"\")}\"></div>\n      <div class=\"field ek-cat\"><label class=\"lbl\">Jinsi</label><select id=\"eGender\">${opt([[\"f\", \"Urg'ochi\"], [\"m\", \"Erkak\"], [\"u\", \"Noma'lum\"]], d.gender || \"u\")}</select></div>\n      <div class=\"field ek-cat\"><label class=\"lbl\">Sog'lig'i</label><div class=\"chips\">${Object.entries(HEALTH_T).map(([k, t]) =>\n        `<input type=\"checkbox\" id=\"eh-${k}\" value=\"${k}\"${(d.health || []).includes(k) ? \" checked\" : \"\"}><label for=\"eh-${k}\">${t}</label>`).join(\"\")}</div>\n        <input id=\"eHealthNote\" maxlength=\"80\" placeholder=\"Qo'shimcha (ixtiyoriy)\" value=\"${esc(d.health_note || \"\")}\" style=\"margin-top:10px\"></div>\n      <div class=\"field ek-cat\"><label class=\"lbl\">Dostafka</label><select id=\"eDelivery\">${opt([[\"bor\", \"Bor\"], [\"yoq\", \"Yo'q\"], [\"kelish\", \"Kelishiladi\"]], d.delivery || \"kelish\")}</select></div>\n      <div class=\"field ek-rek\"><label class=\"lbl\">Nomi</label><input id=\"eTitle\" maxlength=\"60\" value=\"${esc(d.title || \"\")}\"></div>\n      <div class=\"field ek-rek\"><label class=\"lbl\">Tavsif</label><textarea id=\"eAbout\" maxlength=\"300\">${esc(d.about || \"\")}</textarea></div>\n      <div class=\"field ek-price\"><label class=\"lbl\">Narxi</label><input id=\"ePrice\" maxlength=\"40\" value=\"${esc(d.price ?? \"\")}\"></div>\n    </div>\n    <div class=\"group\">${place}\n      <div class=\"field\"><label class=\"lbl\">Telefon</label><input id=\"ePhone\" type=\"tel\" value=\"${esc(d.phone || \"+998 \")}\"></div>\n      <div class=\"field\"><label class=\"lbl\">Telegram username</label><input id=\"eUser\" value=\"${A.username ? \"@\" + esc(A.username) : \"\"}\" placeholder=\"@username\"></div>\n      <div class=\"field\"><label class=\"lbl\">Qo'shimcha ma'lumot</label><textarea id=\"eExtra\" maxlength=\"400\">${esc(d.extra || \"\")}</textarea></div>\n    </div>`;\n  const m = openModal(`<h2>#${j.id} — tahrirlash</h2>${body}\n    <div class=\"mbtns\"><button class=\"btn ghost\" data-no>Bekor qilish</button><button class=\"btn\" data-save>Saqlash</button></div>`);\n  const q = s => m.el.querySelector(s);\n  const fillD = () => { fillDistricts(q(\"#eDistrict\"), q(\"#eRegion\").value, \"Tanlanmagan\"); q(\"#eDistrict\").value = A.district || \"\"; };\n  fillD();\n  q(\"#eRegion\").onchange = () => fillDistricts(q(\"#eDistrict\"), q(\"#eRegion\").value, \"Tanlang…\");\n  const kindVis = () => {\n    const k = q(\"#eKind\").value;\n    m.el.querySelectorAll(\".ek-cat\").forEach(e => e.hidden = k === \"reklama\");\n    m.el.querySelectorAll(\".ek-rek\").forEach(e => e.hidden = k !== \"reklama\");\n    m.el.querySelectorAll(\".ek-price\").forEach(e => e.hidden = k === \"hadya\");\n  };\n  if (!A.imported) { q(\"#eKind\").onchange = kindVis; kindVis(); }\n  if (A.imported) { const c = () => q(\"#eCnt\").textContent = `${q(\"#eRaw\").value.length} / ${j.media.length ? 1024 : 4096}`; q(\"#eRaw\").oninput = c; c(); }\n  q(\"[data-no]\").onclick = () => m.close();\n  q(\"[data-save]\").onclick = async () => {\n    const payload = A.imported\n      ? {kind: q(\"#eKind\").value, region: q(\"#eRegion\").value, district: q(\"#eDistrict\").value, raw: q(\"#eRaw\").value}\n      : {kind: q(\"#eKind\").value, region: q(\"#eRegion\").value, district: q(\"#eDistrict\").value, breed: q(\"#eBreed\").value, age: q(\"#eAge\").value,\n         gender: q(\"#eGender\").value, health: [...m.el.querySelectorAll('[id^=\"eh-\"]:checked')].map(i => i.value).join(\",\"),\n         health_note: q(\"#eHealthNote\").value, delivery: q(\"#eDelivery\").value, title: q(\"#eTitle\").value, about: q(\"#eAbout\").value,\n         price: q(\"#ePrice\").value, phone: q(\"#ePhone\").value, tg_username: q(\"#eUser\").value, extra: q(\"#eExtra\").value};\n    q(\"[data-save]\").disabled = true;\n    const r = await adminPost(j.id, \"edit\", payload);\n    q(\"[data-save]\").disabled = false;\n    if (!r.ok) return say(r.error);\n    haptic(\"success\"); m.close(); openDetail(j.id);\n  };\n}\n\n/* ---------- shikoyat ---------- */\nfunction showReport(id) {\n  const box = $(\"#reportBox\");\n  if (box.innerHTML) { box.innerHTML = \"\"; return; }\n  const reasons = Object.entries(CONFIG.report_reasons || {other: \"Boshqa sabab\"});\n  box.innerHTML = `<div class=\"report-box\"><span class=\"lbl\">Shikoyat sababi</span><div class=\"chips\">\n    ${reasons.map(([k, t], i) => `<input type=\"radio\" name=\"rr\" id=\"rr-${k}\" value=\"${k}\"${i ? \"\" : \" checked\"}><label for=\"rr-${k}\">${esc(t)}</label>`).join(\"\")}\n    </div><textarea id=\"rNote\" maxlength=\"300\" placeholder=\"Izoh (ixtiyoriy)\"></textarea>\n    <button class=\"btn\" id=\"rSend\" style=\"margin:10px 0 0\">Adminga yuborish</button></div>`;\n  box.scrollIntoView({behavior: \"smooth\", block: \"center\"});\n  $(\"#rSend\").onclick = async () => {\n    $(\"#rSend\").disabled = true;\n    const r = await api(`api/listings/${id}/report`, {method: \"POST\", headers: {\"Content-Type\": \"application/json\"},\n      body: JSON.stringify({reason: val(\"rr\"), note: $(\"#rNote\").value})});\n    $(\"#rSend\").disabled = false;\n    if (r.ok) { haptic(\"success\"); box.innerHTML = \"\"; $(\"#dReport\").hidden = true; say(\"Shikoyatingiz adminga yuborildi. Rahmat!\"); }\n    else say(r.error || \"Xatolik yuz berdi.\");\n  };\n}\n\n/* ---------- e'lon berish ---------- */\nlet kind = null, slotIdx = 0, sending = false;\nconst media = [null, null, null];\n\n$$(\".type\").forEach(b => b.onclick = () => {\n  kind = b.dataset.kind;\n  $(\"#formTitle\").textContent = {hadya:\"Hadyaga mushuk\", sotuv:\"Mushuk sotish\", reklama:\"Reklama\"}[kind];\n  $(\"#formLead\").textContent = kind === \"hadya\" ? \"Bepul. Admin tekshirgach kanalga chiqadi\" : `Admin ma'qullagach ${CONFIG.price_text} to'lov qilasiz`;\n  $$(\".k-cat\").forEach(e => e.hidden = kind === \"reklama\");\n  $$(\".k-sotuv\").forEach(e => e.hidden = kind !== \"sotuv\");\n  $$(\".k-reklama\").forEach(e => e.hidden = kind !== \"reklama\");\n  const max = kind === \"reklama\" ? 300 : 400;\n  $(\"#extra\").maxLength = max; $(\"#cntMax\").textContent = max;\n  $(\"#stepType\").hidden = true; $(\"#stepForm\").hidden = false;\n  window.scrollTo(0, 0); updateMainButton();\n});\n$(\"#backToType\").onclick = () => { $(\"#stepForm\").hidden = true; $(\"#stepType\").hidden = false; kind = null; updateMainButton(); };\n\n$$(\".slot\").forEach(s => s.onclick = e => {\n  const i = +s.dataset.i;\n  if (e.target.classList.contains(\"rm\")) return setMedia(i, null);\n  slotIdx = media[i] ? i : Math.max(0, media.findIndex(m => !m));\n  $(\"#file\").value = \"\"; $(\"#file\").click();\n});\n$(\"#file\").onchange = async () => {\n  const f = $(\"#file\").files[0]; if (!f) return;\n  try {\n    if (f.type.startsWith(\"video/\")) {\n      if (f.size > 20 * 1024 * 1024) return say(\"Video 20 MB dan oshmasin. Qisqaroq video tanlang.\");\n      setMedia(slotIdx, {blob: f, video: true});\n    } else setMedia(slotIdx, {blob: await compress(f), video: false});\n  } catch { say(\"Bu faylni ochib bo'lmadi. Boshqasini tanlang.\"); }\n};\nfunction setMedia(i, m) {\n  media[i] = m;\n  const s = $(`.slot[data-i=\"${i}\"]`), pic = s.querySelector(\".pic\");\n  pic.querySelector(\"video\")?.remove(); pic.style.backgroundImage = \"\";\n  if (m) {\n    const url = URL.createObjectURL(m.blob);\n    if (m.video) pic.insertAdjacentHTML(\"beforeend\", `<video src=\"${url}\" muted playsinline></video>`);\n    else pic.style.backgroundImage = `url(${url})`;\n  }\n  s.classList.toggle(\"filled\", !!m);\n  $(\"#f-media\").classList.remove(\"bad\");\n}\n// Rasmni 1600px gacha kichraytirib JPEG qiladi (iPhone HEIC ham shu yerda JPEG'ga aylanadi)\nasync function compress(file) {\n  const url = URL.createObjectURL(file);\n  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });\n  const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));\n  const c = document.createElement(\"canvas\");\n  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);\n  c.getContext(\"2d\").drawImage(img, 0, 0, c.width, c.height);\n  URL.revokeObjectURL(url);\n  return new Promise(res => c.toBlob(res, \"image/jpeg\", 0.85));\n}\n$(\"#region\").onchange = () => { fillDistricts($(\"#district\"), $(\"#region\").value, \"Tanlang…\"); $(\"#f-region\").classList.remove(\"bad\"); };\n$(\"#extra\").oninput = () => $(\"#cnt\").textContent = $(\"#extra\").value.length;\n$$(\"#stepForm input, #stepForm select, #stepForm textarea\").forEach(el =>\n  el.addEventListener(\"input\", () => el.closest(\".field\")?.classList.remove(\"bad\")));\n\nconst val = n => $(`input[name=\"${n}\"]:checked`)?.value || \"\";\n// \"+998 \" yolg'iz qolsa — telefon kiritilmagan hisoblanadi\nconst phoneDigits = () => { const d = $(\"#phone\").value.replace(/\\D/g, \"\"); return d === \"998\" ? \"\" : d; };\n// \"\" — kiritilmagan, false — noto'g'ri, aks holda @ belgisisiz username (t.me/... havolasi ham bo'ladi)\nfunction cleanUser() {\n  const s = $(\"#tg_username\").value.trim().replace(/^(https?:\\/\\/)?(t\\.me|telegram\\.me)\\//i, \"\").replace(/^@/, \"\");\n  if (!s) return \"\";\n  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) ? s : false;\n}\n// Telegram profilida username bo'lsa, maydonga oldindan yozib qo'yiladi (foydalanuvchi o'chirishi mumkin)\nconst myUsername = () => tg?.initDataUnsafe?.user?.username ? \"@\" + tg.initDataUnsafe.user.username : \"\";\n[\"#phone\", \"#tg_username\"].forEach(s => $(s).addEventListener(\"input\", () => $(\"#f-either\").classList.remove(\"bad\")));\nfunction validate() {\n  $$(\"#stepForm .bad, #f-media.bad\").forEach(e => e.classList.remove(\"bad\"));\n  const bad = [], need = (ok, id) => { if (!ok) bad.push(id); };\n  need(media.some(Boolean), \"f-media\");\n  if (kind === \"reklama\") { need($(\"#title\").value.trim(), \"f-title\"); need($(\"#about\").value.trim(), \"f-about\"); }\n  else {\n    need($(\"#age\").value.trim(), \"f-age\"); need(val(\"gender\"), \"f-gender\"); need(val(\"delivery\"), \"f-delivery\");\n    if (kind === \"sotuv\") need(+$(\"#price\").value.replace(/\\D/g, \"\") >= 1000, \"f-price\");\n  }\n  need($(\"#region\").value, \"f-region\"); need($(\"#district\").value, \"f-district\");\n  // Kontakt: ikkalasi ham ixtiyoriy, lekin yozilgan bo'lsa to'g'ri bo'lsin va kamida bittasi bo'lsin\n  const phone = phoneDigits(), user = cleanUser();\n  need(!phone || /^998\\d{9}$/.test(phone), \"f-phone\");\n  need(user !== false, \"f-username\");\n  if (!phone && !user && user !== false) bad.push(\"f-either\");\n  bad.forEach(id => $(\"#\" + id).classList.add(\"bad\"));\n  if (bad.length) { $(\"#\" + bad[0]).scrollIntoView({behavior:\"smooth\", block:\"center\"}); haptic(\"error\"); }\n  return !bad.length;\n}\n\n// «E'lonni yuborish» bosilganda: avval yozilganlarni ko'rsatib, tasdiqlatamiz (xato bo'lsa o'zgartirish mumkin)\nconst GENDER_T = {f: \"Urg'ochi\", m: \"Erkak\", u: \"Bilmayman\"};\nconst DELIV_T = {bor: \"Bor\", yoq: \"Yo'q\", kelish: \"Kelishiladi\"};\nconst HEALTH_T = {soglom: \"Sog'lom\", emlangan: \"Emlangan\", steril: \"Sterilizatsiya qilingan\"};\nconst fmtPrice = v => { const d = String(v).replace(/\\D/g, \"\"); return d ? d.replace(/\\B(?=(\\d{3})+(?!\\d))/g, \" \") + \" so'm\" : \"\"; };\nfunction reviewRows() {\n  const v = id => $(\"#\" + id).value.trim();\n  const health = [...$$('input[name=\"health\"]:checked').map(i => HEALTH_T[i.value]), v(\"health_note\")].filter(Boolean).join(\", \");\n  const user = cleanUser();\n  const rows = kind === \"reklama\"\n    ? [[\"Nomi\", v(\"title\")], [\"Tavsif\", v(\"about\")], [\"Narxi\", v(\"rprice\")]]\n    : [[\"Zoti\", v(\"breed\")], [\"Yoshi\", v(\"age\")], [\"Jinsi\", GENDER_T[val(\"gender\")]], [\"Sog'lig'i\", health],\n       [\"Dostafka\", DELIV_T[val(\"delivery\")]], [\"Narxi\", kind === \"sotuv\" ? fmtPrice(v(\"price\")) : \"Bepul\"]];\n  rows.push([\"Hudud\", v(\"region\")], [\"Tuman / shahar\", v(\"district\")],\n    [\"Telefon\", phoneDigits() ? $(\"#phone\").value.trim() : \"\"], [\"Telegram\", user ? \"@\" + user : \"\"], [\"Qo'shimcha\", v(\"extra\")]);\n  return rows;\n}\nfunction submit() {\n  if (sending || !validate()) return;\n  const kinds = {hadya: [\"Hadyaga mushuk · BEPUL\", \"var(--lemon)\", \"var(--ink)\"], sotuv: [\"Mushuk sotish\", \"var(--ink)\", \"#fff\"], reklama: [\"Reklama\", \"var(--blue)\", \"#fff\"]}[kind];\n  const pics = media.filter(Boolean).map(m => {\n    const url = URL.createObjectURL(m.blob);\n    return m.video ? `<div><video src=\"${url}\" muted playsinline></video></div>` : `<div style=\"background-image:url(${url})\"></div>`;\n  }).join(\"\");\n  const rows = reviewRows().map(([k, x]) => `<div class=\"r\"><span>${esc(k)}</span><b class=\"${x ? \"\" : \"empty\"}\">${x ? esc(x) : \"—\"}</b></div>`).join(\"\");\n  const m = openModal(`\n    <h2>E'loningizni tekshiring</h2>\n    <p class=\"lead\">Hammasi to'g'rimi? Xato bo'lsa, «O'zgartirish»ni bosing.</p>\n    <span class=\"kindtag\" style=\"background:${kinds[1]};color:${kinds[2]}\">${kinds[0]}</span>\n    <div class=\"sumpics\">${pics}</div>\n    <div class=\"sum\">${rows}</div>\n    ${kind !== \"hadya\" ? `<div class=\"warn\" style=\"margin:0\">${ICON.warn}<span>Admin ma'qullagach ${esc(CONFIG.price_text)} to'lov qilasiz.</span></div>` : \"\"}\n    <div class=\"mbtns\"><button class=\"btn ghost\" data-edit>O'zgartirish</button><button class=\"btn\" data-send>Tasdiqlash va yuborish</button></div>`);\n  m.el.querySelector(\"[data-edit]\").onclick = () => m.close();\n  m.el.querySelector(\"[data-send]\").onclick = () => { m.close(); sendListing(); };\n}\nfunction showSent() {\n  const paid = kind !== \"hadya\";\n  const m = openModal(`<div class=\"mcenter\">\n    <div class=\"okmark\">${OK_SVG}</div>\n    <h2>E'loningiz adminga yuborildi!</h2>\n    <p class=\"lead\">Rahmat! Mushukchangizga tezroq uy topilishini tilaymiz 🐾</p>\n    <div class=\"steps\">\n      <div><i>1</i>Admin e'lonni tekshiradi</div>\n      ${paid ? `<div><i>2</i>Ma'qullansa, ${esc(CONFIG.price_text)} to'lov qilasiz</div>` : \"\"}\n      <div><i>${paid ? 3 : 2}</i>E'lon kanalga va ilovaga chiqadi</div>\n      <div><i>${paid ? 4 : 3}</i>Natija haqida bot sizga xabar beradi</div>\n    </div>\n    <div class=\"mbtns\"><button class=\"btn\" data-ok>OK</button></div></div>`, {center: true});\n  m.el.querySelector(\"[data-ok]\").onclick = () => { m.close(); resetForm(); show(\"my\"); };\n}\nasync function sendListing() {\n  if (sending) return;\n  sending = true; tg?.MainButton.showProgress(); $(\"#fallbackSubmit\").disabled = true;\n  const fd = new FormData();\n  fd.append(\"initData\", tg?.initData || \"\"); fd.append(\"kind\", kind);\n  [\"breed\", \"age\", \"health_note\", \"title\", \"about\", \"region\", \"district\", \"phone\", \"tg_username\", \"extra\"].forEach(id => fd.append(id, $(\"#\" + id).value));\n  fd.append(\"price\", kind === \"reklama\" ? $(\"#rprice\").value : $(\"#price\").value);\n  fd.append(\"gender\", val(\"gender\")); fd.append(\"delivery\", val(\"delivery\"));\n  fd.append(\"health\", $$('input[name=\"health\"]:checked').map(i => i.value).join(\",\"));\n  media.filter(Boolean).forEach((m, i) => fd.append(\"media\", m.blob, m.video ? `v${i}.mp4` : `p${i}.jpg`));\n  const j = await api(\"api/submit\", {method: \"POST\", body: fd});\n  sending = false; tg?.MainButton.hideProgress(); $(\"#fallbackSubmit\").disabled = false;\n  if (j.ok) { haptic(\"success\"); showSent(); }\n  else say(j.error || \"Xatolik. Qayta urinib ko'ring.\");\n}\nfunction resetForm() {\n  [0, 1, 2].forEach(i => setMedia(i, null));\n  $$(\"#stepForm input:not([type=radio]):not([type=checkbox]), #stepForm textarea\").forEach(e => e.value = \"\");\n  $$(\"#stepForm input[type=radio], #stepForm input[type=checkbox]\").forEach(e => e.checked = false);\n  $(\"#phone\").value = \"+998 \"; $(\"#tg_username\").value = myUsername(); $(\"#cnt\").textContent = \"0\";\n  $(\"#region\").value = \"\"; fillDistricts($(\"#district\"), \"\", \"Avval hududni tanlang\");\n  $(\"#stepForm\").hidden = true; $(\"#stepType\").hidden = false; kind = null;\n}\n\nfunction updateMainButton() {\n  const on = current === \"new\" && !!kind;\n  if (inTg) { if (on) { tg.MainButton.setText(\"E'lonni yuborish\"); tg.MainButton.show(); } else tg.MainButton.hide(); }\n  else $(\"#fallbackSubmit\").hidden = !on;\n}\nif (inTg) tg.MainButton.onClick(submit); else $(\"#fallbackSubmit\").onclick = submit;\n\n/* ---------- mening e'lonlarim ---------- */\nasync function loadMy() {\n  const box = $(\"#myList\");\n  if (!inTg) return box.innerHTML = `<div class=\"empty\">Ilovani bot orqali oching.</div>`;\n  const j = await api(\"api/my\");\n  if (j.error) return box.innerHTML = `<div class=\"empty\">${esc(j.error)}</div>`;\n  if (!j.items.length) return box.innerHTML = `<div class=\"empty\">Hali e'lon bermagansiz. «E'lon» bo'limidan boshlang.</div>`;\n  box.innerHTML = \"\";\n  j.items.forEach(it => {\n    const el = document.createElement(\"div\");\n    el.className = \"mine\";\n    const acts = ![\"published\", \"reported\"].includes(it.status) ? \"\" : [\n      it.kind === \"hadya\" ? `<button data-s=\"given\">Berildi</button>` : \"\",\n      it.kind === \"sotuv\" ? `<button data-s=\"sold\">Sotildi</button>` : \"\",\n      `<button data-s=\"closed\">Dolzarb emas</button>`].join(\"\");\n    el.innerHTML = `${thumb(it.thumb)}</div>\n      <div class=\"body\"><div class=\"t\">#${it.id} · ${esc(it.title)}</div>\n      <span class=\"st ${it.status}\">${esc(it.status_text)}</span> <small class=\"sub\">${KIND[it.kind]}</small>\n      ${it.status === \"rejected\" && it.reject_reason ? `<div class=\"sub\">Sabab: ${esc(it.reject_reason)}</div>` : \"\"}\n      ${it.status === \"awaiting_payment\" ? `<div class=\"sub\">${esc(CONFIG.price_text)} o'tkazib, chek rasmini botga yuboring</div>` : \"\"}\n      ${it.status === \"pending\" ? `<div class=\"sub\">Natija haqida bot xabar beradi</div>` : \"\"}\n      ${it.status === \"reported\" ? `<div class=\"sub\">Admin tekshirguncha ilovada ko'rinmaydi. Kanaldagi post joyida.</div>` : \"\"}\n      <div class=\"acts\">${acts}</div></div>`;\n    el.querySelectorAll(\".acts button\").forEach(b => b.onclick = async () => {\n      const s = b.dataset.s;\n      const ok = await confirmBox({\n        title: {given: \"Mushuk yangi uyini topdimi?\", sold: \"Mushuk sotildimi?\", closed: \"E'lon dolzarb emasmi?\"}[s],\n        text: `<b>#${it.id} · ${esc(it.title)}</b><br>` + (s === \"closed\"\n          ? \"E'lon yopiladi. Kanaldagi post «Dolzarb emas» deb tahrirlanadi, kontaktlaringiz olib tashlanadi.\"\n          : `E'lon yopiladi. Kanaldagi post «${s === \"given\" ? \"Berildi\" : \"Sotildi\"}» deb belgilanadi, kontaktlaringiz olib tashlanadi.`) +\n          \"<br><br>Adashib bosgan bo'lsangiz, «Yo'q»ni bosing.\",\n        ok: {given: \"Ha, berildi\", sold: \"Ha, sotildi\", closed: \"Ha, dolzarb emas\"}[s], cancel: \"Yo'q\",\n      });\n      if (!ok) return;\n      const r = await api(`api/my/${it.id}/close`, {method:\"POST\", headers:{\"Content-Type\":\"application/json\"}, body: JSON.stringify({status: b.dataset.s})});\n      if (r.ok) { haptic(\"success\"); loadMy(); } else say(r.error);\n    });\n    box.append(el);\n  });\n}\n\n/* ---------- statistika ---------- */\nlet STATS = null;\nfunction setSticker(s) {\n  if (!s || s.error) return;\n  $(\"#heroCount\").textContent = s.given; $(\"#heroSticker\").hidden = !s.given;\n}\nasync function loadStats() {\n  const s = STATS = await api(\"api/stats\");\n  if (s.error) return $(\"#statsBox\").innerHTML = `<div class=\"empty\">${esc(s.error)}</div>`;\n  setSticker(s);\n  const max = Math.max(1, ...s.top_regions.map(r => r.n));\n  $(\"#statsBox\").innerHTML = `\n    <div class=\"bigstat\"><div class=\"ring\"><b>${s.given}</b><span>mushuk</span></div><p>hadya orqali yangi uy topdi</p></div>\n    <div class=\"kpis\">\n      <div class=\"kpi\"><div class=\"n\">${s.given_month}</div><div class=\"l\">shu oyda berildi</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.sold}</div><div class=\"l\">sotildi</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.active_hadya}</div><div class=\"l\">hozir hadyada</div></div>\n      <div class=\"kpi\"><div class=\"n\">${s.users}</div><div class=\"l\">foydalanuvchi</div></div>\n    </div>\n    ${s.top_regions.length ? `<div class=\"box\"><h2>Eng faol hududlar</h2>${s.top_regions.map(r =>\n      `<div class=\"bar\"><div class=\"row\"><span>${esc(r.region)}</span><b>${r.n}</b></div><div class=\"track\"><div class=\"fill\" style=\"width:${r.n / max * 100}%\"></div></div></div>`).join(\"\")}</div>` : \"\"}`;\n}\n\n/* ---------- AI savol-javob ---------- */\nlet ME = {is_admin:false, ai_left:5, ai_limit:5, ai_on:true}, chatHistory = [], asking = false;\nfunction refreshAiLeft() {\n  $(\"#aiLeft\").textContent = !ME.ai_on ? \"AI hali ulanmagan\" : ME.is_admin ? \"Admin: cheklovsiz\" : `Bugun ${ME.ai_left} ta savol qoldi`;\n}\n// AI javobidagi @username'larni bosiladigan havolaga aylantiradi\nfunction linkify(text) {\n  return esc(text).replace(/(^|[^\\w@])@([A-Za-z][A-Za-z0-9_]{3,31})\\b/g,\n    (m, pre, u) => `${pre}<a href=\"https://t.me/${u}\" data-tg=\"${u}\">@${u}</a>`);\n}\nfunction bubble(text, who) {\n  const d = document.createElement(\"div\");\n  d.className = \"bubble \" + who;\n  if (who === \"ai\") d.innerHTML = linkify(text); else d.textContent = text;\n  $(\"#chat\").append(d); d.scrollIntoView({behavior:\"smooth\", block:\"end\"});\n  return d;\n}\nasync function askAI(question) {\n  question = question.trim();\n  if (asking || question.length < 3) return;\n  if (!inTg) return $(\"#askErr\").textContent = \"Savol berish uchun ilovani bot orqali oching.\";\n  asking = true; $(\"#askBtn\").disabled = true; $(\"#askErr\").textContent = \"\"; $(\"#suggest\").hidden = true;\n  bubble(question, \"me\"); $(\"#q\").value = \"\"; autoGrow();\n  const wait = bubble(\"Javob yozilmoqda…\", \"ai wait\");\n  const j = await api(\"api/ask\", {method:\"POST\", headers:{\"Content-Type\":\"application/json\"}, body: JSON.stringify({question, history: chatHistory})});\n  wait.remove();\n  if (j.ok) {\n    bubble(j.answer, \"ai\");\n    chatHistory.push({role:\"user\", content:question}, {role:\"assistant\", content:j.answer});\n    chatHistory = chatHistory.slice(-6);\n    ME.ai_left = j.left; haptic(\"success\");\n  } else {\n    $(\"#askErr\").textContent = j.error || \"Xatolik yuz berdi.\";\n    if (!chatHistory.length && !$(\"#chat\").children.length) $(\"#suggest\").hidden = false;\n  }\n  refreshAiLeft(); asking = false; $(\"#askBtn\").disabled = false;\n}\nconst autoGrow = () => { const t = $(\"#q\"); t.style.height = \"auto\"; t.style.height = Math.min(t.scrollHeight, 120) + \"px\"; };\n$(\"#q\").addEventListener(\"input\", autoGrow);\n$(\"#q\").addEventListener(\"keydown\", e => { if (e.key === \"Enter\" && !e.shiftKey) { e.preventDefault(); askAI($(\"#q\").value); } });\n$(\"#askForm\").onsubmit = e => { e.preventDefault(); askAI($(\"#q\").value); };\n$$(\"#suggest button\").forEach(b => b.onclick = () => askAI(b.textContent));\n\n\n/* ---------- Navbat: kutayotgan e'lonlar va to'lov cheklari (faqat admin) ---------- */\nlet QUEUE = {pending: [], payments: [], reasons: {}}, qTab = \"pending\";\nfunction toast(msg) {\n  document.querySelector(\".toast\")?.remove();\n  const t = document.createElement(\"div\");\n  t.className = \"toast\"; t.textContent = msg;\n  document.body.append(t);\n  setTimeout(() => t.remove(), 2600);\n}\nfunction setQueueBadge() {\n  const n = QUEUE.pending.length + QUEUE.payments.length;\n  $(\"#qBadge\").hidden = !n; $(\"#qBadge\").textContent = n > 99 ? \"99+\" : n;\n}\nasync function refreshQueueBadge() {\n  const j = await api(\"api/admin/queue\");\n  if (!j.error) { QUEUE = j; setQueueBadge(); }\n}\nasync function loadQueue() {\n  const box = $(\"#queueBox\");\n  if (!box.innerHTML) box.innerHTML = `<div class=\"empty\">Navbat yuklanmoqda…</div>`;\n  const j = await api(\"api/admin/queue\");\n  if (j.error) return box.innerHTML = `<div class=\"empty\">${esc(j.error)}</div>`;\n  QUEUE = j;\n  if (!j.pending.length && j.payments.length) qTab = \"payments\";\n  renderQueue();\n}\nconst KIND_TAG = {hadya: [\"Hadya · BEPUL\", \"var(--lemon)\", \"var(--ink)\"], sotuv: [\"Sotuv\", \"var(--ink)\", \"#fff\"], reklama: [\"Reklama\", \"var(--blue)\", \"#fff\"]};\nfunction qCard(it, pay) {\n  const [kt, kb, kc] = KIND_TAG[it.kind];\n  const pics = it.media.map((m, i) => `<button data-zoom=\"${i}\" class=\"${m.type === \"video\" ? \"vid\" : \"\"}\" style=\"background-image:url('${m.thumb}')\" aria-label=\"Rasm ${i + 1}\"></button>`).join(\"\");\n  const rows = it.rows.filter(([k]) => k !== \"Manzil\").map(([k, v]) => `<div class=\"r\"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join(\"\");\n  const contact = [it.contact.phone && `📞 <a href=\"tel:${it.contact.phone.replace(/\\s/g, \"\")}\">${esc(it.contact.phone)}</a>`,\n    it.contact.username && `✈️ <a href=\"#\" data-tg=\"${esc(it.contact.username)}\">@${esc(it.contact.username)}</a>`].filter(Boolean).join(\" · \");\n  const age = it.hours ? `${it.hours} soat oldin` : \"hozirgina\";\n  return `<div class=\"qcard\" data-id=\"${it.id}\">\n    <div class=\"qtop\"><span class=\"kindtag\" style=\"background:${kb};color:${kc}\">${kt}</span><span>#${it.id} · ${age}</span></div>\n    ${pay ? (it.receipt ? `<img class=\"qreceipt\" src=\"${it.receipt}\" alt=\"To'lov cheki\" data-receipt>` : `<div class=\"qempty\">Chek rasmi topilmadi</div>`) : `<div class=\"qpics\">${pics}</div>`}\n    <h3>${esc(it.title)}</h3>\n    <div class=\"where\">${ICON.pin}${esc(it.place)}</div>\n    ${pay ? `<div class=\"sum\"><div class=\"r\"><span>To'lanishi kerak</span><b>${esc(it.price_due || \"\")}</b></div></div>` : `<div class=\"sum\">${rows}</div>`}\n    ${it.warn ? `<div class=\"qwarn\">⚠️ ${esc(it.warn)}</div>` : \"\"}\n    <div class=\"qwho\"><b>👤 ${esc(it.user.name || \"Foydalanuvchi\")}${it.user.profile ? ` · <a href=\"#\" data-tg=\"${esc(it.user.profile)}\">@${esc(it.user.profile)}</a>` : \"\"}</b>\n      <span>ID: ${it.user.id}${contact ? \" · \" + contact : \"\"}</span></div>\n    <div class=\"qbtns\">${pay\n      ? `<button class=\"no\" data-act=\"pay_no\">Chek noto'g'ri</button><button class=\"ok\" data-act=\"pay_ok\">✅ Pul tushdi — joylash</button>`\n      : `<button class=\"no\" data-act=\"reject\">Rad etish</button><button class=\"ok\" data-act=\"approve\">✅ ${it.kind === \"hadya\" ? \"Tasdiqlash\" : \"Tasdiqlash → to'lov\"}</button>`}</div>\n  </div>`;\n}\nfunction renderQueue() {\n  const box = $(\"#queueBox\"), n1 = QUEUE.pending.length, n2 = QUEUE.payments.length;\n  setQueueBadge();\n  const list = qTab === \"pending\" ? QUEUE.pending : QUEUE.payments;\n  box.innerHTML = `\n    <div class=\"qhead\"><h2>Navbat${n1 + n2 ? ` <b>${n1 + n2}</b>` : \"\"}</h2><button id=\"qReload\">↻ Yangilash</button></div>\n    <div class=\"seg\"><button data-tab=\"pending\" class=\"${qTab === \"pending\" ? \"on\" : \"\"}\">E'lonlar <b>${n1}</b></button>\n      <button data-tab=\"payments\" class=\"${qTab === \"payments\" ? \"on\" : \"\"}\">Cheklar <b>${n2}</b></button></div>\n    ${list.length ? list.map(it => qCard(it, qTab === \"payments\")).join(\"\")\n      : `<div class=\"qempty\"><span>🎉</span>${qTab === \"pending\" ? \"Yangi e'lonlar yo'q\" : \"Tekshiriladigan chek yo'q\"}<p class=\"sub\" style=\"margin:6px 0 0;font-weight:500\">Yangi so'rov kelsa, bot sizga bitta yig'ma xabar yuboradi.</p></div>`}`;\n  $(\"#qReload\").onclick = () => { loadQueue(); toast(\"Yangilandi\"); };\n  box.querySelectorAll(\"[data-tab]\").forEach(b => b.onclick = () => { qTab = b.dataset.tab; renderQueue(); });\n  box.querySelectorAll(\".qcard\").forEach(card => {\n    const it = list.find(x => x.id === +card.dataset.id);\n    card.querySelectorAll(\"[data-zoom]\").forEach(b => b.onclick = () => zoom(it.media[+b.dataset.zoom]));\n    card.querySelector(\"[data-receipt]\")?.addEventListener(\"click\", () => zoom({type: \"photo\", url: it.receipt}));\n    card.querySelectorAll(\"[data-act]\").forEach(b => b.onclick = () => decide(it, b.dataset.act, card));\n  });\n}\nfunction zoom(m) {\n  const z = openModal(`${m.type === \"video\" ? `<video class=\"zoom\" src=\"${m.url}\" controls autoplay playsinline></video>` : `<img class=\"zoom\" src=\"${m.url}\" alt=\"\">`}\n    <div class=\"mbtns\"><button class=\"btn ghost\" data-x>Yopish</button></div>`, {center: true});\n  z.el.querySelector(\"[data-x]\").onclick = () => z.close();\n  z.bg.onclick = e => { if (e.target === z.bg) z.close(); };\n}\nfunction pickReason(it) {\n  return new Promise(res => {\n    const r = Object.entries(QUEUE.reasons).map(([k, t], i) => `<input type=\"radio\" name=\"rj\" id=\"rj-${k}\" value=\"${k}\"${i ? \"\" : \" checked\"}><label for=\"rj-${k}\">${esc(t)}</label>`).join(\"\");\n    const m = openModal(`<h2>Nima uchun rad etiladi?</h2><p class=\"lead\"><b>#${it.id} · ${esc(it.title)}</b><br>Sabab foydalanuvchiga yuboriladi.</p>\n      <div class=\"chips\" style=\"flex-direction:column;align-items:stretch\">${r}</div>\n      <div class=\"mbtns\"><button class=\"btn ghost\" data-no>Bekor qilish</button><button class=\"btn danger\" data-yes>Rad etish</button></div>`);\n    m.el.querySelector(\"[data-no]\").onclick = () => { m.close(); res(null); };\n    m.el.querySelector(\"[data-yes]\").onclick = () => { const v = m.el.querySelector('input[name=\"rj\"]:checked')?.value; m.close(); res(v); };\n  });\n}\nasync function decide(it, act, card) {\n  let reason = null;\n  if (act === \"reject\") { reason = await pickReason(it); if (!reason) return; }\n  else {\n    const t = {\n      approve: [it.kind === \"hadya\" ? \"Kanalga joylansinmi?\" : \"E'lon ma'qullansinmi?\",\n        it.kind === \"hadya\" ? \"E'lon darhol kanalga va ilovaga chiqadi, egasiga xabar boradi.\" : `Foydalanuvchiga ${esc(QUEUE.price_text)} to'lov ma'lumoti yuboriladi.`, \"Ha, tasdiqlash\"],\n      pay_ok: [\"Pul tushdimi?\", \"E'lon darhol kanalga joylanadi.\", \"Ha, joylash\"],\n      pay_no: [\"Chek noto'g'rimi?\", \"Foydalanuvchidan to'g'ri chekni qayta yuborish so'raladi.\", \"Ha, rad etish\"],\n    }[act];\n    if (!await confirmBox({title: t[0], text: `<b>#${it.id} · ${esc(it.title)}</b><br>${t[1]}`, ok: t[2], cancel: \"Yo'q\", danger: act === \"pay_no\"})) return;\n  }\n  card.querySelectorAll(\"button\").forEach(b => b.disabled = true);\n  const r = await api(`api/admin/queue/${it.id}`, {method: \"POST\", headers: {\"Content-Type\": \"application/json\"}, body: JSON.stringify({action: act, reason})});\n  if (!r.ok) { say(r.error || \"Xatolik.\"); return loadQueue(); }\n  haptic(\"success\");\n  toast({approve: it.kind === \"hadya\" ? \"✅ Kanalga joylandi\" : \"✅ To'lov ma'lumoti yuborildi\", reject: \"Rad etildi\", pay_ok: \"✅ Kanalga joylandi\", pay_no: \"Chek rad etildi\"}[act]);\n  card.classList.add(\"gone\");\n  setTimeout(() => {\n    QUEUE.pending = QUEUE.pending.filter(x => x.id !== it.id);\n    QUEUE.payments = QUEUE.payments.filter(x => x.id !== it.id);\n    renderQueue(); loadAdmin();\n  }, 260);\n}\n\n/* ---------- admin panel ---------- */\nasync function loadAdmin() {\n  const j = await api(\"api/admin/overview\");\n  if (j.error) return $(\"#adminBox\").innerHTML = `<div class=\"empty\">${esc(j.error)}</div>`;\n  const c = j.counts, n = k => c[k] || 0;\n  const kpi = (v, l, alert) => `<div class=\"kpi${alert && v ? \" alert\" : \"\"}\"><div class=\"n\">${v}</div><div class=\"l\">${l}</div></div>`;\n  $(\"#adminBox\").innerHTML = `\n    <div class=\"kpis\">\n      ${kpi(n(\"awaiting_payment\"), \"to'lov kutilmoqda\")}\n      ${kpi(j.today, \"oxirgi 24 soatda yangi\")}\n      ${kpi(n(\"published\"), \"kanalda faol\")}\n      ${kpi(n(\"given\"), \"berildi\")}\n      ${kpi(n(\"sold\"), \"sotildi\")}\n      ${kpi(j.users, \"foydalanuvchi\")}\n    </div>\n    ${j.ai_on ? \"\" : `<div class=\"warn\">${ICON.warn}<span>AI savol-javob o'chiq. Cloudflare'da OPENAI_API_KEY qo'shilsa yoqiladi.</span></div>`}`;\n  $(\"#sPrice\").value = j.settings.price; $(\"#sCard\").value = j.settings.card; $(\"#sOwner\").value = j.settings.card_owner;\n  const hours = `<option value=\"off\">O'chirilgan</option>` + Array.from({length: 24}, (_, h) => `<option value=\"${h}\">${String(h).padStart(2, \"0\")}:00</option>`).join(\"\");\n  $(\"#sQuietFrom\").innerHTML = $(\"#sQuietTo\").innerHTML = hours;\n  $(\"#sQuietFrom\").value = j.settings.quiet_from; $(\"#sQuietTo\").value = j.settings.quiet_to;\n}\nasync function saveQuiet() {\n  let f = $(\"#sQuietFrom\").value, t = $(\"#sQuietTo\").value;\n  if (f === \"off\" || t === \"off\") { f = t = \"off\"; $(\"#sQuietFrom\").value = $(\"#sQuietTo\").value = \"off\"; }\n  const r = await api(\"api/admin/settings\", {method: \"POST\", headers: {\"Content-Type\": \"application/json\"},\n    body: JSON.stringify({price: $(\"#sPrice\").value, quiet_from: f, quiet_to: t})});\n  if (r.ok) toast(f === \"off\" ? \"Tinch soatlar o'chirildi\" : `Tinch soatlar: ${f.padStart(2, \"0\")}:00 – ${t.padStart(2, \"0\")}:00`); else say(r.error);\n}\n$(\"#sQuietFrom\").onchange = $(\"#sQuietTo\").onchange = saveQuiet;\n$(\"#saveSettings\").onclick = async () => {\n  const r = await api(\"api/admin/settings\", {method:\"POST\", headers:{\"Content-Type\":\"application/json\"},\n    body: JSON.stringify({price: $(\"#sPrice\").value, card: $(\"#sCard\").value, card_owner: $(\"#sOwner\").value,\n      quiet_from: $(\"#sQuietFrom\").value || \"off\", quiet_to: $(\"#sQuietTo\").value || \"off\"})});\n  if (r.ok) { haptic(\"success\"); CONFIG.price_text = r.price_text; $$(\".js-price\").forEach(e => e.textContent = r.price_text); say(\"Saqlandi\"); }\n  else say(r.error);\n};\n\ndocument.addEventListener(\"click\", e => {\n  const a = e.target.closest(\"a[data-tg]\");\n  if (a) { e.preventDefault(); openTg(\"https://t.me/\" + a.dataset.tg); return; }\n  if (e.target.closest(\"[data-admin]\") && CONFIG.admin) openTg(\"https://t.me/\" + CONFIG.admin);\n});\n\n/* ---------- ishga tushirish ---------- */\n(async () => {\n  if (inTg) {\n    tg.ready(); tg.expand();\n    tg.MainButton.setParams({color: \"#FFD84A\", text_color: \"#12123A\"});\n    try { tg.setBackgroundColor(\"#F4F1EA\"); tg.setBottomBarColor?.(\"#F4F1EA\"); } catch {}\n    headerColor(\"#2D46F0\");\n  } else $(\"#outside\").hidden = false;\n  const [regions, config, stats] = await Promise.all([\n    fetch(\"regions.json\").then(r => r.json()).catch(() => []), api(\"api/config\"), api(\"api/stats\")]);\n  REGIONS = regions; if (config.price_text) CONFIG = config;\n  setSticker(stats);\n  fillRegions($(\"#fRegion\"), \"Barcha hududlar\");\n  fillRegions($(\"#region\"), \"Tanlang…\");\n  $$(\".js-price\").forEach(e => e.textContent = CONFIG.price_text);\n  $$(\".js-admin\").forEach(e => e.hidden = !CONFIG.admin);\n  $(\"#tg_username\").value = myUsername();\n  search();\n  // Ulashilgan e'lon: bot tugmasi #l123 bilan ochadi; t.me/<bot>/<app>?startapp=l123 bo'lsa start_param keladi\n  const shared = (location.hash.match(/^#l(\\d+)$/) || String(tg?.initDataUnsafe?.start_param || \"\").match(/^l(\\d+)$/) || [])[1];\n  if (shared) openDetail(+shared);\n  if (inTg) {\n    const me = await api(\"api/me\");\n    if (!me.error) ME = me;\n    $(\"#navAdmin\").hidden = !ME.is_admin;\n    $(\"#adminFilter\").hidden = !ME.is_admin;\n    if (ME.is_admin && (location.hash === \"#admin\" || location.hash === \"#queue\")) show(\"admin\");\n    if (ME.is_admin) refreshQueueBadge();\n  }\n  refreshAiLeft();\n})();\n</script>\n</body>\n</html>\n";
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
  contact: "Ko'rsatilgan Telegram username sizniki emas",
};
const S = {
  PENDING: "pending", AWAIT_PAY: "awaiting_payment", PAY_REVIEW: "payment_review", PUBLISHING: "publishing",
  PUBLISHED: "published", GIVEN: "given", SOLD: "sold", CLOSED: "closed", REJECTED: "rejected", EXPIRED: "expired",
  REPORTED: "reported",
};
const STATUS_TEXT = {
  pending: "Admin tekshiruvida", awaiting_payment: "To'lov kutilmoqda", payment_review: "Chek tekshirilmoqda",
  publishing: "Joylanmoqda", published: "Kanalda", given: "Berildi", sold: "Sotildi", closed: "Dolzarb emas",
  rejected: "Rad etildi", expired: "Muddati o'tdi", hidden: "Ilovadan olingan",
  reported: "Shikoyat sabab tekshiruvda",
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
const BLOCKED_DAYS = 15; // egasi botni bloklagan bo'lsa (savol yetib bormasa), shuncha kundan keyin yopiladi
const ASK_MAX_TRIES = 5; // savol vaqtinchalik xato tufayli shuncha marta yetmasa — bloklangan deb hisoblanadi
const REPORTS_PER_DAY = 5; // bir kishi kuniga ko'pi bilan shuncha shikoyat yubora oladi
const REPORT_HIDE = 3; // shuncha xil odam shikoyat qilsa, e'lon ilovadan vaqtincha yashiriladi
const REPORTER_MIN_DAYS = 7; // shikoyati «yashirish»ga hisoblanishi uchun akkaunt botda kamida shuncha kun bo'lsin
// Cloudflare bepul tarifida bitta ishga tushishda ~50 ta tashqi so'rov (Telegram + baza) mumkin.
// Fon vazifalari shu chegaradan oshmaslik uchun o'z so'rovlarini sanaydi va zaxira qoldiradi.
const RUN_BUDGET = 40;
const PAY_REMIND_HOURS = 24; // to'lov muddati tugashiga shuncha soat qolganda eslatma
const ADMIN_REMIND_HOURS = 6; // admin shuncha soatdan beri ko'rmagan e'lonlar haqida eslatma
const TEMP_KEEP_DAYS = 2; // vaqtinchalik sozlamalar (albom, chek tanlovi) shuncha kun saqlanadi
// Shu holatdagi e'lonlar hammaga ochiq (ilovada ko'rinadi)
const PUBLIC_STATUSES = ["published", "given", "sold", "closed"];
// E'lon yopilishi mumkin bo'lgan holatlar: kanalda faol yoki shikoyat sabab vaqtincha yashirilgan
const OPEN_STATUSES = ["published", "reported"];

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
  "ALTER TABLE listings ADD COLUMN ask_tries INTEGER", // «Hali dolzarbmi?» savolini yuborishga urinishlar
  "ALTER TABLE listings ADD COLUMN ask_blocked INTEGER", // savol yetmadi (egasi botni bloklagan)
  // admin «Qaytarish» bosgandagi oxirgi shikoyat raqami (rowid): faqat undan keyingi shikoyatlar sanaladi
  "ALTER TABLE listings ADD COLUMN reports_after INTEGER",
  "CREATE INDEX IF NOT EXISTS ix_reports_user ON reports(user_id, created_at)",
  "ALTER TABLE listings ADD COLUMN close_reply_msg INTEGER", // kanaldagi «✅ Berildi» javobi (qayta faollashtirilsa o'chiriladi)
];
// Sxema o'zgarsa shu raqam oshiriladi — shunda migratsiyalar bir marta qayta ishga tushadi
const SCHEMA_VERSION = "4";
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
  if (env.__ops) env.__ops.n++; // fon vazifasida so'rovlar sanaladi
  const r = await fetch(`${base}/bot${env.BOT_TOKEN}/${method}`, opts);
  const j = await r.json().catch(() => ({ ok: false, error_code: r.status, description: `HTTP ${r.status}` }));
  if (!j.ok) {
    const e = new Error(`${method}: ${j.description}`);
    e.code = j.error_code || 0; // 403 — foydalanuvchi botni bloklagan; 429/5xx — vaqtincha xato
    throw e;
  }
  return j.result;
}
// Xabar yuborish natijasi: { ok: true } | { ok: false, blocked: true/false }.
// blocked — doimiy xato (bot bloklangan yoki akkaunt o'chirilgan); aks holda keyinroq qayta urinish mumkin.
async function tgSend(env, body) {
  try {
    return { ok: true, result: await tg(env, "sendMessage", body) };
  } catch (e) {
    console.log(e.message);
    return { ok: false, blocked: e.code === 403 };
  }
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
// Formaga yozilgan username Telegram profilidagidan farq qilsa, adminga ogohlantirish matni.
// (Bot API username bo'yicha akkaunt egasini aniqlay olmaydi, shuning uchun qarorni admin qiladi.)
function usernameWarning(formName, profileName) {
  if (!formName || (profileName && formName.toLowerCase() === profileName.toLowerCase())) return "";
  return `\n⚠️ <b>Username egasiniki bo'lmasligi mumkin</b>: formada @${esc(formName)}, ` +
    (profileName ? `profilda @${esc(profileName)}` : "profilda username yo'q");
}

// Foydalanuvchi yuborgan rasm/videolarni Telegram'ga yuklab, file_id'larini saqlaydi.
// Yuklash uchun joy kerak: STORAGE_CHAT (ixtiyoriy, maxfiy guruh/kanal ID) yoki birinchi admin chati —
// admin chatiga ovozsiz yuklanadi va darhol o'chiriladi (chat toza qoladi, e'lonlar «Navbat»da ko'rinadi).
async function storeMedia(env, l, files) {
  const targets = env.STORAGE_CHAT ? [env.STORAGE_CHAT] : adminIds(env);
  for (const chat of targets) {
    try {
      const fd = new FormData();
      fd.append("chat_id", String(chat));
      fd.append("disable_notification", "true");
      fd.append("media", JSON.stringify(mediaItems(files.map((f, i) => ({ type: f.type, media: `attach://f${i}` })), "")));
      files.forEach((f, i) => fd.append(`f${i}`, f.file, f.name));
      const msgs = await tg(env, "sendMediaGroup", fd);
      const stored = msgs.map((m) => {
        if (m.video) return { type: "video", file_id: m.video.file_id, thumb: m.video.thumbnail?.file_id || null };
        if (m.photo) return { type: "photo", file_id: m.photo.at(-1).file_id, thumb: m.photo[Math.min(1, m.photo.length - 1)].file_id };
        throw new Error("BAD_VIDEO");
      });
      if (!env.STORAGE_CHAT) {
        for (const m of msgs) await tgSafe(env, "deleteMessage", { chat_id: chat, message_id: m.message_id });
      }
      await updateListing(env, l.id, { media: JSON.stringify(stored) });
      return;
    } catch (e) {
      if (e.message === "BAD_VIDEO") throw e;
      console.log(`Rasm ${chat} ga yuklanmadi: ${e.message}`);
    }
  }
  throw new Error("Rasmlarni yuklab bo'lmadi");
}

// ---------------------------------------------------------------- Navbat: adminlarga bitta yig'ma xabar
// Har bir e'lon uchun alohida xabar o'rniga har bir adminda BITTA xabar turadi:
// «📥 3 ta e'lon, 1 ta chek kutmoqda» + «Ko'rib chiqish» tugmasi (Mini App'dagi Navbat bo'limi).
//  • yangi so'rov kelsa — eski xabar o'chirilib, yangisi yuboriladi (bildirishnoma keladi);
//  • so'rov ko'rib chiqilsa — xabar joyida yangilanadi (bezovta qilmaydi), navbat bo'shasa — o'chiriladi;
//  • tinch soatlarda xabar ovozsiz keladi; tinch soatlar tugagach navbatda hali so'rov bo'lsa — ovozli eslatma.
const QUIET_DEFAULT = { from: 23, to: 8 };
const tashkentHour = () => new Date(Date.now() + 5 * 3600e3).getUTCHours();
async function quietHours(env) {
  const f = await getSetting(env, "quiet_from", String(QUIET_DEFAULT.from));
  const t = await getSetting(env, "quiet_to", String(QUIET_DEFAULT.to));
  if (f === "" || t === "" || f === "off") return null;
  return { from: Number(f), to: Number(t) };
}
async function isQuietNow(env) {
  const q = await quietHours(env);
  if (!q || q.from === q.to) return false;
  const h = tashkentHour();
  return q.from < q.to ? h >= q.from && h < q.to : h >= q.from || h < q.to;
}
async function queueCounts(env) {
  const { results } = await env.DB.prepare(
    "SELECT status, COUNT(*) AS n, MIN(created_at) AS oldest FROM listings WHERE status IN (?,?) GROUP BY status"
  ).bind(S.PENDING, S.PAY_REVIEW).all();
  const by = Object.fromEntries(results.map((r) => [r.status, r]));
  const oldest = Math.min(...results.map((r) => r.oldest));
  return { pending: by[S.PENDING]?.n || 0, pay: by[S.PAY_REVIEW]?.n || 0, oldest: Number.isFinite(oldest) ? oldest : null };
}
function queueText(c, quiet) {
  const lines = ["📥 <b>Tekshiruvni kutmoqda</b>"];
  if (c.pending) lines.push(`• ${c.pending} ta yangi e'lon`);
  if (c.pay) lines.push(`• ${c.pay} ta to'lov cheki`);
  if (c.oldest) {
    const h = Math.floor((now() - c.oldest) / 3600);
    lines.push("", `⏱ Eng eskisi: ${h ? h + " soat oldin" : "1 soatdan kam"}`);
  }
  lines.push("", "Pastdagi tugma orqali ilovada ko'rib chiqing.");
  if (quiet) lines.push("🌙 Tinch soatlar — xabar ovozsiz keldi.");
  return lines.join("\n");
}
// notify: true — yangi so'rov keldi (adminga bildirishnoma kerak); resend: true — eslatma (cron)
async function refreshQueueNotice(env, { notify = false, resend = false } = {}) {
  const c = await queueCounts(env);
  const total = c.pending + c.pay;
  const prev = Number(await getSetting(env, "q_total", 0));
  const quiet = await isQuietNow(env);
  const fresh = (notify && total > prev) || resend;
  const app = await getSetting(env, "app_url");
  const kb = app ? { inline_keyboard: [[{ text: "📋 Ko'rib chiqish", web_app: { url: app + "/#queue" } }]] } : undefined;
  const text = queueText(c, quiet && fresh);
  for (const admin of adminIds(env)) {
    const key = `qmsg:${admin}`;
    const mid = Number(await getSetting(env, key, 0));
    if (!total) {
      if (mid) await tgSafe(env, "deleteMessage", { chat_id: admin, message_id: mid });
      if (mid) await setSetting(env, key, null);
      continue;
    }
    if (mid && !fresh) {
      try {
        await tg(env, "editMessageText", { chat_id: admin, message_id: mid, text, parse_mode: "HTML", reply_markup: kb });
        continue;
      } catch (e) {
        if (/not modified/.test(e.message)) continue;
        // xabar o'chirilgan bo'lsa — yangisi yuboriladi (pastda)
      }
    }
    if (mid) await tgSafe(env, "deleteMessage", { chat_id: admin, message_id: mid });
    const sent = await tgSafe(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", reply_markup: kb, disable_notification: quiet });
    if (sent) await setSetting(env, key, sent.message_id);
  }
  await setSetting(env, "q_total", total);
  if (fresh) {
    await setSetting(env, "q_notified_at", now());
    await setSetting(env, "q_quiet_pending", quiet && total ? 1 : null); // tinch soatda kelgan — ertalab ovozli eslatiladi
  }
  return c;
}

// Navbatdagi qaror (Mini App'dan ham, eski bot tugmalaridan ham shu funksiya chaqiriladi).
// action: approve | reject | pay_ok | pay_no.  Natija: { ok, text } yoki { error }
async function moderate(env, l, action, reasonKey, who) {
  const id = l.id;
  if (action === "approve" || action === "reject") {
    if (l.status !== S.PENDING) return { error: "Bu e'lon allaqachon ko'rib chiqilgan." };
    if (action === "reject") {
      const reason = REJECT_REASONS[reasonKey] || REJECT_REASONS.rules;
      if (!(await changeStatus(env, id, S.PENDING, S.REJECTED, { reject_reason: reason }))) return { error: "Boshqa admin ulgurdi." };
      await tgSafe(env, "sendMessage", {
        chat_id: l.user_id,
        text: `😔 E'loningiz (#${id}) qabul qilinmadi.\nSabab: ${reason}\n\nTo'g'irlab, ilova orqali qayta yuborishingiz mumkin.`,
      });
      return { ok: true, text: `❌ #${id} rad etildi: ${reason} — ${who}` };
    }
    if (l.kind === "hadya") {
      if (!(await changeStatus(env, id, S.PENDING, S.PUBLISHING))) return { error: "Boshqa admin ulgurdi." };
      try {
        const link = await publish(env, id);
        return { ok: true, text: `✅ #${id} kanalga joylandi — ${who}\n${link}`, link };
      } catch (e) {
        await updateListing(env, id, { status: S.PENDING });
        return { error: `Kanalga joylanmadi: ${e.message}`.slice(0, 190) };
      }
    }
    if (!(await getSetting(env, "card"))) return { error: "Avval karta raqamini kiriting: admin panel → To'lov sozlamalari yoki /karta" };
    if (!(await changeStatus(env, id, S.PENDING, S.AWAIT_PAY))) return { error: "Boshqa admin ulgurdi." };
    await askPayment(env, l);
    return { ok: true, text: `✅ #${id} ma'qullandi, to'lov kutilmoqda — ${who}` };
  }
  if (action === "pay_ok" || action === "pay_no") {
    if (l.status !== S.PAY_REVIEW) return { error: "Bu chek allaqachon ko'rib chiqilgan." };
    if (action === "pay_no") {
      if (!(await changeStatus(env, id, S.PAY_REVIEW, S.AWAIT_PAY, { receipt_file_id: null }))) return { error: "Boshqa admin ulgurdi." };
      await tgSafe(env, "sendMessage", {
        chat_id: l.user_id,
        text: `⚠️ E'lon #${id} uchun yuborilgan chek tasdiqlanmadi. Pul tushganini tekshirib, to'g'ri chekni qayta yuboring.`,
      });
      return { ok: true, text: `❌ #${id} cheki rad etildi — ${who}` };
    }
    if (!(await changeStatus(env, id, S.PAY_REVIEW, S.PUBLISHING))) return { error: "Boshqa admin ulgurdi." };
    try {
      const link = await publish(env, id);
      return { ok: true, text: `✅ #${id}: to'lov tasdiqlandi va kanalga joylandi — ${who}\n${link}`, link };
    } catch (e) {
      await updateListing(env, id, { status: S.PAY_REVIEW });
      return { error: `Kanalga joylanmadi: ${e.message}`.slice(0, 190) };
    }
  }
  return { error: "Noma'lum amal." };
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

// Kanaldagi postni e'lonning hozirgi holatiga moslab qayta yozadi.
// closedAs: "given" | "sold" | "closed" — yopilgan ko'rinish (kontaktlarsiz); null — faol ko'rinish.
async function refreshChannelPost(env, l, closedAs = null) {
  if (!l.channel_msg_id) return;
  if (l.data.raw !== undefined) {
    // Kanaldan import qilingan post: asl matn va formatlash saqlanadi, faqat kontakt qatorlari almashtiriladi
    const isCap = l.media.length > 0;
    const { text, entities } = closedAs
      ? closedRaw(l, closedAs, isCap ? 1024 : 4096)
      : { text: String(l.data.raw).slice(0, isCap ? 1024 : 4096), entities: Array.isArray(l.data.entities) ? l.data.entities : [] };
    await tgSafe(env, isCap ? "editMessageCaption" : "editMessageText", {
      chat_id: env.CHANNEL, message_id: l.channel_msg_id, [isCap ? "caption" : "text"]: text,
      ...(entities.length ? { [isCap ? "caption_entities" : "entities"]: entities } : {}),
    });
  } else {
    const bot = await botUsername(env);
    await tgSafe(env, "editMessageCaption", {
      chat_id: env.CHANNEL, message_id: l.channel_msg_id, caption: caption(env, l, bot, closedAs), parse_mode: "HTML",
    });
  }
}

async function closeListing(env, l, status) {
  if (!(await changeStatus(env, l.id, OPEN_STATUSES, status, { closed_at: now() }))) return false;
  await refreshChannelPost(env, l, status);
  // «Berildi»/«Sotildi» — kanalga qisqa javob ham yoziladi (quvonchli xabar).
  // «Dolzarb emas» — faqat post tahrirlanadi, kanalga alohida xabar yuborilmaydi.
  if (status !== "closed") {
    const reply = await tgSafe(env, "sendMessage", {
      chat_id: env.CHANNEL, text: CLOSED_REPLY[status],
      reply_parameters: { message_id: l.channel_msg_id, allow_sending_without_reply: true },
    });
    // e'lon qayta faol qilinsa, bu javob o'chiriladi
    if (reply) await updateListing(env, l.id, { close_reply_msg: reply.message_id });
  }
  return true;
}

// Yopilgan e'lonni (berildi / sotildi / dolzarb emas / shikoyat sabab yashirilgan) yana faol qilish — faqat admin.
async function reopenListing(env, l) {
  const fields = { closed_at: null, check_at: now() + CHECK_DAYS * DAY, asked_at: null, ask_tries: null, ask_blocked: null, close_reply_msg: null };
  if (l.status === S.REPORTED) {
    fields.reports_after = await env.DB.prepare("SELECT COALESCE(MAX(rowid), 0) AS n FROM reports").first("n");
  }
  if (!(await changeStatus(env, l.id, [S.GIVEN, S.SOLD, S.CLOSED, S.REPORTED], S.PUBLISHED, fields))) return false;
  if (l.status !== S.REPORTED) await refreshChannelPost(env, l, null); // kontaktlar postga qaytadi
  if (l.close_reply_msg) await tgSafe(env, "deleteMessage", { chat_id: env.CHANNEL, message_id: l.close_reply_msg });
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

// E'lon turini aniqlovchi hashtaglar (aynan shu so'zlar; #hadyagamushuklar kabi kanal teglari hisobga olinmaydi)
const KIND_TAGS = { reklama: ["#reklama"], sotuv: ["#sotiladi", "#sotuv"], hadya: ["#hadyaga", "#hadya", "#bepul"] };
function kindByTags(text) {
  const tags = (String(text).match(/#[\p{L}\p{N}_]+/gu) || []).map((x) => normTxt(x).replace(/ /g, "_"));
  return Object.keys(KIND_TAGS).find((k) => KIND_TAGS[k].some((tag) => tags.includes(tag))) || null;
}

// strict = true — faqat e'lon hashtagi bo'lgan post qabul qilinadi (kanalga avtomatik joylanganlar uchun).
// strict = false — admin o'zi forward qilgan post: hashtag bo'lmasa, matndagi so'zlarga qarab taxmin qilinadi.
function parsePost(text, skipNames, strict = false) {
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
  let kind = kindByTags(t);
  if (!kind && !strict) {
    // @kanal / t.me havolalari va teglar olib tashlanadi — aks holda «@Hadyagamushuklar» ham «hadya» deb topilardi
    const plain = low.replace(/@[\w.]+|t\.me\/\S+|#\S+/g, " ");
    kind = /\bhadya|\bbepul|\btekin/.test(plain) ? "hadya" : /\bnarx/.test(plain) ? "sotuv" : null;
  }
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

async function importPost(env, m, chMsgId, chUsername, date, doneMode = false, strict = false) {
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
  const p = parsePost(text, skip, strict);
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
  if (!OPEN_STATUSES.includes(l.status)) return undefined;
  const row = [];
  if (l.kind === "hadya") row.push({ text: "✅ Berildi", callback_data: `a:given:${l.id}` });
  if (l.kind === "sotuv") row.push({ text: "✅ Sotildi", callback_data: `a:sold:${l.id}` });
  row.push({ text: "⛔️ Dolzarb emas", callback_data: `a:closed:${l.id}` });
  const kb = [row];
  // Shikoyat sabab yashirilgan e'lonni admin ilovaga qaytara oladi
  if (l.status === S.REPORTED) kb.push([{ text: "↩️ Ilovaga qaytarish (shikoyat asossiz)", callback_data: `a:restore:${l.id}` }]);
  kb.push([{ text: "🗑 Ilovadan olib tashlash", callback_data: `a:hide:${l.id}` }]);
  return { inline_keyboard: kb };
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

// Kanalga admin o'zi joylagan post ilovaga FAQAT e'lon bo'lsa qo'shiladi: rasm/video bo'lishi va matnida
// #hadyaga, #sotiladi yoki #reklama hashtagi bo'lishi shart. Oddiy xabarlar («Assalomu alaykum...»,
// e'lonlar, reklama bo'lmagan postlar) e'tiborsiz qoldiriladi.
async function onChannelPost(env, m) {
  const ch = String(env.CHANNEL || "").replace(/^@/, "").toLowerCase();
  if ((m.chat.username || "").toLowerCase() !== ch && String(m.chat.id) !== String(env.CHANNEL)) return;
  if (m.media_group_id && !m.caption) return attachAlbumItem(env, m);
  if (!m.photo && !m.video) return;
  if (!kindByTags(m.caption || "")) return;
  await importPost(env, m, m.message_id, m.chat.username, m.date, false, true);
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
    "Yangi e'lonlar va cheklar — ilovadagi Admin → Navbat bo'limida\n" +
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
  // Chek adminlarga alohida yuborilmaydi — Mini App'dagi «Navbat»da ko'rinadi, botda yig'ma xabar yangilanadi
  await refreshQueueNotice(env, { notify: true });
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
    if (!OPEN_STATUSES.includes(l.status)) {
      await setKb(null);
      return answer("Bu e'lon allaqachon yopilgan.", true);
    }
    if (a === "keep") {
      await updateListing(env, l.id, { check_at: now() + CHECK_DAYS * DAY, asked_at: null, ask_tries: null, ask_blocked: null });
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
      if (!(await changeStatus(env, id, [S.PUBLISHED, S.REPORTED, S.GIVEN, S.SOLD, S.CLOSED], "hidden"))) return answer("Holati allaqachon o'zgargan.", true);
      await done(`🗑 #${id} ilovadan olib tashlandi (kanaldagi post o'zgarmadi) — ${who}`);
      return answer("Olib tashlandi");
    }
    // Shikoyat asossiz: e'lon ilovaga qaytadi, eski shikoyatlar endi hisobga olinmaydi
    if (a === "restore") {
      const lastReport = await env.DB.prepare("SELECT COALESCE(MAX(rowid), 0) AS n FROM reports").first("n");
      if (!(await changeStatus(env, id, S.REPORTED, S.PUBLISHED, { reports_after: lastReport }))) return answer("Holati allaqachon o'zgargan.", true);
      await done(`↩️ #${id} ilovaga qaytarildi, shikoyatlar asossiz deb topildi — ${who}`);
      if (l.user_id) await tgSafe(env, "sendMessage", { chat_id: l.user_id, text: `✅ E'loningiz #${id} tekshirildi va ilovaga qaytarildi.` });
      return answer("Qaytarildi");
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
    if (a === "r" || a === "ok") {
      const res = await moderate(env, l, a === "r" ? "reject" : "approve", extra, who);
      if (res.error) return answer(res.error, true);
      await done(res.text, "admin_msgs", l);
      await refreshQueueNotice(env);
      return answer(a === "r" ? "Rad etildi" : "Bajarildi");
    }
  }

  // Admin: to'lov chekini tekshirish
  if (ns === "p") {
    if (l.status !== S.PAY_REVIEW) {
      await setKb(null);
      return answer("Bu chek allaqachon ko'rib chiqilgan.", true);
    }
    if (a === "no" || a === "ok") {
      const res = await moderate(env, l, a === "ok" ? "pay_ok" : "pay_no", null, who);
      if (res.error) return answer(res.error, true);
      await done(res.text, "pay_msgs", l);
      await refreshQueueNotice(env);
      return answer(a === "ok" ? "Joylandi" : "");
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

// Admin ro'yxatda faol bo'lmagan e'lonlarni ham ko'ra oladi: status=closed (berildi/sotildi/dolzarb emas), reported
const ADMIN_FILTERS = { published: [S.PUBLISHED], closed: [S.GIVEN, S.SOLD, S.CLOSED], reported: [S.REPORTED] };
async function apiListings(env, request, url) {
  const q = url.searchParams;
  let statuses = [S.PUBLISHED];
  const want = q.get("status");
  const admin = want && want !== "published" ? await requireAdmin(env, request) : null;
  if (admin && ADMIN_FILTERS[want]) statuses = ADMIN_FILTERS[want];
  let sql = `SELECT * FROM listings WHERE status IN (${statuses.map(() => "?").join(",")})`;
  const args = [...statuses];
  for (const col of ["kind", "region", "district"]) {
    const v = q.get(col);
    if (v) {
      sql += ` AND ${col}=?`;
      args.push(v);
    }
  }
  const offset = Math.max(0, parseInt(q.get("offset") || "0", 10) || 0);
  sql += ` ORDER BY ${statuses[0] === S.PUBLISHED ? "published_at" : "COALESCE(closed_at, published_at)"} DESC LIMIT 20 OFFSET ?`;
  const { results } = await env.DB.prepare(sql).bind(...args, offset).all();
  const items = await Promise.all(results.map((r) => privateCard(env, parseRow(r))));
  return json({ items, more: results.length === 20 });
}

async function apiDetail(env, request, id) {
  const l = await getListing(env, id);
  if (!l) return err("E'lon topilmadi", 404);
  const auth = await authUser(env, request.headers.get("x-init-data"));
  const isAdm = !!(auth && isAdmin(env, auth.id));
  // Admin shikoyat sabab yashirilgan va ilovadan olingan e'lonlarni ham ko'radi
  if (!PUBLIC_STATUSES.includes(l.status) && !(isAdm && [S.REPORTED, "hidden"].includes(l.status))) return err("E'lon topilmadi", 404);
  const d = l.data;
  const open = l.status === S.PUBLISHED;
  // Kontaktlar (telefon, username) faqat Telegram ichidan ochilgan ilovaga beriladi —
  // shunda skript bilan barcha raqamlarni yig'ib olib bo'lmaydi
  const viewer = open || isAdm ? auth : null;
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
  const hasContact = (open || isAdm) && (l.username || d.phone);
  const key = PUBLIC_STATUSES.includes(l.status) ? "" : await mediaKey(env, l.id);
  return json({
    ...card(l, key), rows, text,
    post: l.channel_username ? `https://t.me/${l.channel_username}/${l.channel_msg_id}` : null,
    media: l.media.map((m, i) => ({ type: m.type, url: `api/media/${l.id}/${i}${key ? "?k=" + key : ""}` })),
    // Admin uchun: tahrirlash formasini to'ldirish uchun xom ma'lumot
    admin: isAdm ? {
      kind: l.kind, region: l.region, district: l.district, username: l.username || "", imported: !!d.imported,
      raw: d.imported ? d.raw : null, data: d.imported ? null : d,
    } : null,
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
// Adminlarni xabarga ko'mmaslik uchun: e'lon bo'yicha faqat BIRINCHI shikoyat va e'lon YASHIRILGANDA xabar boradi.
// Oraliqdagi shikoyatlar bazaga yoziladi va yashirish xabarida hammasi birga ko'rsatiladi.
async function apiReport(env, request, id) {
  const user = await authUser(env, request.headers.get("x-init-data"));
  if (!user) return err("Shikoyat qilish uchun ilovani bot orqali oching.", 401);
  await upsertUser(env, user);
  if (await isBanned(env, user.id)) return err("Sizga bu amal cheklangan.", 403);
  const l = await getListing(env, id);
  if (!l || l.status !== S.PUBLISHED) return err("E'lon topilmadi.", 404);
  if (l.user_id === user.id) return err("O'z e'loningizga shikoyat qilib bo'lmaydi.");
  const today = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE user_id=? AND created_at>?")
    .bind(user.id, now() - DAY).first("n");
  if (today >= REPORTS_PER_DAY) return err(`Bir kunda ${REPORTS_PER_DAY} tadan ortiq shikoyat yuborib bo'lmaydi. Ertaga urinib ko'ring.`, 429);
  const b = await request.json().catch(() => ({}));
  const reason = REPORT_REASONS[b.reason] ? b.reason : "other";
  const note = String(b.note || "").trim().slice(0, 300);
  const ins = await env.DB.prepare("INSERT OR IGNORE INTO reports (listing_id, user_id, reason, created_at) VALUES (?,?,?,?)")
    .bind(id, user.id, reason + (note ? ": " + note : ""), now()).run();
  if (ins.meta.changes !== 1) return err("Bu e'longa allaqachon shikoyat yuborgansiz. Rahmat!");

  // Admin «Qaytarish» bosgan bo'lsa, undan oldingi shikoyatlar hisobga olinmaydi.
  // «Ishonchli» shikoyat — botda kamida REPORTER_MIN_DAYS kundan beri bor va ban qilinmagan odamniki:
  // shunda yangi ochilgan soxta akkauntlar bilan begona e'lonni yashirib bo'lmaydi.
  const { results: reps } = await env.DB.prepare(
    "SELECT r.reason, r.user_id, u.username, u.first_name, (u.created_at < ? AND u.banned = 0) AS trusted " +
    "FROM reports r LEFT JOIN users u ON u.id = r.user_id WHERE r.listing_id=? AND r.rowid > ? ORDER BY r.rowid"
  ).bind(now() - REPORTER_MIN_DAYS * DAY, id, l.reports_after || 0).all();
  const trusted = reps.filter((r) => r.trusted).length;
  const hide = trusted >= REPORT_HIDE && (await changeStatus(env, id, S.PUBLISHED, S.REPORTED));
  if (!hide && reps.length !== 1) return json({ ok: true }); // oraliq shikoyat — adminni bezovta qilmaymiz

  const who = (r) => (r.username ? "@" + esc(r.username) : esc(r.first_name || "Foydalanuvchi")) + ` (<code>${r.user_id}</code>)`;
  const why = (r) => esc(REPORT_REASONS[r.reason.split(":")[0]] || "") + (r.reason.includes(":") ? " — " + esc(r.reason.slice(r.reason.indexOf(":") + 1).trim()) : "");
  const link = l.channel_username ? `\nhttps://t.me/${l.channel_username}/${l.channel_msg_id}` : "";
  const text = hide
    ? `🙈 <b>E'lon #${id} ilovadan vaqtincha yashirildi</b>: ${reps.length} ta shikoyat (${trusted} tasi ishonchli akkauntdan)\n` +
      `${KIND_NAMES[l.kind]}, ${esc(placeText(l))}${link}\n\n` + reps.map((r) => `• ${why(r)} — ${who(r)}`).join("\n") +
      "\n\nKanaldagi post o'zgarmadi. Qaror qiling:"
    : `🚩 <b>Shikoyat</b>: e'lon #${id} (${KIND_NAMES[l.kind]}, ${esc(placeText(l))})${link}\n` +
      `Sabab: ${why(reps[0])}\nKimdan: ${who(reps[0])}\n\n` +
      `Keyingi shikoyatlar alohida yuborilmaydi. ${REPORT_HIDE} ta ishonchli shikoyat bo'lsa, e'lon avtomatik yashiriladi.`;
  const kb = adminManageKb({ ...l, status: hide ? S.REPORTED : l.status });
  kb.inline_keyboard.push([
    ...(l.user_id ? [{ text: "🚫 Egasini ban qilish", callback_data: `a:ban:${id}` }] : []),
    ...(hide ? [] : [{ text: "👌 E'tiborsiz qoldirish", callback_data: `a:ignore:${id}` }]),
  ]);
  for (const admin of adminIds(env)) {
    await tgSafe(env, "sendMessage", { chat_id: admin, text, parse_mode: "HTML", reply_markup: kb, disable_web_page_preview: true });
  }
  if (hide && l.user_id) {
    await tgSafe(env, "sendMessage", { chat_id: l.user_id,
      text: `⚠️ E'loningiz #${id} (${shortTitle(l)}) bo'yicha bir nechta shikoyat tushdi va u admin tekshirguncha ilovadan vaqtincha olindi. ` +
        "Kanaldagi post joyida. Savolingiz bo'lsa, adminga yozing." });
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

  // Cloudflare keshi: Worker O'Z DOMENINGIZGA ulangan bo'lsa, rasm bir marta yuklanib, keyingi ko'rishlarda
  // Telegram'ga murojaat qilinmaydi. *.workers.dev manzilida Cloudflare keshni deyarli ishlatmaydi —
  // u holda asosiy tejash brauzer keshi (7 kun) va yuqoridagi file_path xotirasidan keladi.
  // (Faqat ochiq e'lonlar keshlanadi; kalit kesh manziliga kirmaydi — tekshiruv yuqorida bo'ldi.)
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
  if (!allowed.includes(status) || !OPEN_STATUSES.includes(l.status)) return err("Bu amalni bajarib bo'lmaydi.");
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
    await storeMedia(env, await getListing(env, id), files);
  } catch (e) {
    console.log("Adminlarga yuborilmadi:", e.message);
    await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(id).run();
    if (e.message === "BAD_VIDEO") return err("Video formati mos kelmadi. MP4 video yoki rasm yuboring.");
    return err("Server xatosi. Birozdan keyin qayta urinib ko'ring.", 500);
  }
  const origin = new URL(request.url).origin;
  if ((await getSetting(env, "app_url")) !== origin) await setSetting(env, "app_url", origin);
  await refreshQueueNotice(env, { notify: true });
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
      quiet_from: await getSetting(env, "quiet_from", String(QUIET_DEFAULT.from)),
      quiet_to: await getSetting(env, "quiet_to", String(QUIET_DEFAULT.to)),
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
  // Tinch soatlar: 0–23 yoki "off" (o'chirilgan)
  if (b.quiet_from !== undefined) {
    const hour = (v) => (v === "off" ? "off" : /^\d{1,2}$/.test(String(v)) && +v < 24 ? String(+v) : null);
    const f = hour(b.quiet_from), t = hour(b.quiet_to);
    if (f === null || t === null) return err("Tinch soatlarni 0–23 oralig'ida tanlang.");
    await setSetting(env, "quiet_from", f === "off" || t === "off" ? "off" : f);
    await setSetting(env, "quiet_to", f === "off" || t === "off" ? "off" : t);
  }
  return json({ ok: true, price_text: fmtSum(price) });
}

// ---------------------------------------------------------------- Admin: Navbat (Mini App)
// E'lon ma'lumotlari jadvali (e'lon sahifasi va navbat kartochkasi uchun bir xil)
function detailRows(l) {
  const d = l.data;
  const rows = l.kind === "reklama"
    ? [["Nomi", d.title], ["Tavsif", d.about], ["Narxi", priceText(l)]]
    : [["Zoti", d.breed || "Noma'lum"], ["Yoshi", d.age], ["Jinsi", GENDER[d.gender] || "Noma'lum"],
       ["Sog'lig'i", healthText(d) || "Noma'lum"], ["Dostafka", DELIVERY[d.delivery] || "Noma'lum"], ["Narxi", priceText(l)]];
  rows.push(["Manzil", placeText(l)]);
  if (d.extra) rows.push(["Qo'shimcha", d.extra]);
  return rows;
}
const receiptKey = (env, id) => mediaKey(env, "r" + id);

async function apiAdminQueue(env, request) {
  if (!(await requireAdmin(env, request))) return err("Bu bo'lim faqat adminlar uchun.", 403);
  const { results } = await env.DB.prepare(
    "SELECT l.*, u.username AS profile_username, u.first_name AS profile_name FROM listings l LEFT JOIN users u ON u.id = l.user_id " +
    "WHERE l.status IN (?,?) ORDER BY l.created_at LIMIT 50"
  ).bind(S.PENDING, S.PAY_REVIEW).all();
  const items = await Promise.all(results.map(async (r) => {
    const l = parseRow(r);
    const key = await mediaKey(env, l.id);
    const warn = l.username && (!r.profile_username || r.profile_username.toLowerCase() !== l.username.toLowerCase())
      ? `Username egasiniki bo'lmasligi mumkin: formada @${l.username}, ${r.profile_username ? "profilda @" + r.profile_username : "profilda username yo'q"}` : null;
    return {
      id: l.id, kind: l.kind, status: l.status, title: shortTitle(l), place: placeText(l), rows: detailRows(l),
      media: l.media.map((m, i) => ({ type: m.type, url: `api/media/${l.id}/${i}?k=${key}`, thumb: `api/media/${l.id}/${i}?thumb=1&k=${key}` })),
      user: { id: l.user_id, name: r.profile_name || l.first_name || "", profile: r.profile_username || "" },
      contact: { phone: l.data.phone ? fmtPhone(l.data.phone) : "", username: l.username || "" },
      warn, hours: Math.floor((now() - l.created_at) / 3600),
      price_due: l.price_due ? fmtSum(l.price_due) : null,
      receipt: l.status === S.PAY_REVIEW && l.receipt_file_id ? `api/receipt/${l.id}?k=${await receiptKey(env, l.id)}` : null,
    };
  }));
  return json({
    pending: items.filter((i) => i.status === S.PENDING),
    payments: items.filter((i) => i.status === S.PAY_REVIEW),
    reasons: REJECT_REASONS, card_set: !!(await getSetting(env, "card")), price_text: fmtSum(await getPrice(env)),
  });
}

async function apiAdminDecide(env, request, id) {
  const admin = await requireAdmin(env, request);
  if (!admin) return err("Bu amal faqat adminlar uchun.", 403);
  const l = await getListing(env, id);
  if (!l) return err("E'lon topilmadi.", 404);
  const { action, reason } = await request.json().catch(() => ({}));
  const who = [admin.first_name, admin.last_name].filter(Boolean).join(" ") || "admin";
  const res = await moderate(env, l, action, reason, who);
  if (res.error) return err(res.error, 409);
  // Bu e'lon bo'yicha eski bot xabarlari bo'lsa (yangilanishdan oldin kelganlar) — ularning tugmalari olib tashlanadi
  for (const field of ["admin_msgs", "pay_msgs"]) {
    let refs = [];
    try { refs = JSON.parse(l[field] || "[]"); } catch {}
    for (const [c, m] of refs) {
      await tgSafe(env, field === "pay_msgs" ? "editMessageCaption" : "editMessageText", { chat_id: c, message_id: m, [field === "pay_msgs" ? "caption" : "text"]: res.text });
    }
  }
  const c = await refreshQueueNotice(env);
  return json({ ok: true, text: res.text, link: res.link || null, left: c.pending + c.pay });
}

// To'lov cheki rasmi (faqat admin, maxfiy kalit bilan)
async function apiReceipt(env, url, id) {
  if (url.searchParams.get("k") !== (await receiptKey(env, id))) return new Response("Topilmadi", { status: 404 });
  const l = await getListing(env, id);
  if (!l?.receipt_file_id) return new Response("Topilmadi", { status: 404 });
  let path;
  try {
    path = await telegramFilePath(env, l.receipt_file_id);
  } catch {
    return new Response("Topilmadi", { status: 404 });
  }
  const up = await fetch(`${env.TG_API || "https://api.telegram.org"}/file/bot${env.BOT_TOKEN}/${path}`);
  if (!up.ok) return new Response("Topilmadi", { status: 404 });
  const ext = String(path).split(".").pop().toLowerCase();
  const type = { pdf: "application/pdf", png: "image/png", webp: "image/webp" }[ext] || "image/jpeg";
  return new Response(up.body, { headers: { "content-type": type, "cache-control": "private, max-age=3600" } });
}

// ---------------------------------------------------------------- Admin: e'lonni boshqarish (Mini App ichidan)
const ADMIN_EDITABLE = [S.PUBLISHED, S.REPORTED, S.GIVEN, S.SOLD, S.CLOSED];

// Holat: given / sold / closed — yopish (kanaldagi post tahrirlanadi); published — yana faol qilish
async function apiAdminStatus(env, request, id) {
  if (!(await requireAdmin(env, request))) return err("Bu amal faqat adminlar uchun.", 403);
  const l = await getListing(env, id);
  if (!l || !ADMIN_EDITABLE.includes(l.status)) return err("E'lon topilmadi.", 404);
  const { status } = await request.json().catch(() => ({}));
  if (status === S.PUBLISHED) {
    if (!(await reopenListing(env, l))) return err("E'lon allaqachon faol.");
  } else {
    if (!["given", "sold", "closed"].includes(status)) return err("Noto'g'ri holat.");
    if (status === "given" && l.kind !== "hadya") return err("«Berildi» faqat hadya e'loni uchun.");
    if (status === "sold" && l.kind !== "sotuv") return err("«Sotildi» faqat sotuv e'loni uchun.");
    if (!OPEN_STATUSES.includes(l.status)) {
      // yopilgan e'lonning yopilish turini almashtirish (masalan, «Dolzarb emas» → «Berildi»)
      if (!(await changeStatus(env, id, [S.GIVEN, S.SOLD, S.CLOSED], status, { closed_at: now() }))) return err("Holati o'zgargan.");
      await refreshChannelPost(env, l, status);
    } else if (!(await closeListing(env, l, status))) return err("E'lon holati allaqachon o'zgargan.");
  }
  const n = await getListing(env, id);
  return json({ ok: true, status: n.status, status_text: STATUS_TEXT[n.status] });
}

// Tahrirlash. Bot joylagan e'lon — maydonlar bo'yicha (kanaldagi post ham yangilanadi).
// Kanaldan import qilingan e'lon — asl matn tahrirlanadi (kanal postidagi qalin yozuv kabi formatlash yo'qoladi).
async function apiAdminEdit(env, request, id) {
  if (!(await requireAdmin(env, request))) return err("Bu amal faqat adminlar uchun.", 403);
  const l = await getListing(env, id);
  if (!l || !ADMIN_EDITABLE.includes(l.status)) return err("E'lon topilmadi.", 404);
  const b = await request.json().catch(() => ({}));
  const get = (k) => (b[k] === undefined || b[k] === null ? null : String(b[k]));
  let fields;
  if (l.data.imported) {
    const raw = String(b.raw || "").trim();
    const limit = l.media.length ? 1024 : 4096;
    if (!raw) return err("Post matni bo'sh bo'lmasin.");
    if (raw.length > limit) return err(`Post matni ${limit} belgidan oshmasin (hozir ${raw.length}).`);
    const kind = KINDS[b.kind] ? b.kind : l.kind;
    const region = String(b.region || ""), district = String(b.district || "");
    if (region && !findRegion(region)) return err("Hududni tanlang.");
    if (district && !findRegion(region)?.d.some((x) => x[0] === district)) return err("Tumanni tanlang.");
    const skip = [await botUsername(env), String(env.CHANNEL || "").replace(/^@/, "")];
    const p = parsePost(raw, skip) || { data: {}, username: "" };
    const data = { ...l.data, ...p.data, imported: true, raw };
    if (raw !== l.data.raw) delete data.entities; // matn o'zgardi — eski formatlash joylari to'g'ri kelmaydi
    fields = { kind, region, district, data: JSON.stringify(data), username: p.username || l.username || null };
  } else {
    const form = { get: (k) => (k === "kind" ? (KINDS[b.kind] ? b.kind : l.kind) : get(k)) };
    const res = cleanForm(form);
    if (typeof res === "string") return err(res);
    const username = res.data.contact_username;
    delete res.data.contact_username;
    fields = { kind: res.kind, region: res.region, district: res.district, data: JSON.stringify(res.data), username };
  }
  await updateListing(env, id, fields);
  const n = await getListing(env, id);
  const closedAs = [S.GIVEN, S.SOLD, S.CLOSED].includes(n.status) ? n.status : null;
  await refreshChannelPost(env, n, closedAs);
  return json({ ok: true });
}

// O'chirish: e'lon ilovadan olinadi; channel=true bo'lsa kanaldagi post ham o'chiriladi
async function apiAdminDelete(env, request, id) {
  if (!(await requireAdmin(env, request))) return err("Bu amal faqat adminlar uchun.", 403);
  const l = await getListing(env, id);
  if (!l || !ADMIN_EDITABLE.includes(l.status)) return err("E'lon topilmadi.", 404);
  const { channel } = await request.json().catch(() => ({}));
  if (!(await changeStatus(env, id, ADMIN_EDITABLE, "hidden", { closed_at: now() }))) return err("Holati o'zgargan.");
  let channelDeleted = null;
  if (channel && l.channel_msg_id) {
    // Albomdagi har bir rasm alohida xabar: bot joylagan albom raqamlari ketma-ket keladi
    const ids = Array.from({ length: Math.max(1, l.media.length) }, (_, i) => l.channel_msg_id + i);
    if (l.close_reply_msg) ids.push(l.close_reply_msg);
    let okN = 0;
    for (const mid of ids) if (await tgSafe(env, "deleteMessage", { chat_id: env.CHANNEL, message_id: mid })) okN++;
    channelDeleted = okN > 0;
  }
  return json({ ok: true, channel_deleted: channelDeleted });
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
    await setSetting(env, "app_url", origin);
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
    else {
      ok(`Kanal ${env.CHANNEL}: bot admin, huquqlar to'g'ri`);
      if (cm.can_delete_messages === false) warn("Admin ilovadan kanaldagi postni o'chira olishi uchun botga «Xabarlarni o'chirish» huquqini ham bering.");
    }
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

// --- So'rovlar byudjeti ---
// Fon vazifasi bitta ishga tushishda nechta tashqi so'rov (Telegram + D1 baza) qilganini sanaydi.
// Har bir ishdan oldin «bunga yetadimi?» deb tekshiriladi; yetmasa — to'xtaydi va qolgan ishlar
// KEYINGI ishga tushishda bajariladi. Ish faqat muvaffaqiyatli bajarilgandan keyin «bajarildi» deb
// belgilanadi, shuning uchun hech narsa jimgina yo'qolmaydi.
function countingDB(db, ops) {
  const wrap = (st) => ({
    bind: (...a) => wrap(st.bind(...a)),
    first: (...a) => (ops.n++, st.first(...a)),
    all: () => (ops.n++, st.all()),
    run: () => (ops.n++, st.run()),
  });
  return { prepare: (sql) => wrap(db.prepare(sql)), batch: (list) => ((ops.n += list.length), db.batch(list)) };
}
const canSpend = (env, cost) => !env.__ops || env.__ops.n + cost <= RUN_BUDGET;
// Taxminiy narxlar (so'rovlar soni) — ehtiyot uchun biroz yuqori olingan
const COST = { expire: 2, remindPay: 2, close: 6, ask: 2 };

async function expirePayments(env) {
  const { results } = await env.DB.prepare("SELECT id, user_id FROM listings WHERE status=? AND pay_deadline<? LIMIT 10")
    .bind(S.AWAIT_PAY, now()).all();
  for (const l of results) {
    if (!canSpend(env, COST.expire)) return;
    if (await changeStatus(env, l.id, S.AWAIT_PAY, S.EXPIRED)) {
      await sendTo(env, l.user_id, `⌛️ E'lon #${l.id} uchun to'lov muddati o'tdi, e'lon bekor qilindi. Kerak bo'lsa, qayta yuboring.`);
    }
  }
}

// To'lov muddati tugashiga PAY_REMIND_HOURS qolganda bir marta eslatish.
// «Eslatildi» belgisi faqat xabar yetib borganda (yoki foydalanuvchi botni bloklagan bo'lsa) qo'yiladi.
async function remindPayments(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, user_id, price_due, pay_deadline FROM listings WHERE status=? AND pay_deadline<? AND pay_reminded IS NULL LIMIT 10"
  ).bind(S.AWAIT_PAY, now() + PAY_REMIND_HOURS * 3600).all();
  if (!results.length || !canSpend(env, 3 + COST.remindPay)) return;
  const card = await getSetting(env, "card", "");
  const owner = await getSetting(env, "card_owner", "");
  const price = await getPrice(env);
  for (const l of results) {
    if (!canSpend(env, COST.remindPay)) return;
    const left = Math.max(1, Math.round((l.pay_deadline - now()) / 3600));
    const r = await tgSend(env, { chat_id: l.user_id, parse_mode: "HTML", text:
      `⏰ Eslatma: e'lon #${l.id} uchun to'lov muddati tugashiga ${left} soat qoldi.\n\n` +
      `Summa: <b>${fmtSum(l.price_due || price)}</b>\nKarta: <code>${esc(card)}</code>\n${esc(owner)}\n\n` +
      "To'lovni qilib, chek rasmini shu botga yuboring." });
    if (r.ok || r.blocked) await updateListing(env, l.id, { pay_reminded: now() });
  }
}

// Navbat eslatmasi: so'rovlar ADMIN_REMIND_HOURS soatdan beri ko'rilmasa yoki tinch soatlarda kelgan bo'lsa
// (tinch soatlar tugagach) — yig'ma xabar qayta, ovoz bilan yuboriladi.
async function remindAdmins(env) {
  if (!canSpend(env, 8 + adminIds(env).length * 3)) return;
  if (await isQuietNow(env)) return;
  const c = await queueCounts(env);
  if (!c.pending && !c.pay) return;
  const last = Number(await getSetting(env, "q_notified_at", 0));
  const quietPending = await getSetting(env, "q_quiet_pending");
  if (!quietPending && now() - last < ADMIN_REMIND_HOURS * 3600 - 300) return;
  await refreshQueueNotice(env, { resend: true });
}

// 30 kunlik tekshiruv: egasidan «Hali dolzarbmi?» deb so'raladi; ANSWER_DAYS ichida javob bo'lmasa
// e'lon «Dolzarb emas» deb yopiladi (kanaldagi post ham yangilanadi). Savol egasiga yetmasa
// (botni bloklagan) — BLOCKED_DAYS kundan keyin yopiladi. Kanaldan import qilingan postlarning
// egasi botda yo'q (user_id = 0), ular bu tekshiruvga kirmaydi.
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
async function closeOverdue(env) {
  // Javob bermaganlar (ANSWER_DAYS) va savol yetmaganlar (BLOCKED_DAYS) yopiladi
  const { results } = await env.DB.prepare(
    "SELECT * FROM listings WHERE status=? AND user_id<>0 AND asked_at IS NOT NULL AND " +
    "((COALESCE(ask_blocked, 0) = 0 AND asked_at < ?) OR (ask_blocked = 1 AND asked_at < ?)) ORDER BY asked_at LIMIT 5"
  ).bind(S.PUBLISHED, now() - ANSWER_DAYS * DAY, now() - BLOCKED_DAYS * DAY).all();
  for (const r of results) {
    if (!canSpend(env, COST.close)) return;
    const l = parseRow(r);
    if (!(await closeListing(env, l, "closed")) || l.ask_blocked) continue; // bloklagan egaga yozib bo'lmaydi
    await sendTo(env, l.user_id,
      `⛔️ E'lon #${l.id} (${shortTitle(l)}) ${ANSWER_DAYS} kun javob bo'lmagani uchun «Dolzarb emas» deb yopildi.\n` +
      "Agar mushuk hali uy izlayotgan bo'lsa, ilova orqali yangi e'lon bering.");
  }
}

async function askStillRelevant(env) {
  // Muddati kelganlardan so'rash (check_at bo'sh bo'lsa — eski e'lon, joylangan vaqtdan 30 kun hisoblanadi).
  // Avval kam urinilganlari olinadi — yetib bormayotgan bitta xabar navbatni to'sib qo'ymasin.
  const { results } = await env.DB.prepare(
    "SELECT * FROM listings WHERE status=? AND user_id<>0 AND asked_at IS NULL " +
    "AND COALESCE(check_at, published_at + ?) < ? ORDER BY COALESCE(ask_tries, 0), id LIMIT 8"
  ).bind(S.PUBLISHED, CHECK_DAYS * DAY, now()).all();
  for (const r of results) {
    if (!canSpend(env, COST.ask)) return;
    const l = parseRow(r);
    const link = l.channel_username ? `\nhttps://t.me/${l.channel_username}/${l.channel_msg_id}` : "";
    const res = await tgSend(env, {
      chat_id: l.user_id, reply_markup: stillKb(l), disable_web_page_preview: true,
      text: `🐾 E'loningiz #${l.id} (${shortTitle(l)}, ${placeText(l)}) ${CHECK_DAYS} kundan beri kanalda turibdi.${link}\n\n` +
        `Hali dolzarbmi? ${ANSWER_DAYS} kun ichida javob bo'lmasa, e'lon «Dolzarb emas» deb yopiladi.`,
    });
    const tries = (l.ask_tries || 0) + 1;
    if (res.ok) {
      // Faqat xabar YETIB BORGANDA «so'raldi» deb belgilanadi — shundan 3 kun hisoblanadi
      await updateListing(env, l.id, { asked_at: now(), ask_tries: null, ask_blocked: null });
    } else if (res.blocked || tries >= ASK_MAX_TRIES) {
      // Egasi botni bloklagan (yoki bir necha bor yetmadi): e'lon BLOCKED_DAYS kundan keyin yopiladi
      await updateListing(env, l.id, { asked_at: now(), ask_tries: tries, ask_blocked: 1 });
    } else {
      // Vaqtincha xato (Telegram band, tarmoq): keyingi ishga tushishda qayta urinamiz
      await updateListing(env, l.id, { ask_tries: tries });
    }
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

async function scheduledJobs(baseEnv) {
  // Shu ishga tushish uchun so'rov hisoblagichli env (asl env o'zgarmaydi)
  const ops = { n: 0 };
  const env = Object.assign(Object.create(baseEnv), { DB: countingDB(baseEnv.DB, ops), __ops: ops });
  // Muhimlik tartibida. Har bir vazifa alohida: bittasi xato bersa, qolganlari baribir bajariladi.
  for (const [name, job] of [["tozalash", cleanupSettings], ["to'lov muddati", expirePayments],
    ["to'lov eslatmasi", remindPayments], ["admin eslatmasi", remindAdmins],
    ["muddati o'tganlarni yopish", closeOverdue], ["«Hali dolzarbmi?» savoli", askStillRelevant]]) {
    try {
      await job(env);
    } catch (e) {
      console.log(`Cron (${name}):`, e.stack || e.message);
    }
  }
  console.log(`Cron: ${ops.n} ta so'rov ishlatildi (chegara ${RUN_BUDGET})`);
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
      if (method === "GET" && path === "/api/listings") return await apiListings(env, request, url);
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
      if (method === "GET" && path === "/api/admin/queue") return await apiAdminQueue(env, request);
      if (method === "POST" && (m = path.match(/^\/api\/admin\/queue\/(\d+)$/))) return await apiAdminDecide(env, request, +m[1]);
      if (method === "GET" && (m = path.match(/^\/api\/receipt\/(\d+)$/))) return await apiReceipt(env, url, +m[1]);
      if (method === "POST" && (m = path.match(/^\/api\/admin\/listings\/(\d+)\/(status|edit|delete)$/))) {
        return await { status: apiAdminStatus, edit: apiAdminEdit, delete: apiAdminDelete }[m[2]](env, request, +m[1]);
      }
      return new Response("Topilmadi", { status: 404 });
    } catch (e) {
      console.log("Xato:", e.stack || e.message);
      if (String(e.message).includes("no such table")) return err("Bot hali sozlanmagan: /setup?key=... sahifasini oching.", 503);
      return err("Server xatosi. Birozdan keyin qayta urinib ko'ring.", 500);
    }
  },

  async scheduled(event, env, ctx) {
    await ensureSchema(env);
    ctx.waitUntil(scheduledJobs(env));
  },
};
