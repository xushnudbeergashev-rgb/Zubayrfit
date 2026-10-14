---
id: 3
title: "Book excerpt → vertical text-reels is a reusable multi-step workflow with non-obvious render pitfalls"
status: open
type: open-source
skill: []
proposes_skill: [book-to-reels]
target_file: []
siblings_checked: "none — proposes a new skill; no existing skill or family covers short-video production (checked installed skill list this session)"
area: "new skill: turning a book/text excerpt into Instagram Reels / YouTube Shorts (script → verify → render → QA)"
date: 2026-10-14
session_context: "User pasted an Uzbek-Cyrillic excerpt of a translated self-help book and asked for short reels for Instagram/Shorts; produced 3 subtitle-only 1080x1920 reels with Pillow+ffmpeg"
parked_until:
resolved:
resolution:
reference: "skill-observations/evidence/0003-render_reels.py"
commands_verified: "run: render_reels.py over 3 scripts → 28-40 s MP4s, 6.5-9 MB each after the grain fix (were 150-220 MB before)"
---

**Issue:** The user asked whether Claude can turn an e-book into short reels, then supplied an excerpt. No skill covers this. The working procedure had to be improvised, and several non-obvious lessons came up on the way:
1. The user first sent a local `file:///C:/...` path. A cloud session cannot read it, so the user must attach the file instead.
2. Scripts need hard format limits (hook ≤8 words, slides ≤14 words, 6–9 slides, one highlight per slide that is an exact substring of the slide, CTA last). They also need three separate review lenses — language/orthography, factual fidelity plus copyright (paraphrase, at most one short quote), and retention. In this run those lenses raised five blocking issues, each fixed in revision.
3. The excerpt came from a translated edition and contained a translation error: the body-weight gain was rendered as weights lifted. Fidelity has to be checked against the original work, not only against the excerpt.
4. Render pitfalls:
   - Film grain that changes every frame inflated H.264 output roughly 20x (around 200 MB → 9 MB once the grain was made static and bitrate was capped).
   - The first timing formula produced 40–53 s reels. Reels need 25–40 s, which works out to about 0.28 s per word plus 0.9 s per slide.
   - Auto-shrinking text made some slides tiny. This was only caught by reviewing a contact sheet of frames.
   - A dash ("—") wrapping to the start of a line needs a non-breaking join to the previous word.

**Suggested improvement:** Create a `book-to-reels` skill with these parts:
- **Intake:** require an uploaded file, not a local path. Ask for the channel name, the alphabet (for Uzbek: Latin with U+02BB/U+02BC), and whether there will be a voiceover.
- **Angles:** pick distinct angle types — story, practical, principle.
- **Script schema:** the format limits listed under Issue, item 2.
- **Review:** three lenses (language, fidelity+copyright, retention), then a revise step.
- **Renderer:** ship the evidence script as the starting point.
- **QA:** a mandatory frame contact sheet plus duration and size checks before delivery.
- **Deliverables:** the MP4 files, cover PNGs, and a captions+hashtags text file.

**Principle:** When generated media is the deliverable, view sampled frames of every output before handing it over. Layout and encoding failures (shrunken text, oversized files, over-long durations) are invisible in the code and in the exit status, and show up only in the rendered output.
