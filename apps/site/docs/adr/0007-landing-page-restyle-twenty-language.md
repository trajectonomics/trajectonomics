---
status: accepted
---

# The landing page is restyled in twenty.com's whole visual language

The first pass ([ADR 0004](./0004-landing-page-redesign.md)) borrowed twenty.com's palette but kept the Site's
own type, radii, shadows and surfaces. This pass borrows the whole language: the page is rebuilt as flat
surfaces, hairlines, a mono meta layer and one accent, in both Languages and both Themes. Decisions were
settled in a grilling session against the live site, measured in Chromium rather than guessed
([site#33](https://github.com/trajectonomics/site/issues/33)).

## Decision

- **Ground.** `main` paints `muted` (`#f5f5f5` / `#262626`); there is no hero band and no static radial glow.
  The pointer-follow light stays (removed later by [ADR 0013](./0013-the-hero-ripples-on-click-and-holds-still-on-hover.md)): it is the one JavaScript motion, and it moves with `transform` only. The hero's
  band and its baked pixel-blast field replace this paragraph, in
  [ADR 0010](./0010-the-hero-carries-a-pixel-blast-field.md).
- **Header.** 64 px, `background` with a hairline. The mark sits on a 40 px tile (32 px under 640 px) painted
  `primary`/`primary-foreground`, so it reads as a control rather than an image. The nav is Azeret Mono's
  place — 11 px mono uppercase with hair separators: `Docs │ ★ cli ⌄ │ EN ⌄`.
- **Footer.** `stage`/`stage-foreground`, added in core `0.1.0-alpha.4`, so the footer is dark in both Themes.
  The release line and its date move here from the hero.
- **Type.** Body text is the Theme's own sans stack, which is also where the Thai fallback lives. The display
  family is `--font-display` and the mono is `--font-meta`, both defined once in `src/styles/global.css`; the
  font files arrive with [design-system#77](https://github.com/trajectonomics/design-system/issues/77), and only
  those two lines change when they do. The hand-written Thai stack and its line-height block are gone: the Theme's
  `typography.css` sets 1.7, and 1.8 for Thai, with `word-break: normal`.
- **Shape.** 4 px controls (`radius.sm`), 6 px cards and panels (`radius.md`), 12 px terminal window
  (`radius.xl`); hairlines only. The only box shadows are the scrolled header's and the copy toast's.
- **Button.** A filled control on `primary`, or an outlined one, both 4 px, with a 16 px bottom-right bevel:
  `border-radius: 4px 4px 16px 4px` plus `corner-shape: round round bevel round`, and a plain 4 px radius where
  `corner-shape` is unsupported.
- **Accent.** Orange `accent` replaces the red `destructive` kicker: the pill's marker, the hero's cycling suffix
  and the toast's check. No colour literal is written in the Site.
- **Navigation.** The Star menu's trigger is a star and the name of the repository with the most stars, with
  no verb: it stars a repository rather than opening GitHub. The panel is 236 px on `popover`, with a group
  label, one 34 px row per repository (name, tabular count), no current value and so no check, and
  `All repositories ↗` to the Organisation. The Language menu stays a plain panel with no group label and no
  check. The panel floats 8 px below its summary and carries a transparent 8 px bridge across the gap; it
  closes 150 ms after the pointer leaves, so a crossing is not a dismissal. Escape and an outside click close
  it, and a click never closes a menu the pointer holds open.
- **Pictures replace prose.** The eyebrow becomes a 28 px hairline pill (`v0.1.0` · hairline · `MIT · open
  source`). Below the `h2`, two 232 px wireframe tiles joined by a 56 px `traj calc` connector replace the
  paragraphs: the AI agent with two chat bubbles, the CLI showing `$ traj plan` → `14,280.00`, one line of five
  words under each title, and the two links under the diagram. Under the install command, a three-step strip
  (terminal → `?` → `✓` with a 12 px mono label each) replaces the instruction paragraph.
- **Copy feedback.** A floating toast at the bottom-right: 236 px, 4 px radius, a soft shadow, the accent check,
  `Command copied`, and a 2 px countdown line along its bottom edge (CSS animation, `aria-hidden`). It keeps
  `role="status"`, `aria-live="polite"` and the existing 6 s timer.
- **Primitives.** `src/components/ui/` holds Astro components with shadcn-style `data-slot` attributes and
  variants (`Button`, `Badge`, `Card`, `Separator`). Every colour is a Semantic Token Role and every radius one of
  `rounded-sm`, `rounded-md`, `rounded-xl`. No Svelte runtime ships.
- **Star data.** `src/lib/site/stars.json` is a committed snapshot (`asOf` and the count per repository), written
  by `scripts/stars.ts` from `gh api orgs/trajectonomics/repos` and refreshed with `bun run stars:update`. The
  build reads it as plain data through a pure module. It is ordered by stars, a repository at zero is absent, and
  a snapshot where every count is zero shows no number. Counts print as `1`, `999`, `1K`, `2.1K`, `60.4K`.

## Considered Options

- **Keep the hero band and the static glow.** Rejected: the ground is `main` on `muted`, so a band would be a
  second surface tint, and a static radial glow is exactly the elevation the flat language drops.
- **Download the display and mono faces now.** Rejected at the time: the Site forbade a Web font ([ADR 0005](./0005-page-weight-and-web-font-budget.md));
  design-system#77 ships the files and a font budget as a separate change, and the two custom properties make it
  one file here. That separate change has landed: see the amendment below.
- **Keep the inline copy pill.** Rejected: a pill inside the window reflows the command, while a floating toast
  leaves the layout alone and reads as a system confirmation.
- **Fix the menu's 10 px gap by moving the panel.** Rejected: a panel touching its trigger loses the float the
  design asks for; the transparent bridge keeps both.
- **Sort and count stars in the component.** Rejected: the ordering, the zero rule and the format are data rules,
  so they live in a pure module with tests, and the adapter only writes the file.

## Consequences

- The landmark colour rule generalises to a surface and its text role ([ADR 0008](./0008-landmark-surface-roles.md)).
- The Dictionary is reshaped: `heroRelease`/`heroReleaseDate` become the footer's `releaseLine`/`releaseDate`; the
  hero pill has `heroVersion`/`heroLicence`; the diagram and the step strip have their own keys; `nextStep` and
  `twoPartFootnote` go, and the skills and CLI-docs links move under the diagram.
- `src/styles/global.css` imports the Theme's `typography.css` and drops the hand-written Thai stack.
- `e2e/menus.e2e.ts` reproduces the pointer crossing the bridge, so the bug the issue reports cannot come back
  unnoticed.
- The pill's radius is `radius.sm` (4 px), not the 2 px the sketch carried: a radius comes from the
  scale, and 2 px is not on it.
- The twelve visual baselines change, and only because the page changed.
- This record supersedes the "direction" paragraph of [ADR 0004](./0004-landing-page-redesign.md) (palette-only
  restyle, red kicker, hero band and glow) and its 1.6 Thai line height. Its static-artifact decisions, the JS
  budget and the Copy button's behaviour stand.

## Amendment (the Brand Typeface)

The "Type" bullet's "the font files arrive with design-system#77" is now fact, and the rejection of "Download
the display and mono faces now" no longer holds. `@trajectonomics/design-system-assets@0.1.0-alpha.4` ships
Aleo 300 and 400 and Azeret Mono 500, and the Site serves them itself under the Font budget in
[ADR 0005](./0005-page-weight-and-web-font-budget.md): 40,632 bytes of the 48,000-byte font budget.
`src/styles/fonts.css` declares the faces with their metric-matched fallbacks, and `src/styles/global.css`
names them in the two custom properties this record reserved. Body text and Thai are unchanged: the Theme's
system sans stays the body face, and no Thai font file ships.

## Amendment (2026-11-16, owner): the Star menu's trigger and panel

The owner's answer to Q3 of site#39 settles what the Star menu looks like: "the header menu should be star and
the list down there right now it looks like a check mark which we don't" (site#42). The menu is therefore not a
select. The trigger draws a star in place of the GitHub mark and keeps the repository name beside it, so its
accessible name stays `GitHub stars: <repository>`; the panel has no current value, so the check on its first
row goes with the select framing. The rows are equal links out and nothing in them is selected. The repository
names `cli` and `skills` stay as site#37 left them (superseded by the 2026-11-21 amendment below), and the star is drawn at 12 px like the icons beside it.

## Amendment (2026-11-21): the Star menu counts the monorepo only

`trajectonomics/cli` and `trajectonomics/skills` were archived when the monorepo cutover finished, so a star on
either no longer reaches the project. `STAR_REPOS` lists `trajectonomics/trajectonomics` alone, the repository
whose star the button adds, and the committed snapshot counts that repository (the count restarts from its own
stars, which is zero today). While every repository is at zero the snapshot lists none, and the menu lists
the repositories it may list with no count and no number on the trigger, so a visitor can still reach the
repository to star it. The row is named `trajectonomics/trajectonomics`, so it never reads as the footer's Organisation link. The `cli` and `skills` names in the amendment above are superseded by this one.
([site#17](https://github.com/trajectonomics/trajectonomics/issues/17))

## Amendment (2026-11-17, owner): the window prints a prompt

Two lines of the restyle describe a window that no longer exists. The "Pictures replace prose" bullet ends
"Under the install command, a three-step strip (terminal → `?` → `✓` with a 12 px mono label each) replaces the
instruction paragraph", and the "Copy feedback" bullet names `Command copied` as the toast. The strip is gone with
the command it described, and the toast now reports the prompt. Everything else in this record stands: the flat
surfaces, the hairlines, the mono meta layer, the one accent, the bevel, the panels, the twelve-pixel meta type
and the toast's shape, timing and countdown line are untouched, and the prompt's row and its Copy control are
built from them. [ADR 0015](./0015-the-window-prints-a-prompt-and-no-command.md) records why the command left.
