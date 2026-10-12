---
id: 1
title: "Plugin-based install never loads in Claude Code cloud sessions; skills must be vendored as project skills"
status: open
type: open-source
skill: [task-observer]
proposes_skill: []
target_file: []
siblings_checked: "none — task-observer belongs to no declared family (no skill-families.md yet)"
area: "references/environments.md — installation / activation in Claude Code cloud (web) sessions"
date: 2026-10-12
session_context: "Installing five third-party skills (claude-mem, superpowers, impeccable, find-skills, task-observer) into a repository so they load in Claude Code cloud sessions"
parked_until:
resolved:
resolution:
reference:
commands_verified: none
---

**Issue:** The skills were first enabled through the project's
`.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`),
which is the documented way to share plugins with a project. In a Claude
Code cloud session the desktop app showed "Plugins aren't available in
this environment" and none of the four plugin-installed skills loaded. Only
`find-skills`, which had been copied as a plain file into
`.claude/skills/find-skills/SKILL.md`, appeared. Task Observer was
therefore silently inactive even though `CLAUDE.md` carried its activation
block; that block names a skill that did not exist in the session.
Copying the skill into `.claude/skills/task-observer/` fixed activation.
The upstream `scripts/` were not copied (an auto-mode permission
classifier refused to vendor third-party executable code), so
`session-start-scan.sh` and `new-observation.sh` are absent and the
session-start scan and id snippet had to be run inline.

**Suggested improvement:** In `references/environments.md`, under the
Claude Code installation and activation guidance, add a cloud-session
note. Plugin and marketplace installs do not load there, so install the
bundle as a project skill under `.claude/skills/task-observer/` in the
repository. Anchor the workspace inside the repository and commit it,
because the container is discarded after each session. Verify the install
by checking that `task-observer` appears in the session's skill list, not
by checking that settings.json names it. Also state what degrades when
`scripts/` is absent.

**Principle:** An activation instruction that names a skill is only as
good as the install path that delivers the skill into that environment.
Verify presence in the running session's own skill listing, not in the
config that was supposed to install it.
