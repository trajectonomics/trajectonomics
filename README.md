# trajectonomics

`traj` is a free and open source command line for personal money. An AI agent operates it: you
talk to your agent about your money, and the agent records it, projects it and answers what-ifs
with `traj`. The command line never calls a model, and every read takes its date from the caller,
so the same question always gets the same answer.

It starts with people who file taxes in Thailand: Thai baht, and Thailand's 2026 personal income
tax. Your ledger stays on your machine, in `~/.traj`.

[Website](https://trajectonomics.com/) · [Docs](https://trajectonomics.com/docs/) ·
[Blog](https://trajectonomics.com/blog/) ·
[Releases](https://github.com/trajectonomics/trajectonomics/releases) · MIT licence

![Terminal demo with a fictional ledger: traj records three accounts, shows net worth of 1,340,000 THB, then answers when its owner can stop working, which is financial independence on 2037-09-01.](docs/demo/traj-demo.gif)

## Get started

Give a coding agent that can run commands (Claude Code, Codex, Cursor and similar) this one line:

```text
Set up traj: read https://raw.githubusercontent.com/trajectonomics/trajectonomics/main/skills/customer/skills/traj-onboarding/SKILL.md and follow it.
```

Or install the setup skill yourself. It asks about your situation and your goal, installs the
command line and the skill that operates it, and hands the conversation over:

```bash
npx skills add trajectonomics/trajectonomics/skills/customer --skill traj-onboarding -y
```

An agent that is already set up needs only the operating skill:

```bash
npx skills add trajectonomics/trajectonomics/skills/customer --skill traj -y
```

To run the command line yourself, see [Install](apps/cli/README.md#install): one line for Linux,
macOS and Windows, or `npx @trajectonomics/cli@latest`.

## What it does

- **Record.** Accounts, transactions and corrections in a double-entry ledger, with a CSV import.
- **Read.** Balances, net worth and reports at any date you name.
- **Project.** Scenarios, year-by-year projections, side-by-side what-ifs, and a
  financial-independence date.
- **Tax.** Thailand's 2026 personal income tax inside a projection, with the allowances you state.
- **Keep.** A doctor check, a lossless backup and restore, and an export.

`traj schema --json` describes every command, its input, its output and its error codes, so an
agent can learn the tool from the tool.

## In this repository

| Path | What it is |
|---|---|
| [`apps/cli`](apps/cli) | `traj`, the command line ([`@trajectonomics/cli`](https://www.npmjs.com/package/@trajectonomics/cli)) |
| [`skills/customer`](skills/customer) | The agent skills a person installs |
| [`packages/core`](packages/core) | The pure ledger, tax and simulation cores the command line builds on |
| [`apps/docs`](apps/docs) | The docs at trajectonomics.com/docs |
| [`apps/blog`](apps/blog) | The blog at trajectonomics.com/blog |
| [`apps/data`](apps/data) | The data site at trajectonomics.com/data |
| [`apps/site`](apps/site) | The website at trajectonomics.com |

## Contributing

Most outside contributions are tax rules. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then
[packages/core/tax/CONTRIBUTING.md](packages/core/tax/CONTRIBUTING.md). Questions and bugs go to
[issues](https://github.com/trajectonomics/trajectonomics/issues).

If `traj` is useful to you, a star helps other people find it.
