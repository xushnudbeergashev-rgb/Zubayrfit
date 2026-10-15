---
id: 2
title: "Vendored task-observer install lacks scripts/ — Session Start scan and new-observation helper cannot run"
status: open
type: open-source
skill: [task-observer]
proposes_skill: []
target_file: []
siblings_checked: "none — task-observer belongs to no declared family (no skill-families.md yet)"
area: "SKILL.md Session Start Protocol step 2 and How to Log (scripts/session-start-scan.sh, scripts/new-observation.sh); 'Reference files' incomplete-install check"
date: 2026-10-15
session_context: "Reviewing an uploaded Cloudflare Workers Telegram-bot project (zip) in a cloud session; Session Start Protocol run first per CLAUDE.md"
parked_until:
resolved:
resolution:
reference:
commands_verified: "run: bash .claude/skills/task-observer/scripts/session-start-scan.sh /home/user/Zubayrfit → 'No such file or directory'; ls .claude/skills/task-observer → LICENSE.txt, SKILL.md, references/ (no scripts/)"
---

**Issue:** The project-vendored copy of task-observer contains `SKILL.md`,
`LICENSE.txt` and `references/`, but no `scripts/` directory. SKILL.md's
Session Start step 2 runs `scripts/session-start-scan.sh` and How to Log
names `scripts/new-observation.sh` as "the only write path". Both fail with
"No such file or directory". The incomplete-install check in "Reference
files" only covers files under `references/`, so the missing scripts are not
flagged by the skill itself; the session fell back to reading frontmatter by
hand and running the inline id snippet.

**Suggested improvement:** Extend the "A listed file absent beside this one
is an incomplete install" rule to cover `scripts/` explicitly (list the
scripts the core file invokes), and have Session Start step 1 test for them
in the same probe as the storage `ls`. When a script is absent, state the
fallback (inline snippet in How to Log; frontmatter read with `sed`) rather
than leaving the agent to improvise.

**Principle:** An install-completeness check must enumerate every file the
core instructions execute, not only the ones they read; a vendoring step
that copies "the skill" by directory listing silently drops the parts that
are only referenced by path.
