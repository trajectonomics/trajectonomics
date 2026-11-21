# Glossary

The blog's words. Code, tests, commit messages and pull request titles use them exactly; a synonym
in a diff is a defect. The Theme and brand words (Theme, Theme role, Favicon Set, Brand Typeface)
are `packages/brand`'s.

## Post

One published article under `/blog/`. Every Post has exactly one **Post Type**.

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

`/` on the apex: the Site's landing page, which the header's brand mark links to.

## Docs Portal

The product documentation at `https://docs.trajectonomics.com/`, which the header's Docs link names.

## Shell

The header, the dark footer and the Not-found page that every page sits inside.

## Not-found Page

`/blog/404.html`, the blog's own 404 body inside the Shell, answered for every miss under `/blog/`.
