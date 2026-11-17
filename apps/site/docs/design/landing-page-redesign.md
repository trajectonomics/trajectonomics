# Landing page redesign spec (twenty.com direction)

Status: the first pass (sections 1–6) is implemented; the second pass (section 7, [site#33](https://github.com/trajectonomics/site/issues/33))
replaced its type, surfaces and text blocks with twenty.com's flat language and is recorded in
[ADR 0007](../adr/0007-landing-page-restyle-twenty-language.md). The owner picked **variant A (Glow hero)** with EN prefix 1
("The only tool your agent needs for") and the suffixes/Thai shown in the prototypes.
Decisions are recorded in [ADR 0004](../adr/0004-landing-page-redesign.md). Research sources:
live twenty.com plus `github.com/twentyhq/twenty` `packages/twenty-website/src` (tokens, sections,
motion kit), read 2026-06.

## 1. What twenty.com does (condensed findings)

- **Surfaces**: light-first with three schemes — `light` #ffffff, `muted` #f4f4f4, `dark` #1c1c1c —
  ink #1c1c1c, hairlines at 10/20/40% alpha. Our published themes map almost 1:1: `background`,
  `muted`, `border`, `foreground`, `muted-foreground` in both light and dark.
- **One accent**: blue #4a38f5 for eyebrow markers, plus-marks, hovers, focus rings. For us the
  kicker is the published `destructive` red until [design-system#59](https://github.com/trajectonomics/design-system/issues/59)
  ships an orange `accent`.
- **Hero**: muted surface + warm radial glow (`radial-gradient(80% 60% at 50% 40%, …)`), centered
  column with 32px stack gaps, h1 capped at 672px in a light serif with an accent span that swaps
  family, subline 16px muted capped at 591px, CTA row (filled + outlined, 40px tall, mono uppercase
  12px), then a life-size product window (1040×676) that bleeds off the right edge on small screens.
- **Header**: sticky 64px, opaque, hairline border, elevation shadow after 8px of scroll, nav links
  in mono uppercase 12px that turn accent on hover.
- **Type**: weights only 300/400/500; headings tight tracking (-0.02/-0.04em) and `text-wrap:
  balance`; fluid `clamp()` sizes between 390px and 921px viewports.
- **Motion**: durations 150–600ms; easings `standard` cubic-bezier(0.22,1,0.36,1), `smooth`
  (0.4,0,0.2,1), `gentle` (0.16,1,0.3,1), `spring` (0.2,0.8,0.2,1); a global
  `prefers-reduced-motion` kill switch; scroll reveals as rise+scale (200px, 0.88→1) with stagger.
- **Spacing**: 4px grid, gutter 16px/40px, max content 1512px, radius 2px base (20px on the big
  window), shadows soft and large.

## 2. Mapping to this Site's constraints

| twenty.com pattern | here | why |
|---|---|---|
| muted hero surface + glow | hero section on `bg-muted` + radial glow written with `var(--ds-color-*)` | no colour literals allowed; `transparent` and `var(--ds-…)` are the allowed values |
| accent blue #4a38f5 | `text-destructive` (red) now, `text-accent` (orange) after design-system#59 | colour-literal check forbids raw values in the Site |
| serif light h1 with accent span | h1 in `font-light` (300) with the rotating suffix in `text-destructive` | system font stack only, no web fonts |
| life-size product window | a framed "terminal window" card (rounded-2xl, border, shadow) holding the install command | we have no product screenshot; the command is the product |
| sticky header + scroll elevation | `sticky top-0` header, elevation via CSS scroll-driven animation inside `@supports (animation-timeline: scroll())`, hairline border as fallback | landmark check still requires header to paint `background`/`foreground` |
| dark footer stage | not adopted | the landmark-colour check requires `footer` to paint the theme's `background`/`foreground` |
| rAF scroll reveals | CSS scroll-driven `animation-timeline: view()` inside `@supports`, static fallback | 0 JS bytes, compositor-friendly |
| WebGL halftone backdrop | not adopted | cannot meet the JS budget or Lighthouse 0.95; the radial glow carries the mood |
| pointer-reactive light | one small JS layer: a glow div following the pointer with `transform` only, rAF-throttled | the one JS animation, ~0.4 KB |

Contrast note: `muted-foreground` on `muted` is 4.36:1 in the light theme (fails AA 4.5:1), so on a
`bg-muted` hero the subline must use `text-foreground`, or the hero stays on `bg-background` with the
glow on top. The build check decides; variants below assume hero on `bg-muted` with `text-foreground`
subline (variant C keeps `bg-background`).

## 3. Variants (prototypes rendered in the preview browser)

- **A — "Glow hero"**: hero on `bg-muted` with radial glow, centered stack, prefix+suffix h1 with
  red suffix, subline `text-foreground`, terminal-window card with the install command, sticky
  header with scroll elevation, staggered load-in rise, pointer glow (JS).
- **B — "Split hero"**: hero on `bg-background`, left-aligned prefix+suffix h1 (suffix red), subline
  right column or below, command card on the right at ≥md, glow behind; same header/footer polish.
- **C — "Minimal frame"**: current centered layout kept, but with twenty's rhythm: 32px stack gaps,
  fluid h1 clamp, hairline header with elevation, command inside a bordered window frame with
  traffic-light dots (muted tones), load-in fade only, no pointer glow (JS reserved).

All three: same header (sticky, wordmark, Docs, GitHub, switcher), same footer (hairline top,
links left, disclaimer right), both themes, both languages, Thai line-height 1.6, one h1, no other
headings.

## 4. Copy (adopted for the v0.1.0 launch)

The v0.1.0 launch revision ([site#24](https://github.com/trajectonomics/site/issues/24)) replaced §4's
options with this copy. It is the owner's, verbatim, and it is the source of the strings in
`src/lib/language/en.ts` and `src/lib/language/th.ts`.

EN prefix: "The only tool your agent needs to" ; suffixes (cycle, last held): "plan your
retirement." / "project your finances." / "build your future."

TH prefix: "เครื่องมือเดียวที่ agent ของคุณต้องมี เพื่อ" ; suffixes: "วางแผนเกษียณอายุ" /
"คาดการณ์อนาคตทางการเงิน" / "สร้างอนาคตของคุณ".

The hero subline, the release line (`v0.1.0 stable — traj CLI + traj-onboarding` with the CLI's
release date as its own run), the two-part section below the hero, the next step under the install
command and the footer's stable wording are all in those two Dictionary files, which are the source
of truth for the copy.

## 5. Motion plan (CSS first, one JS layer)

- Load: hero children staggered rise+fade, 600ms `gentle`, delays 0/80/160/240ms. CSS keyframes.
- Headline suffix cycle: existing JS, 2.4s steps, `prefers-reduced-motion` respected.
- Header elevation: `box-shadow` via `animation-timeline: scroll()` (range 0–8px) inside `@supports`;
  fallback hairline border. CSS.
- Pointer glow in hero (variant A/B): one absolutely-positioned radial-gradient div, `transform:
  translate3d` updated on rAF-throttled `pointermove`, disabled under reduced motion. ~0.4 KB JS.
- Global `@media (prefers-reduced-motion: reduce)` kill switch. CSS.
- Budget: JS total stays ≈3 KB of the raised 10,000-byte budget; HTML+CSS gzip stays under 50 KB;
  Lighthouse mobile ≥ 0.95 remains the hard gate in `browser.yml`.

## 6. Open for the owner

1. Pick variant A, B or C.
2. Pick EN prefix + suffixes and approve the Thai.
3. Confirm hero surface: `bg-muted` (subline `text-foreground`) vs `bg-background`.

## 7. Second pass: the whole visual language (site#33)

The first pass kept our type, radii, shadows and surfaces. The second borrows the rest, measured in Chromium on
the live site during a grilling session, and recorded in [ADR 0007](../adr/0007-landing-page-restyle-twenty-language.md)
and [ADR 0008](../adr/0008-landmark-surface-roles.md).

| Part | What it is now | Where it lives |
|---|---|---|
| Ground | `main` on `muted`, no hero band, no static glow, the pointer light kept | `src/layouts/Layout.astro`, `src/styles/landing.css` |
| Header | 64 px, `background`, hairline; mark on a 40 px tile (32 px under 640) on `primary`/`primary-foreground`; mono nav `Docs │ ★ cli ⌄ │ EN ⌄` | `Header.astro`, `src/styles/header.css` |
| Menus | Star menu's trigger is a star and the top repository's name; its panel is 236 px, a group label, 34 px rows with tabular counts, no current value and no check, `All repositories ↗`; Language menu is a plain panel; an 8 px bridge and a 150 ms close | `StarMenu.astro`, `LanguageMenu.astro`, `src/styles/menu.css` |
| Type | Theme sans for body; `--font-display` (Georgia until ds#77) for the headline and the `h2`; `--font-meta` (the Theme's mono) for every meta label; Thai from `typography.css` (1.7, Thai 1.8) | `src/styles/global.css`, `src/styles/landing.css` |
| Shape | 4 px controls, 6 px cards and panels, 12 px terminal window; hairlines; shadows only on the scrolled header and the toast | `src/components/ui/`, `src/styles/primitives.css` |
| Button | Filled/outlined with a 16 px bottom-right bevel under `@supports (corner-shape: bevel)`, plain 4 px otherwise | `ui/Button.astro`, `src/styles/primitives.css` |
| Accent | `accent` orange: pill marker, headline suffix, toast check | roles only |
| Hero | A 28 px hairline pill (`v0.1.0` · hairline · `MIT · open source`), the display headline, the sub-line, the terminal window | `Hero.astro` |
| Command | Window with bevel Copy button, a three-step strip (terminal → `?` → `✓`, 12 px mono labels), one quiet row under the strip linking the CLI installation page ([ADR 0009](../adr/0009-the-site-prints-one-command.md)), and the floating 236 px toast with a 2 px countdown line | `CopyCommand.astro`, `src/styles/command.css` |
| Section | The `h2` stays `Two parts, one command`; two 232 px wireframe tiles joined by a 56 px `traj calc` connector; the two links under the diagram | `TwoParts.astro`, `src/styles/diagram.css`, `src/styles/wireframe.css` |
| Footer | `stage`/`stage-foreground`, dark in both Themes; the release line and its date moved here from the hero | `Footer.astro` |
| Star data | Committed `src/lib/site/stars.json` (`asOf` + count per repository), written by `bun run stars:update`; sorted desc, zero absent, no number when all are zero | `scripts/stars.ts`, `src/lib/site/stars.ts` |

Copy added in this pass, in both Dictionaries: `heroVersion` (`v0.1.0`), `heroLicence` (`MIT · open source`),
`starMenuGroupLabel`, `starMenuAllRepos`, `agentCardTitle`/`agentCardCopy` (five words), `cliCardCopy`,
`diagramConnector`, three `stepLabels`, and `copied` becomes `Command copied`. `heroRelease`/`heroReleaseDate`
became the footer's `releaseLine`/`releaseDate`; `nextStep`, `twoPartFootnote` and the Skills card copy left with
the paragraphs they belonged to. `src/lib/site.ts` keeps the install command, the diagram's `$ traj plan` fixture
and its `14,280.00` figure, because those are product facts, not Language.

Not adopted, and why: a downloaded display or mono face (forbidden until design-system#77; now adopted, see ADR 0007's amendment), the
728 px tiled favicon (design-system#76), and moving the primitives into `@trajectonomics/design-system-svelte`
(design-system#74, site#32).

## Amendment (2026-11-16, owner)

The owner's answer to Q3 of site#39 (site#42) corrects the Menus row: "the header menu should be star and the
list down there right now it looks like a check mark which we don't". The Star menu is not a select. Its
trigger draws a star in place of the GitHub mark, keeps the repository name and the accessible name
`GitHub stars: <repository>`, and its panel carries no current value, so the check on its first row goes. The
repository names `cli` and `skills` stay as site#37 left them (Q3's second answer: "Keep repo name match like
this"), and the trigger's nav sketch above reads `★ cli` rather than the GitHub mark and a count.

## 8. Third pass: a headline that holds still and three more sections (ADR 0012)

The owner's brief: change the headline to "Deterministic layers for your Financial Planning", remove its animation and
highlight "Financial Planning"; add **See it in action** (an agent told to plan your future vs an agent using the skills
and CLI), a **Features** section, and a redesigned **How it works** that says the user's agent uses skills to control the
CLI under the hood, the agent owns the presentation layer and traj owns the logic layer; and take the footer and the other
sections from twenty.com. Reference: twenty.com, the same direction as ADR 0007.

| Part | What it is now | Where it lives |
|---|---|---|
| Headline | Static `heroHeadingPrefix` plus the accent run `heroHeadingAccent` ("Financial Planning") on its own line in `accent`, in regular weight with the field cleared from behind it ([ADR 0014](../adr/0014-the-hero-field-leaves-the-centre-and-the-headline-is-regular.md)); the suffix cycle, its script and its CSS are gone. The load-in rise stays; the pointer light is removed and the field ripples on a click instead ([ADR 0013](../adr/0013-the-hero-ripples-on-click-and-holds-still-on-hover.md)) | `Hero.astro`, `landing.css` |
| See it in action | Two panels asked the same question: the agent alone (dashed, three different guesses) and the agent with the traj skill (solid, the real `traj fi --json` command, its abridged JSON, and the same answer three times) | `SeeItInAction.astro`, `compare.css`, `conversation.css`, `terminal.css` |
| How it works | Four numbered steps beside two layers: the **Presentation layer** (dashed, light, "Owned by your agent": chat, tables, charts, narration), the **Skills** join, and the **Logic layer** (solid, dark, "Owned by traj": projections, tax, FI date, ledger) | `HowItWorks.astro`, `how.css`, `layers.css` |
| Features | Six cells on one hairline grid, titles as plain text (no `h3`): deterministic, agent-operated, local-first, open source, tax on request, shows its working | `Features.astro`, `features.css` |
| Footer | Stage surface; the name and a line beside three labelled link columns (Product, Open source, Help); the disclaimer under a hairline (still the footer's first paragraph); the release line; a wordmark drawn as generated content, cropped at the bottom edge | `Footer.astro`, `footer.css`, `footer-legal.css` |
| Rhythm | Hero and See it in action on `background` with no seam between them (ADR 0010), How it works on `muted` ruled above and below, Features on `background`, footer on `stage` | `sections.css` |

Every fact in the demo is the CLI's own: the command is from `traj fi`'s examples, and the JSON uses its field names
(`asOf`, `tax: not_applied`, `method: survival`, `fi.reachable`, `fi.fiDate` as `YYYY-MM-DD`). The output is labelled
"Example output, abridged", and the three guesses on the left are illustrative copy, not measurements. The old tile
diagram showed `traj plan` and `traj calc`, which the CLI does not have; they are gone with it.

Two build rules shaped the markup: the stylesheets may not write `color-mix()` (the colour-literal check), so secondary
footer text is `opacity`, and the page has one `nav`, so the footer's columns are lists. The footer's links are worded
apart from the header's and the sections' (`Documentation`, `CLI docs`), because the keyboard test treats each tab stop
as one unique control.

Thai copy for every new string is a first draft in `th-sections.ts`; it was not read by a Thai speaker.

