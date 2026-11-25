---
status: accepted
---

# The Demo Dashboard is hosted on the Site

[ADR 0004](0004-no-server-and-no-hosting.md) kept the Dashboard off every host and left hosting to the owner. The owner decided on 2026-11-23 to host the Demo: a visitor sees the Dashboard on the Demo snapshot before installing anything. Today a person has to install `traj` before seeing a single answer, so a page they can open from the Site comes first.

- **Only the Demo is hosted.** The hosted build reads the Demo snapshot (`public/demo/snapshot.json`, generated at build and not committed: [ADR 0021](0021-the-demo-snapshot-is-generated-at-build-and-not-committed.md)) and nothing else. It has no upload, no form that takes a ledger, and no request that carries a person's figures. A person's own Snapshot is still served only by `traj dashboard` on `127.0.0.1` ([ADR 0007](0007-traj-dashboard-serves-the-dashboard-on-loopback.md)).
- **It is read-only.** Editing goes through `traj` on loopback ([ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)), and there is no `traj` behind the hosted pages. The edit controls show what they would do and point to the install.
- **It is static.** The hosted pages are a static build of the Dashboard, served as static assets. No server code computes a figure, so [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md) is unchanged: every figure on the page is one the CLI wrote into the Demo snapshot.
- **The Site carries it.** It is served from the existing Site, so it adds no new host, domain or credentials. The address and the build steps are left to the change that ships it.

## Considered Options

- **Keep the Demo behind the install.** Rejected: it hides the product's answer behind its hardest step.
- **Host a Dashboard that reads a Snapshot the person uploads.** Still rejected, for ADR 0004's reasons: a ledger in transit needs an upload path and a privacy review. This decision does not reopen it.
- **A screen recording instead of the live pages.** Rejected: a recording cannot be clicked, and it goes stale whenever the Dashboard changes.

## Consequences

- ADR 0004's "no hosting" is superseded for the Demo only. Its other parts stand.
- The package gains a deploy path for the Demo build, and the Demo snapshot becomes public-facing, so it must stay fictional and current.
- `org/goals/GOALS.md` lists the web app under "Not now". A hosted Demo is not that web app: it shows no one's own plan.

## Amendment (2026-11-25, #342)

The build is a second target, `bun run build:hosted`, under the base path `/demo`, and the Edit controls are drawn and switched off by one fence: [ADR 0028](0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md) records how, and how the "no Edit" promise above is enforced.
