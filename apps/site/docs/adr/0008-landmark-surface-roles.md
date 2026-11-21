---
status: accepted
---

# A landmark paints a surface role and the text role that belongs on it

The landmark rule came from [ADR 0004](./0004-landing-page-redesign.md): `header`, `main` and `footer` each paint
the Theme's `background` and `foreground`, so a region can never paint a colour the published Theme does not
define. The restyle ([ADR 0007](./0007-landing-page-restyle-twenty-language.md)) puts `main` on `muted` and the
`footer` on `stage`, so one pair is no longer enough, and a rule that only judged `background`/`foreground` would
either fail the new page or have to be ignored.

## Decision

Every built page satisfies both rules, in every published Theme:

- **A published surface.** Each landmark paints one of the Theme's surface roles — `background`, `muted` or
  `stage` — and that role resolves to a colour. A landmark whose background is another role, or a role the Theme
  does not publish, fails `LANDMARK_COLOUR_NOT_WIRED`, whose meaning is unchanged: the colour is not wired to the
  Theme.
- **Its matching text role.** The landmark's text role is the one that belongs on that surface:
  `background`/`foreground`, `muted`/`foreground`, `stage`/`stage-foreground`. Anything else fails the new
  `LANDMARK_TEXT_ROLE_MISMATCH`.

The rule is about colour wiring, not layout: it does not say which landmark paints which surface. The pairings are
the three the Theme publishes; adding a surface is a design-system change and a line here.

## Considered Options

- **Pin one pair per landmark** (`header` background, `main` muted, `footer` stage). Rejected: that is a layout
  decision, and it would fail a page that paints the published roles on a different landmark for a good reason,
  which then needs an ADR for every layout change.
- **One Error Code for both rules.** Rejected: `CODING_STANDARDS.md` says one code per rule, and a landmark can
  break either one on its own.
- **Keep `background`/`foreground` only and exempt the new regions.** Rejected: an exemption is a hole in the rule;
  the page would ship a footer no check judges.

## Consequences

- `src/lib/build/landmark-colours.ts` reads the three pairings and reports both codes; `failures.ts` gains
  `LANDMARK_TEXT_ROLE_MISMATCH`.
- The built-file fixtures publish `stage` and `stage-foreground` and paint `main` on `muted` and the footer on
  stage, so the rule is tested against the page the Site actually ships.
- Secondary text on `muted` passes WCAG AA because core `0.1.0-alpha.4` moved `muted-foreground` to `#525252`;
  on `stage` it does not, so the footer's text stays `stage-foreground`. The contrast check, not this rule, is what
  holds that line.
