---
id: 2
title: "Recurring workflow: Google Maps place + one-page landing site for a local place or business"
status: open
type: open-source
skill: []
proposes_skill: [local-place-landing-page]
target_file: []
siblings_checked: "none — no existing skill covers this; no skill-families.md registry yet"
area: "new skill candidate — local place / small business web presence"
date: 2026-10-14
session_context: "Building a one-page site for a local cemetery to link from its Google Maps listing; user plans to sell the same package to shops and restaurants"
parked_until:
resolved:
resolution:
reference: "chinobod-dafn-etish-joyi/index.html"
commands_verified: none
---

**Issue:** The user wants to add a place to Google Maps and give it a
website, and said they will repeat this for shops and restaurants as a paid
service. The same steps came up from scratch: add the missing place
(category, pin), build a mobile-first one-page site, add schema.org
JSON-LD with the right `@type` and `GeoCoordinates`, add Open Graph tags so
Telegram/WhatsApp previews render, add a direct-directions button and a
sticky mobile call/directions bar, publish free (Cloudflare Pages direct
upload / GitHub Pages), then put the URL in the Maps listing's Website
field. The user first asked to be taught one step at a time, then switched
to "just build it, I'll send photos and data later". That switch meant the
page needed to look finished with gaps in the data: unverified facts were
left out instead of invented, and images that fail to load hide themselves.

**Suggested improvement:** Create a skill `local-place-landing-page` with:
(1) the Maps "Add a missing place" / Business Profile checklist and the
private-residence eligibility caveat; (2) a parameterised single-file HTML
template (hero, info cards, sections, map embed via
`maps.google.com/maps?q=LAT,LNG&output=embed` with no API key, gallery
that hides missing images, contact block that hides when there is no
phone); (3) a JSON-LD `@type` table (Cemetery, Restaurant, Store,
LocalBusiness…); (4) a deploy runbook; (5) a rule that names, phones and
history are never invented: visible neutral copy plus a marked placeholder
comment. Include a teach-step-by-step mode and a build-it mode.

**Principle:** When a client deliverable will be filled in with real data
later, build it so missing data degrades gracefully: the page hides what
is absent and never invents facts to fill a gap.
