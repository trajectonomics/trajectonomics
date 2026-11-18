---
status: accepted
---

# The Site states the three setup limits in its footer

Eight personas read the live Site on 2026-11-18 (site#69). Three of them met the same wall: the page
offered a setup prompt and nothing about what the setup needs or costs. A visitor learned that `traj`
takes Thai baht only *after* the install, from `unsupported_currency: v1 supports THB only`. A first run
downloads about 100 MB, and nothing on the page said so. The Thai home named no agent at all, so a
visitor whose assistant is a chat window read "pipe this to your agent" and stopped. Two claims were
stale besides: the Features text said every result states "the assumptions it applied", which the CLI's
output has no field for, and the footer still named v0.1.0 as the stable release after the CLI shipped
v0.2.0 on 2026-11-17.

The three facts first sat in the hero, between its sub-line and the install window. The owner did not
keep that placement, in the Run thread on 2026-11-18:

> "dont like the design let move it to the footer then should not be in the hero"

## Decision

- **Three plain facts, in the footer.** The footer shows a definition list above its disclaimer: the
  currency, the first run's download, and the agent the step needs. Each fact is a short mono label over
  one plain sentence, so it reads as a spec strip rather than as prose. It carries no heading, because
  the page's one claim is the `h1` and its sections are the only `h2`s ([ADR 0012](./0012-one-h2-per-section.md)),
  and the hero keeps its claim and the step ([ADR 0015](./0015-the-window-prints-a-prompt-and-no-command.md)).
  The strip opens the footer's legal band with its hairline; the disclaimer no longer carries one of its
  own, so the two do not stack.
- **The facts say what the visitor meets, in the visitor's words.** "Thai baht only, for now." "About
  100 MB downloads once." "A coding agent that can run commands, such as Claude Code, Codex or Cursor."
  The requirement is the ability to run commands; the named agents are examples, so a renamed or newer
  agent falsifies nothing. The way out to the Docs Portal's installation page stays where it is, for the
  visitor with a terminal and no agent.
- **A built-file rule holds the strip.** `checkFacts` requires every fact's label and text, and the
  strip inside the footer, because dropping one fact is a text edit and moving the strip back to the
  hero is a layout edit: either would pass review unseen, and the trap the personas hit would return
  ([site#69](https://github.com/trajectonomics/site/issues/69)). `PAGE_FACTS_MISSING`,
  `FACT_NOT_STATED` and `PAGE_FACTS_NOT_IN_FOOTER` name the three ways a home can break it.
- **The page claims only what the CLI's output carries.** The Features text now says a result states its
  as-of date, engine version and scenario in its JSON, which is the echo block the CLI prints. It no
  longer says "the assumptions it applied", a field the CLI does not have.
- **The release line names each part at its own version.** `traj CLI` v0.2.0 and `traj-onboarding`
  v0.1.0 ship on their own schedules, so one number for both is false as soon as they diverge.

## Considered Options

- **The facts in the hero, above the step.** Chosen first and rejected by the owner: the hero's job is
  the page's one claim and the step, and three limits there read as a warning beside the call to action.
- **A "read this first" block with its own heading.** Rejected: a third heading level is banned and a
  second tier of headings competes with the page's one claim.
- **The limits in the Docs Portal only.** Rejected: the download and the currency refusal happen on the
  visitor's machine during setup, before they would ever follow a docs link.
- **Name the currency limit inside the prompt.** Rejected: the prompt is one fixture every Language
  shares and its reader is the agent, not the visitor; the window's job is the step, not the caveats.
- **Keep "the assumptions it applied" and add the field to the CLI.** Rejected here: the Site cannot
  prove a CLI field, and the field is the CLI's to name, not this page's to promise.
- **Pin one version for both parts and bump it when either ships.** Rejected: it prints a version one of
  the two never published.

## Consequences

- The Dictionary gains `factLabels` and `factTexts`, three strings each in both Languages; the parity
  test holds them to the same shape as every other key.
- The three facts cost a few hundred bytes of page weight, well inside the budget
  ([ADR 0005](./0005-page-weight-and-web-font-budget.md)), and add no Program JavaScript.
- The screenshots in [`docs/screenshots/`](../screenshots/) are re-captured, because the strip left the
  hero for the footer and the release line changed.
- The Docs Portal's installation page still says `v0.1.0` is the latest release; that repository owns
  its own page and its own fix.
