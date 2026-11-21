---
status: accepted
---

# Operator pages link no design records

An Operator-tab page (`src/content/docs/cli/`) tells a reader what `traj` does and what to type. It links no ADR. A fact a reader needs is stated on the page in the reader's words. The reasoning behind a design stays in the ADR, and contributors find it from the source tree that `cli/index.mdx` links. `src/lib/adr-links.ts` fails `bun test` on an Operator page that links any path with an `adr/` segment. The Contribute tab keeps its ADR links, because its readers are the contributors those records are written for.

On 2026-11-21 the Operator tab carried about 70 ADR links across 24 of its 26 pages. 61 of them pinned `cli-v0.2.0` while `0.4.0` was the latest release. They came from [ADR 0002](./0002-authored-content-with-proposal-only-sync.md)'s "Upstream ADRs are linked on GitHub, never copied". That ADR was superseded with Docs Sync, but the habit outlived it. Each link also brought a clause of contributor reasoning ("so a pipe and a terminal cannot disagree by accident"). That clause answers a question the reader never asked, and it pinned the page to a tag that went stale.

## Considered options

- **Keep the links, but point them at `main`.** That fixes the stale tag but keeps the contributor material in front of the reader.
- **One "Design decisions" link per page.** This is the same material behind one more click. The page's own words already carry what the reader needs.
- **A review rule with no check.** The links came back one page at a time when nothing failed, so this decision has a test.

## Consequences

An Operator page that needs a design fact states it as behaviour, such as "Commands never prompt", and does not cite it. An ADR that changes what a reader sees still needs its page edited. The record is not a substitute for the page.
