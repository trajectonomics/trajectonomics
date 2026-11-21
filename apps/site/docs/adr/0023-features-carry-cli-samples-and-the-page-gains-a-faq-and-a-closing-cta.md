---
status: accepted
---

# The Features carry samples of the CLI, and the page gains a FAQ and a closing call to action

## Context

The owner asked on 2026-11-22 for the Features section to be improved and a FAQ added, using Mobbin's website
sections as the reference, and then for one more section of the agent's choosing. Features was six equal text cells;
a visitor read claims ("shows its working", "agent-operated") with nothing on the page that showed them. The setup
questions a visitor asks (is it free, does my data leave my machine, which agents, why baht only) were answered only in
the footer's fine print or the CLI's README.

## Decision

- **Features keeps its six strings and gains two wide cards.** The Dictionary's feature order now leads with "Shows its
  working" and "Agent-operated", and those two cells span half the grid each with a sample of the CLI's own output
  above their text: `traj fi --json` and `traj schema fi --json`, abridged with `…`. The other four are quarter-width
  cells. The samples are code, the same in every Language, so they live in `src/lib/site/feature-samples.ts`; their
  field names follow `apps/cli/src/projection/fi-view.ts` and the engine version is the committed Release snapshot's,
  so a release moves it. They wrap rather than scroll ([ADR 0021](./0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
  References: Resend's and Cursor's feature cards on Mobbin.
- **A FAQ section follows Features.** The heading holds the left column and eight questions the right (Retool's FAQ on
  Mobbin), one column below 64 rem. Each question is a native `<details>`, so it opens with no script and its answer
  is in the page for search engines and agents; a question is a `summary`, not a heading
  ([ADR 0012](./0012-one-h2-per-section.md)). The answers paint `foreground`, which keeps 4.5:1 on the muted surface.
  The answers are drafts from the CLI's README and the Site's own copy, and the Thai has not been read by a Thai
  speaker.
- **A closing call to action ends `main`.** It puts the demo's question to the visitor's own agent and repeats the
  hero's two controls. The page keeps one Copy control and no visible prompt
  ([ADR 0015](./0015-the-window-prints-a-prompt-and-no-command.md), amendment of 2026-11-19), so the filled control is
  a link to `#install`, the hero's install window, and ships `hidden` until the copy script shows the Copy control, so
  with JavaScript off it never leads to a control that is not there. The outlined one goes to the hero's way out in its
  own words ("Install the CLI yourself"), because the keyboard check tells two controls apart by their words. The copy
  rate is still one button's.
- **Surfaces alternate.** Features on the page surface after the hero, the FAQ on the muted one, the closing section on
  the page surface again.

## Considered Options

- **Bring How it works back as the extra section.** Rejected: [ADR 0022](./0022-the-hero-carries-one-app-window-and-the-page-loses-how-it-works.md)
  records the owner removing it, and the demo window tells that story.
- **A second Copy button in the closing section.** Rejected: the copy script binds one button, the page has about
  800 bytes of its Program JavaScript budget left ([ADR 0005](./0005-page-weight-and-web-font-budget.md)), and ADR 0015
  keeps one Copy control.
- **Show the prompt in the closing section for a visitor to select.** Rejected by ADR 0015's amendment: no visible
  prompt in a CTA.
- **A JavaScript accordion for the FAQ.** Rejected: `<details>` needs no script and works with JavaScript off.

## Consequences

- The page sets `scroll-padding-top` for the fixed 64 px header, so a link's target or a focused control lands below it.
- `e2e/feature-samples.e2e.ts` asks that the samples wrap at the phone viewport, and `/llms-full.txt` carries the FAQ.
- The four home baselines change, regenerated in `mcr.microsoft.com/playwright:v1.65.0-noble` with `fonts-dejavu-core`
  ([ADR 0019](./0019-the-site-prints-the-release-from-a-committed-snapshot.md)); the not-found pair does not.
- The twelve `docs/screenshots/` renders now predate these sections.
- The Dictionary gains `faq*` and `cta*` strings in both Languages; `dictionary-strings.test.ts` follows the moved
  "Shows its working" sentence.
