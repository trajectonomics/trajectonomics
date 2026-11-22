# Security policy

## Report a vulnerability privately

Do not open a public issue for a security problem. Report it privately through GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.

Or go straight to <https://github.com/trajectonomics/trajectonomics/security/advisories/new>.

Include what you found, the version or commit, and the steps to reproduce it. We will reply, confirm the problem and agree a fix and a disclosure date with you.

## In scope

- The `traj` command line (`@trajectonomics/cli`) and its release binaries, including the install scripts (`install.sh`, `install.ps1`).
- The customer skills (`@trajectonomics/skills`).
- The engine packages (`@trajectonomics/core`).
- The Site (trajectonomics.com) and the Docs Portal.

## Out of scope

- Your own data and machine. The ledger is local-only: `traj` keeps it on your machine and sends it nowhere. A report about how `traj` reads or writes that file is in scope; a problem with your machine or your files is not.

## No bug bounty

We do not run a bug bounty programme and cannot pay for reports. We will credit you in the advisory if you want that.
