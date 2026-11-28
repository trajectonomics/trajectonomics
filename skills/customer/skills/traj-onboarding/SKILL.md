---
name: traj-onboarding
description: "Set up `traj`, the personal money command line, for someone starting out, or set it up again on a machine that already has a ledger: install the command line, install the skill that operates it, and start from their financial situation and their goal. Use when someone wants to get started tracking their money in a terminal, asks to install `traj` or the trajectonomics cli, or tells you their financial situation and their goal while setup is not done."
metadata:
  cli: ">=0.2.0 <0.9.0"
  version: "0.1.0"
---

# traj-onboarding

Set a person up on `traj`: install the command line, install the skill that operates it, and start
from their own money. Three steps, each with a check you run. A step whose check already passes is
done, and the first section says when setup is finished.

## Before anything downloads

Say these two things before the first command runs, because that command is the download:

- **Currency.** This version of `traj` is THB only. If their money is in another currency, say
  plainly that `traj` cannot hold it yet, and start no download: nothing is installed, nothing is
  fetched, and the conversation ends there. When you do not know their currency, ask, because a
  download is not the moment to find out.
- **Size.** The first run of the command line downloads about 100 MB of binary. Say so, so a person
  on a metered connection chooses when to run it.

## Check what is already done

Run all three checks first, so a machine that is half set up only gets the half it is missing, and a
person who has done this before is noticed before anything is installed.

- **Ledger File**: whether `${TRAJ_HOME:-~/.traj}/traj.db` is there. Test for existence and nothing
  more: never open the file, and never run a `traj` command to look for it, because every
  store-opening command creates the very file this check reads. The file means the ledger has been
  opened on this machine at least once; it never means the ledger holds data. The directory is not the
  signal either: the version check below creates it for a brand-new person, and only a store-opening
  command creates the file.
- **Command line**: `traj --version`, then `npx -y @trajectonomics/cli@latest --version`. A version
  that prints is the command line. When the machine has neither, that first run of the scoped package
  fetches the binary once and caches it, so this check is also the install; it narrates the download
  on stderr, and a download line is not an error.
- **Scope and operating skill**: `npx -y skills@1.9.0 list -g --json`. The check passes only when
  that global list names both `traj-onboarding` and `traj`, each with the `source`
  `trajectonomics/trajectonomics`; the `traj` row is the operating skill, and its `path` is where you
  read it. When the list lacks either one, run step 2.

When the two install checks pass and step 3 has ended — its question answered by the person directly
or grounded in the Ledger File they already have, or, where the read failed, that failure reported and
the handover made — and a below-floor command line has been disclosed where one exists, as has a skill
whose range the command line has passed, setup is done:
this skill stops, and every later conversation about their money is the operating skill's.

## Step 1: Install the command line

`traj --version` printing a version is the whole of this step, and the check above already runs the
fallback that prints one. Later calls reuse the cached binary, so nothing downloads twice.

The npm package is `@trajectonomics/cli`. Run it under that scoped name, with the arguments the
person's request needs:

```bash
npx -y @trajectonomics/cli@latest
bunx @trajectonomics/cli@latest
```

The command line needs Node 20 or later. The unscoped `traj` on npm is a different, unrelated
package.

**On PATH.** When the person wants to type `traj` on its own, read the Install section of
https://github.com/trajectonomics/trajectonomics/tree/main/apps/cli, give them the one-line command for their platform, and let
them run it. Running a remote script is their decision to make, not yours. If that page cannot be
read, keep to the scoped package above and invent no script URL.

Done when a version prints.

The CLI version floor is `0.2.0`: the oldest `@trajectonomics/cli` release whose command surface the
operating skill in step 2 assumes. That release carries `projection run`, `projection compare`, `fi`
and `scenario tax`, named here for provenance only, since command shapes still come from
`traj schema`. Below the floor the operating skill's `description` promises work the command line refuses.

The version to compare is the first version that printed — `traj --version` when a binary is on
`PATH`, otherwise the scoped package's. The unscoped `traj` on npm is a different, unrelated package:
when that print came from it, or you cannot tell which package printed it, compare the scoped
package's version instead. Read the first `X.Y.Z` token, keeping any `-prerelease` suffix; compare
the three numbers in turn and never the strings, so `0.10.0` is above `0.9.0`; and treat a pre-release
as below its release, so `1.4.0-rc.1` is below `1.4.0`.

## Step 2: Install the skill that operates `traj`

A person installs this skill with one command, and an unattended run appends `-y` to it:

```bash
npx skills add trajectonomics/trajectonomics/skills/customer --skill traj-onboarding -g
```

That is the command the README documents. `-g` installs for the person, not the folder, so every
project and every new agent session finds this skill, which is what step 3 promises. What this step
installs is the published set, at the commit the global lock records for this skill.

**Find the pin.** Read this skill's own entry, `traj-onboarding`, in the global lock:
`${XDG_STATE_HOME}/skills/.skill-lock.json` when `XDG_STATE_HOME` is set and
`~/.agents/.skill-lock.json` when it is not. When that lock has no such entry — the copy is only in
a project, or the person pasted this file's URL and installed nothing — run
`npx -y skills@1.9.0 add trajectonomics/trajectonomics/skills/customer --skill traj-onboarding -g -y`
first, then read the global lock again. The entry's `commit` is the pin, and everything below
installs from it. `skills@1.9.0` writes a `commit`; `skills@1.7.6` and older write none, and the list
reports none, so the lock is the only place it is read. When the entry has no `commit`, or its
`source` is `trajectonomics/skills` (this copy predates the move to this source, and its `commit` does
not exist here), run that same global install once more and read the entry again: it now carries the
`commit` that run installed. Either run may have installed a newer `traj-onboarding` than the copy
you are following: read this skill again at the `path` the global list reports, and follow that
copy. A `commit` comes from the lock and from nowhere else. When the entry still has none, report that
setup stopped here, with the entry's `source` and its hash (`skillFolderHash` in the global lock),
and install nothing else. Say what the person can do: `skills@1.9.0` needs Node 22.20 or later, and
they can run `npx -y skills@1.9.0 add … -g -y` themselves, then run setup again. Treat it as a
failed step (see below). Never install from `main` past that first global install of
`traj-onboarding`: a branch moves, and a person's setup must not; an `update` is the one sanctioned
way the pin moves forward.

**A project copy.** When the copy you are following sits in a project folder rather than at a `path`
the global list reports, it stays. A project copy that was already there stays: never delete it, and say in
one sentence that `npx -y skills@1.9.0 remove <name>` in that project removes it, and that they
should remove a project `traj` so every session in that folder reads the pinned global one.

**Read the set at that commit.** Fetch `skills.manifest.json` from `skills/customer` in `trajectonomics/trajectonomics` at the
pinned commit. It lists every published skill, its directory and the CLI Range it expects, in install
order. Install each row into the global scope with `-g` and an explicit `--skill` per row, from the
pin. Every `skills` call this skill makes is `npx -y skills@1.9.0 …`: a `skills` that
resolves to 1.7.6 writes no `commit`, so the row has no pin.

```bash
npx -y skills@1.9.0 add trajectonomics/trajectonomics/skills/customer#<commit> --skill <name> -g
```

Install a row when the command line is at or above its CLI Range floor, the range's lower bound,
compared the way step 1 compares versions. Skip a row below its floor, and name it with the range it
wants and the reason: a person on an older release is never handed a skill that would describe a
command that release lacks. A row whose upper bound the command line has passed is installed all the
same: that bound only marks when this repository rechecks the skill, and every skill takes its
commands from `traj schema`. When the manifest cannot be read, install `traj` alone from the pin and
say in one plain sentence that the rest of the set could not be read, so nobody is left without the
contract.

Done when the global list names every row you installed, `traj` among them, you hold the `path`
each one reported, and you hold the `commit` they installed from.

## Step 3: Ask once, then hand over

Ask once, then hand over. Step 3 has one open for a machine with no Ledger File and one for a machine
that has one, and each open starts with its lead-in sentence in bold. The below-floor and above-range
disclosures come in every open, before any handover — the failed read included.

**Below the floor.** When the version that printed is below the CLI version floor, disclose it before
the handover, in these five facts: the version on this machine; the version the operating skill
expects; the work that still works — recording, reading balances and reports, and testing a Scenario;
the work that does not — a projection, a financial-independence date and a tax figure; and the release
that closes that gap, `@trajectonomics/cli` 0.2.0 or later. Say the command line is older, not broken,
and that nothing is installed or downloaded to fix it. Setup still finishes.

**Above a range.** Read the CLI Range each installed skill states in its own frontmatter. When the
version that printed is past a range's upper bound — a pre-release of that bound's minor counts as
past it — update the installed traj skills once, at most, in the session, before the disclosure:

```bash
npx -y skills@1.9.0 update traj-onboarding traj traj-import traj-review traj-plan -g -y
```

This updates the global set setup installed; a project copy that stays is not touched, and the global copy is the one you re-read. Say in one sentence that you updated them because of the gap, then read the global lock's `commit`
for `traj` again — it is the new pin — read each skill again at the `path` the global list reports,
and re-read its range. When a skill is still past its range, or the update failed — offline, or a Node
older than the 22.20 `skills@1.9.0` needs — say so in one sentence before the handover: name each such
skill, the range it was checked through, and that `traj schema` is authoritative where the two
differ. Say nothing when every installed skill's range still covers the command line.

- Every number you give them is one `traj` returned. The tool owns what its own command surface
  lists — balances, and, from the floor up, projections, a financial-independence date and Thai tax;
  the person owns the facts that feed them. Below the floor, promise none of the last three.
- This skill states no tax meaning. From the floor up, tax is the operating skill's to explain; below
  it, no tax meaning is on offer from this machine.
- Commands, flags and document shapes come from `traj schema`, not from this document, because the
  command surface changes as features land.
- **A number they guessed is theirs, and you mark it rough.** Record it as they gave it, and report
  it as "rough — your estimate". A figure `traj` computed is never marked: that is the tool's answer
  and the point of the tool.

**A ledger file already exists.** Read the `traj` skill at the `path` the list command reported, and
follow it to read the ledger, taking every command and flag from the schema and none from this
document. Then report what it found before you ask anything, in one of three ways:

- **It holds rows.** Say what the ledger holds, in the names and numbers the read returned, and ask
  one question: does that match, and what is their goal now. The situation half is the ledger's to
  tell, and a job that started or an account that closed is the person's correction to make; the goal
  is not in the ledger and can change, so it is asked again. Fold their answer in and stay in the
  operating skill.
- **It holds nothing yet.** Say that the file is there and the ledger is empty, then ask the two
  questions the open below asks.
- **The read failed.** Report what the command line said, in its own words. Then hand the conversation
  over without an interview: a read that failed is no reason to make the person retype what may
  already be recorded there.

**No ledger file yet.** Ask the person two things in one question: their financial situation, and
their goal. Then read the `traj` skill at the `path` the list command reported, and follow it for the
rest of this conversation.

Tell them, in every open, that a new session loads that skill by itself whenever they talk about their
money, and that another machine needs setup once.

Done when their answer is in hand — given directly, or confirmed against the Ledger File — or, where
the read failed, the failure has been reported and the conversation handed over; a below-floor command
line has been disclosed where one exists, as has a skill whose range the command line has passed; and
the operating skill is running the conversation, with what was installed named.

## If a step fails

When a step cannot finish — the download of the command line, the pin in step 2, an install of a
row, or the read in step 3 — report what failed in the command line's own words. Then offer once:
"If you want the project to hear what got in the way, I can draft a GitHub issue for you to read and
send yourself. Nothing is sent unless you send it." Setup does not wait for the answer.

When they accept, draft the issue on the project's "I tried traj and stopped" form, the issue template
`tried-and-stopped.yml` at `https://github.com/trajectonomics/trajectonomics/issues/new?template=tried-and-stopped.yml`:
a title beginning `Stopped: `, the "Where did you stop?" boxes their words match, and their own words
for "What happened?". Leave out every figure, balance, account name, merchant name and path under
their home directory. Show the complete draft, and never submit it: the person sends it or not. Do not offer again
in this conversation.

## What setup leaves behind

Tell them, once, before the handover:

- **What was installed.** Name it in one short paragraph from what you hold, so they can say which
  set they run when they come back: the `commit` the global lock records for `traj` now, as the
  skills' version, the rows you installed (and any you skipped, with the range each wanted), the
  `traj --version` that printed, and the CLI Range this skill's own frontmatter `cli` states, which is
  the range of command lines it expects. The `commit` is the set's version: the version in this
  skill's frontmatter is this skill's own, and is not the set's. Name nothing you did not read, and
  no number from memory.
- **Where the data lives.** Everything is in `~/.traj`, and `TRAJ_HOME` moves it. The ledger never
  leaves this machine: its figures, accounts and documents are computed and kept here, and no command
  sends them anywhere. Setup itself reaches the network twice, and only twice — the binary download,
  and the `skills` CLI that installs these skills. Say exactly that, and nothing broader. A feedback
  draft is separate: it leaves this machine only when the person sends it themselves, after reading
  the full text, and setup never sends one.
- **Usage counts, from 0.6.0.** From 0.6.0, `traj` sends one anonymous count per command to the
  project: the command's name, its exit code, the version and the operating system, under a random
  id. It never sends a figure, an account, a path or anything the person typed. It is on unless they
  turn it off. Tell them that once, and offer to turn it off: `DO_NOT_TRACK=1` in their shell's
  environment stops it on any version, and from 0.6.0 the CLI's own help lists the command that stores
  the choice for this machine. The first successful command after the install prints one
  line about the counts on stderr; it is a notice, not an error.
- **Never `rm -rf ~/.traj`.** That directory holds the ledger; removing it destroys every row, and no
  command below 0.3.0 removes the data for you. From 0.3.0 the CLI has its own guarded removal, which
  refuses without a confirmation.
