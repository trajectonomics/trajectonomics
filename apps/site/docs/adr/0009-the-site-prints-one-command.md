---
status: accepted
---

# The Site prints one command and one way out of it

The Site's install window shows one command — `npx skills add trajectonomics/skills --skill traj-onboarding` — and the page prints no second one. That command needs a coding agent the skills CLI can install into, and Node 22.20 or later for the skills CLI itself (`skills@1.7.6`); `traj` needs Node 20. A visitor with neither the agent nor that Node had no next step: the three steps under the command restated the assumption instead of giving a check the visitor could pass, and the only other install-shaped link sat under the diagram, which explains the product rather than helping a visitor stuck at the command (site#38).

## Decision

- **One command.** `INSTALL_COMMAND` stays the Site's single command, unchanged: unpinned, without `-y`, the same text in every Language, in a code element beside its Copy control.
- **The Site prints only commands the organisation ships and proves.** A command on the page is a claim, and the Site's checks are pure and network-free, so they can prove a fixture and a link but never that a command works. The repository that ships a command owns that proof: for the one command, `trajectonomics/skills`'s install script installs it and asserts exactly one skill and the version the Site names. A second command on the page is therefore a new proof in another repository, not a copy edit here.
- **One way out.** Under the three steps, the same window shows one quiet row — a single link, with the Site's arrow as decoration — to the Docs Portal's CLI installation page, which documents all three install channels, release pinning and uninstall. It answers the visitor whose agent the skills CLI does not detect, and the one on Node 20 to 22.19.
- **The Site names the Docs Portal instead of copying it.** The install channels change with the CLI's releases; a copy of them on the landing page would drift, and the Site has no check that could hold it true.

This amends the "Pictures replace prose" bullet of [ADR 0007](./0007-landing-page-restyle-twenty-language.md): a three-step strip **and one way out of it** replace the instruction paragraph.

## Considered Options

- **Print the CLI's install one-liner as a second command.** Rejected: it needs its own proof, it competes with the one command for the eye and with the one Copy control, and the Docs Portal already lists all three channels with their pinning and uninstall.
- **A wizard script (`npx … init`) as the page's command.** Rejected: the onboarding skill already checks and installs the CLI, installs the operating skill and asks the visitor's money questions, so a wizard would repeat it — and one that asks those questions in a terminal would move judgement out of the agent and into the CLI, which is deterministic by design (`GOALS.md`; cli ADR 0001). `traj init` also already means "create the data directory and an empty database" (cli ADR 0014), and `trajectonomics/skills` publishes no `bin` (its npm package is private), so a wizard needs a new publish surface.
- **A cloned workspace repository.** Rejected: it would hold a second copy of two skills, needs a new public repository and hand-kept parity with both, and G1 counts the people who run `traj` on their own money every week, not clones.

## Consequences

- Adding or changing an install path costs one command constant, one Dictionary key and one check — and, for a command the page prints, a proof in the repository that ships it.
- `PAGE_CLI_INSTALL_LINK_MISSING` fails a Language home whose install window has no way out, so a restyle cannot drop the row.
- The copy stays the owner's: the row's words are in the Dictionary in both Languages, and the step labels the confirm issue site#39 asks about are untouched.
