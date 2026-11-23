# ADR 0003: The Interface Language and a Post's Languages are separate

## Status

Accepted, 2026-11-23. Settles how the blog picks a Language on its own host, the question
[ADR 0002](./0002-the-blog-is-static-on-its-own-host.md) left to the Language and SEO ticket (#143).

## Context

The blog speaks English and Thai. Translating the Shell is cheap: a few dozen labels in one
Dictionary file. Translating a Post is not: every Post is a long article, and most Posts will only
ever be written in one or two Languages. The first four Posts already show it: two were written in
English and two in Thai. So the Language a reader browses in and the Language a Post is written in
cannot be one setting.

ADR 0002 rules out a Worker script, so the blog cannot read `Accept-Language` or a cookie: the
Language has to live in the address.

## Decision

- **Two Languages, kept apart.** The Interface Language is the Language of the Shell and the page's
  labels. A Post Language is a Language a Post is written in. `src/lib/languages.ts` lists every
  Language the blog knows, and every Language there has a Dictionary (`src/lib/dictionary-<code>.ts`).
- **One Language Tree per Interface Language.** English is the root (`/`, `/guides/<slug>/`), and
  every other Language lives under its own prefix (`/th/`, `/th/guides/<slug>/`). Every Post has a
  page in every tree, whether or not it is written in that tree's Language.
- **One Translation per file.** A Post is a folder, `src/content/posts/<slug>/`, with one
  `<language>.md` per Post Language. Its Translations must agree on type, publication date, draft and
  cover image; the build refuses a Post whose Translations disagree.
- **Match, else fall back.** A page shows the Translation in its Interface Language. When the Post is
  not written in it, the page falls back to English, and to the Post's own Language when it has no
  English. A page that falls back says so in a notice, and every Post page lists the Languages the
  Post is written in, each linking to that Translation's page in its own tree. The front page lists
  every Post with its Post Languages as codes.
- **Search engines index native pages only.** A page that falls back names the native page as its
  canonical and names no alternates, and the sitemap leaves it out. A native page names each of its
  Post's Translations as an `hreflang` alternate, with `x-default` on the page the default tree
  shows. `verify:build` fails a canonical or an alternate that names a page the build lacks.
- **No Language detection.** The blog never redirects by browser Language. The Language menu in the
  header is a set of plain links to the same page in each tree, so it works with JavaScript off.

## Consequences

- Adding an Interface Language is a Dictionary file, an entry in `LANGUAGES` and in the Dictionary
  table. Every Post gets a page in the new tree at once, falling back where it has no Translation.
- Adding a Translation is one Markdown file beside the Post's others. Nothing else changes.
- An address shared before this ADR still answers: `/guides/<slug>/` is the English tree's page.
  For a Post written only in Thai it now falls back, and names `/th/guides/<slug>/` as its canonical.
- #143's router-based acceptance criteria (`/__lang`, a router resolver) no longer apply to the
  blog. Its structured-data criteria (`Article`, `BreadcrumbList`, `FAQPage`) are still open.
