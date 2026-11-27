# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `packages/site-header` (`@trajectonomics/site-header`). It is a private workspace package: it is never published, and the Site, the blog and the data site render it as raw `.astro` source.

## Rules

1. The package is the only place a static site's header markup lives. `SiteHeader.astro` draws the shared three-column frame from `@trajectonomics/brand/header.css`: the brand tile and marker at the start, the site's own sections in the centre, and its tools at the end. A site passes only its slots and its marker; it never re-creates the start column, the columns' order or the Language menu.
2. `LanguageMenu.astro` is the one Language selector on every static site. Keep its behaviour byte-for-byte with the Site's ADR 0005 inline-script budget: one disclosure open at a time, a 150 ms close delay on a fine pointer, Escape returns focus, `focusout` closes, an outside pointerdown closes.
3. It ships raw `.astro` with no build step. Do not add a bundler, a framework adapter or a CSS preprocessor. Colours and radii come from the brand's `--ds-*` roles; never write a colour literal.
4. Done means `bun run check` passes here: Biome with zero warnings, `tsc`, and `bun test` rendering the components through Astro's Container API. Do not loosen `tsconfig.json` or `biome.json` to make an error go away.
