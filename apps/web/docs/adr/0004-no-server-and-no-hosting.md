---
status: superseded in part by 0007 (the loopback server) and 0009 (the hosted Demo)
---

# No server and no hosting

The Dashboard has no server of its own. `bun run dashboard` builds the pages, writes `dist/snapshot.json` from the person's own ledger, and previews the build on `127.0.0.1`. To see new figures, run it again.

The package has no `wrangler.jsonc`, no deploy job and no Worker. Hosting, a desktop shell and a way for a person who is not in a checkout to open a Snapshot are the owner's decisions and are not made here.

The committed Demo snapshot is built from a fictional ledger, so the built pages can be viewed with no ledger at all.

## Considered Options

- **Host the Dashboard on a Cloudflare Worker, reading a Snapshot the person uploads.** Rejected for this change. It needs an upload path, a privacy review of a ledger in transit, and a deploy job. Those are the owner's decisions.
- **Ship a desktop shell now.** Rejected. A shell would produce the same Snapshot from a `traj` sidecar, so it can come later behind the same contract.

## Consequences

- A person who wants the Dashboard clones the repository, installs with Bun and runs the command.
- Nothing in this package is published or deployed, and `org/goals/GOALS.md` still lists the desktop and web apps under "Not now".

## Amendment (2026-11-24, #378)

The Demo snapshot is generated at build and is not committed ([ADR 0021](0021-the-demo-snapshot-is-generated-at-build-and-not-committed.md)). The sentence above that calls it committed describes the state before that change.
