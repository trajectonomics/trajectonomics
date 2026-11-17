---
status: accepted
---

# The install window prints one prompt and one way out, and no command

The install window used to be built around one command:
`npx skills add trajectonomics/skills --skill traj-onboarding`, with a Copy control beside it and three steps
under it. [ADR 0009](./0009-the-site-prints-one-command.md) chose that shape and defended it twice: one command,
one way out, and a wizard or a cloned workspace rejected. This record reverses the first half of that and keeps
the second. The owner asked for it on 2026-11-17: *"let go for only prompt copy no npx skills add anymore we will
only prompt copy and install cli directly only this 2 so it very simple thing for user to do"*.

## Decision

- **No command.** The window prints none. `npx skills add` leaves the page with the constant that held it, the
  three-step strip that described it, its Dictionary key, and the two Error Codes that demanded it. A visitor with
  a terminal who wants no agent takes the way out instead.
- **One prompt, and it is not a command.** The window's one action is a single sentence naming the published
  Onboarding skill by its raw URL, with the Copy control under it:

  `Set up traj: read https://raw.githubusercontent.com/trajectonomics/skills/main/skills/traj-onboarding/SKILL.md and follow it.`

  A prompt is not a command: it carries a URL and an instruction, and the commands live in the Skill, which is
  where they are versioned and proven. A prompt that quoted a command would be the second command ADR 0009
  rejected, one indirection further out.
- **Copy confirms twice.** The toast speaks, and the button paints the accent role with its accent foreground and
  a short "Copied" for the same six seconds, driven by one timer so the two cannot disagree. Hovering changes
  neither the colour nor the countdown, and there is no undo.
- **One way out, unchanged.** The quiet row under the prompt still links the Docs Portal's CLI installation page,
  with the same `href` and the same Dictionary words. `PAGE_CLI_INSTALL_LINK_MISSING` still matches by `href`
  alone, so removing the strip beside it cannot fail that rule.
- **The proof principle extends to URLs, and that is the honest limit.** The Site's checks stay pure and
  network-free: they prove a fixture and a link, never that a command works, and now never that the file at the
  raw URL still answers or still says what it said. `trajectonomics/skills` owns that file and proves the install
  it leads to; nothing in this repository can detect a 404 there. **This is a named gap, not a solved problem.**
  The same holds for a printed URL as once held for a printed command, which is the reason ADR 0009 gave for
  putting the proof in the shipping repository in the first place.
- **"No command" is enforced as far as a pure check can reach it.** The window's only `code` element is the
  prompt, and a built Language home printing an `npx skills add` line fails. Neither rule can ban "a command" on
  the page in general, because the hero and the sections print product copy on purpose; the record says so rather
  than implying more.
- **The measured copy keeps its wire names.** `site_command_copied` and its stable `install` value are measured
  history, so they stay exactly as they are while the code around them says prompt. Renaming a measured event
  splits the series it exists to produce. [ADR 0011 (analytics)](./0011-analytics-from-the-page-itself.md) says
  why the value is stable: "never by its text, which changes every release".
- **Retired Error Codes are retired.** `INSTALL_COMMAND_MISSING` and `INSTALL_COMMAND_SCRIPT_ONLY` are removed,
  never reused, and the new codes describe the new rules ([CODING_STANDARDS.md](../../CODING_STANDARDS.md): one
  code per rule, and a code's meaning never changes).

## Why the record supersedes rather than amends 0009

0009's title, its filename and its first bullet are "one command". An amendment would leave all three false.
This repository had never marked an ADR superseded before — all eleven earlier records are `status: accepted`
and refinements are dated amendment sections — so *superseded* means here what it says: the decision no longer
governs, its text is kept for the history, and the surviving halves of it are restated above rather than
inherited by reference. 0009 stays on disk and is marked `superseded by ADR-0015`.

[ADR 0007](./0007-landing-page-restyle-twenty-language.md) needs its own amendment rather than a supersession:
it records the three-step strip and the `Command copied` toast as parts of the restyle, and only those two lines
change.

## Considered Options

- **Amend 0009 in place.** Rejected: a document called "The Site prints one command" that explains why it does not
  is the kind of thing a future reader trusts wrongly. The owner's reversal deserves a record that starts true.
- **Keep the command and add the prompt beside it.** Rejected by the owner: two doors whose first is a command is
  not "very simple thing for user to do", and it would print a second command.
- **A second Copy control for the prompt, leaving the command's in place.** Rejected in the Spec: two Copy
  controls in one window is the competition 0009 rejected a second command over, and the shipped script and its
  four rules are written for one.
- **A prompt that quotes the one-liner.** Rejected: it restates what the Skill already carries, and it drifts with
  every release of the skills CLI.
- **Wait for a skills-free install path before dropping the command.** Considered and rejected as a blocker: the
  prompt names the Skill file, so what the Skill does internally is its own repository's to change, and the Site
  needed no second edit when that change landed (`trajectonomics/skills#25`).

## Consequences

- `trajectonomics/skills`'s `scripts/check-traj-onboarding-install.sh` carried the comment "The website shows one
  command, so this check is what keeps it true". The check proves the Skill installs and never reads the Site, so
  it goes on working; only that sentence is now false, and it belongs to that repository to correct.
- `trajectonomics/docs`'s `/docs/cli/installation/` documents the install channels and the skill line, and never
  named the Site; it stays true.
- A visitor on Node 20 to 22.19, or whose agent the skills CLI cannot detect, is served by the way out and not by
  the prompt: the Skill's own install still needs the skills CLI. The prompt removes the terminal, not the
  dependency.
- The wizard script and the cloned workspace stay rejected, exactly as 0009 left them. Only the "keep one command"
  half of site#38's answer reverses; site#43's way-out row and site#44's rule stand untouched.
- The copy rate is measured the same way it was: `site_command_copied` over `$pageview`.
- The window's copy is the owner's, in both Languages, and the prompt is one English fixture in every Language
  because its reader is the agent.
