---
id: 2
title: "Vendored task-observer bundle lacks scripts/, so the Session Start scan and new-observation helper cannot run"
status: open
type: open-source
skill: [task-observer]
proposes_skill: []
target_file: []
siblings_checked: "none — task-observer belongs to no declared family (no skill-families.md yet)"
area: "Session Start Protocol step 2 (scripts/session-start-scan.sh); How to Log (scripts/new-observation.sh); reference-file list"
date: 2026-10-13
session_context: "Cloud session; user asked (in Uzbek) whether Claude can make a vertical short-video like an uploaded sample; built an ffmpeg template"
parked_until:
resolved:
resolution:
reference:
commands_verified: "run: bash .claude/skills/task-observer/scripts/session-start-scan.sh → No such file or directory; ls of the skill dir shows only LICENSE.txt, SKILL.md, references/"
---

**Issue:** SKILL.md step 2 makes `scripts/session-start-scan.sh` the scan and names `scripts/new-observation.sh` the only write path, but the vendored copy in `.claude/skills/task-observer/` has no `scripts/` directory. The "incomplete install" check in SKILL.md only covers the `references/` list, so the missing scripts are not flagged by any rule; the scan silently fell back to hand-run commands.

**Suggested improvement:** Add `scripts/` files to the incomplete-install list in "Reference files", and re-vendor the bundle including `scripts/` (the install recipe from observation 1 should copy the whole directory, not SKILL.md + references).

**Principle:** A completeness check must enumerate every artefact the core file invokes by path, not only the ones it loads as documentation; an executable dependency that is missing degrades silently into improvisation.
