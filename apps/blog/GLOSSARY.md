# Glossary

The blog's words. Code, tests, commit messages and pull request titles use them exactly; a synonym
in a diff is a defect. The Theme and brand words (Theme, Theme role, Favicon Set, Brand Typeface)
are `packages/brand`'s.

## Post

One published article on the blog, one Markdown file under `src/content/posts/`. Every Post has
exactly one **Post Type**.

## Translation

One Post written in one **Post Language**: `src/content/posts/<slug>/<language>.md`. A Post's
Translations share its type, publication date, draft flag and cover image.

## Post Language

A Language a Post is written in, one per **Translation**. Most Posts are not in every Language.

## Interface Language

The Language the Shell and a page's labels are read in. Each one has a **Dictionary** and a
**Language Tree**. It is separate from a Post Language ([ADR 0003](docs/adr/0003-interface-language-and-post-language-are-separate.md)).

## Language Tree

Every page of the blog in one Interface Language: English at the root, every other Language under
its own prefix, such as `/th/`. Every Post has a page in every tree.

## Dictionary

Every word one Interface Language shows outside a Post: `src/lib/dictionary-<language>.ts`.

## Fallback

What a page shows when its Post has no Translation in the page's Interface Language: the English
Translation, else the Post's own, with a notice that says so. A page that falls back is not indexed
in its own right: its canonical is the native page.

## Language Menu

The header's links to the same page in every Language Tree, each named in its own Language.

## Post Type

What kind of Post it is: `compare`, `guide` or `news`. The front page filters by it, in one place
only.

## Compare Page

A Post of type `compare`: two **Subjects** set against each other, rendered from one content entry.

## Subject

One of the two things a Compare Page compares, such as `traj` or a vanilla agent.

## Vanilla Agent

A coding agent working alone, with no `traj` available.

## Verdict

The Compare Page's judgement of which Subject is better, and for what. Owner-written, never written
by an agent.

## Owner-written Value

A value only the owner writes: the Verdict and each row's better side. Until the owner writes it, a
**Placeholder** marks it, and a published Post that still carries one fails the build.

## Placeholder

The token `[OWNER TO WRITE]`, standing for an Owner-written Value not written yet.

## Site Home

`https://trajectonomics.com/`: the Site's landing page, which the header's brand mark links to.

## Docs Portal

The product documentation at `https://docs.trajectonomics.com/`, which the header's Docs link names.

## Shell

The header, the dark footer and the Not-found page that every page sits inside.

## Not-found Page

`404.html`, the blog's own 404 body inside the Shell, answered for every miss.
