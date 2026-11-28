import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { ONBOARDING_SKILL_PATH, read, section, WEBSITE_COMMAND } from "./skills-test-support"

/**
 * The onboarding the council's release 1 asks for: the two gates before the first download, a set
 * installed from the pinned commit, and the four facts a person is owed before the handover.
 */
const body = skillFrontmatter(read(ONBOARDING_SKILL_PATH), ONBOARDING_SKILL_PATH).body

describe("the gates before the first download", () => {
	const gates = section(body, "Before anything downloads")

	it("says THB only and the download size before anything runs", () => {
		expect(gates).toContain("THB only")
		expect(gates).toContain("about 100 MB")
		const at = body.indexOf("## Before anything downloads")
		expect(at).toBeGreaterThan(-1)
		expect(at).toBeLessThan(body.indexOf("`traj --version`, then"))
		expect(at).toBeLessThan(body.indexOf("## Step 1: Install the command line"))
	})

	it("stops a person whose money is not THB instead of downloading anything", () => {
		expect(gates).toContain("`traj` cannot hold it yet")
		expect(gates).toContain("start no download")
		expect(gates).toContain("nothing is installed, nothing is fetched")
	})
})

describe("Step 2, installing the published set", () => {
	const stepTwo = section(body, "Step 2: Install the skill that operates `traj`")

	it("pins the commit the lock records for this skill, and never installs from main", () => {
		expect(stepTwo).toContain("The entry's `commit` is")
		expect(stepTwo).toContain("Never install from `main`")
		expect(stepTwo).toContain("a branch moves")
	})

	it("reads the pin from the global lock, and never the project one", () => {
		expect(stepTwo).toContain(`\`\${XDG_STATE_HOME}/skills/.skill-lock.json\``)
		expect(stepTwo).toContain("`~/.agents/.skill-lock.json` when it is not")
		expect(stepTwo).not.toContain("`./skills-lock.json`")
		expect(stepTwo).toContain("the list reports none, so the lock is the only place it is read")
	})

	it("names the skills CLI that writes a commit, and what an older one writes", () => {
		expect(stepTwo).toContain("`skills@1.9.0` writes a `commit`; `skills@1.7.6` and")
		expect(stepTwo).toContain("older write none")
		expect(read("README.md")).toContain("`skills@1.7.6` writes none")
	})

	it("re-runs the install on the pinned skills CLI when the entry has no commit, and reads it again", () => {
		expect(stepTwo).toContain("has no `commit`, or its `source` is")
		expect(stepTwo).toContain("`npx -y skills@1.9.0 add … -g -y`")
		expect(stepTwo).toContain("carries the `commit` that run installed")
		expect(stepTwo).toContain("A `commit` comes from the lock and from nowhere else")
	})

	it("reports the source and hash, and stops, when the lock still has no commit", () => {
		expect(stepTwo).toContain("setup stopped here, with the entry's `source` and its hash")
		expect(stepTwo).toContain("`skillFolderHash` in the global lock")
		expect(stepTwo).toContain("install nothing else")
		expect(stepTwo).toContain("Treat it as a failed step")
		expect(section(body, "If a step fails")).toContain("the pin in step 2")
	})

	it("makes every skills call itself on skills@1.9.0, so a 1.7.6 never writes a row without a pin", () => {
		expect(body).toContain("`npx -y skills@1.9.0 list -g --json`")
		expect(body).not.toContain("`npx -y skills@1.9.0 list --json`")
		expect(stepTwo).toContain(
			"npx -y skills@1.9.0 add trajectonomics/trajectonomics/skills/customer#<commit> --skill <name> -g",
		)
		expect(stepTwo).toContain("Every `skills` call this skill makes is `npx -y skills@1.9.0 …`")
		expect(stepTwo).toContain("resolves to 1.7.6 writes no `commit`, so the row has no pin")
		const plain = body.split("\n").filter((line) => /npx (-y )?skills (add|list)/.test(line))
		expect(plain).toEqual([WEBSITE_COMMAND])
	})

	it("reads this skill again after the re-run, which may have installed a newer copy", () => {
		expect(stepTwo).toContain("newer `traj-onboarding`")
		expect(stepTwo).toContain("read this skill again at the `path` the global list reports")
	})

	it("tells the person the way on when the stop is reached: Node 22.20, run it themselves, set up again", () => {
		expect(stepTwo).toContain("`skills@1.9.0` needs Node 22.20 or later")
		expect(stepTwo).toContain("run `npx -y skills@1.9.0 add … -g -y` themselves")
		expect(stepTwo).toContain("then run setup again")
	})

	it("is done only with the commit in hand, from the global list", () => {
		expect(stepTwo).toContain("Done when the global list names every row you installed")
		expect(stepTwo).toContain("and you hold the `commit` they installed from")
	})

	it("reads the manifest at that commit and installs one explicit --skill per row, globally", () => {
		expect(stepTwo).toContain(
			"Fetch `skills.manifest.json` from `skills/customer` in `trajectonomics/trajectonomics` at the",
		)
		expect(stepTwo).toContain("in install order")
		expect(stepTwo).toContain("into the global scope with `-g`")
		expect(stepTwo).toContain("and an explicit `--skill` per row")
	})

	it("skips and names a row below its floor, with its range and the reason", () => {
		expect(stepTwo).toContain("at or above its CLI Range floor")
		expect(stepTwo).toContain("Skip a row below its floor")
		expect(stepTwo).toContain("name it with the range it")
		expect(stepTwo).toContain("describe a command that")
		expect(stepTwo).not.toContain("does not satisfy")
	})

	it("installs a row whose upper bound the command line has passed (skills ADR 0004)", () => {
		expect(stepTwo).toContain(
			"A row whose upper bound the command line has passed is installed all the",
		)
		expect(stepTwo).toContain("only marks when this repository rechecks the skill")
		expect(stepTwo).toContain("`traj schema`")
	})

	it("falls back to traj alone, in plain words, when the manifest cannot be read", () => {
		expect(stepTwo).toContain("install `traj` alone from the pin")
		expect(stepTwo).toContain("the rest of the set could not be read")
		expect(stepTwo).toContain("nobody is left without the contract")
	})
})

describe("what the person is told about their own numbers", () => {
	const stepThree = section(body, "Step 3: Ask once, then hand over")

	it("leaves the sign of a debt to the operating Skill, which states every sign convention once", () => {
		expect(stepThree).not.toContain("negative opening balance")
		expect(stepThree).not.toContain("reads as a gain")
		expect(stepThree).toContain(
			"Then read the `traj` skill at the `path` the list command reported",
		)
	})

	it("marks a number the person guessed as rough, and never one traj computed", () => {
		expect(stepThree).toContain("A number they guessed is theirs, and you mark it rough")
		expect(stepThree).toContain("rough — your estimate")
		expect(stepThree).toContain("A figure `traj` computed is never marked")
	})
})

describe("what setup leaves behind", () => {
	const leaves = section(body, "What setup leaves behind")

	it("names what setup installed: the commit, the rows, the traj version and the CLI Range", () => {
		expect(leaves).toContain("**What was installed.**")
		expect(leaves).toContain("the `commit` from step 2 as the skills' version")
		expect(leaves).toContain("installed (and any you skipped, with the range each wanted)")
		expect(leaves).toContain("the `traj --version` that printed")
		expect(leaves).toContain("this skill's own frontmatter `cli` states")
		expect(leaves).toContain("The `commit` is the set's version")
		expect(leaves).toContain("the version in this skill's frontmatter is this")
		expect(leaves).toContain("skill's own, and is not the set's")
		expect(leaves.indexOf("**What was installed.**")).toBeLessThan(
			leaves.indexOf("**Where the data lives.**"),
		)
		expect(section(body, "Step 3: Ask once, then hand over")).toContain(
			"with what was installed named",
		)
	})

	it("states the two verified facts about the network, and nothing broader", () => {
		expect(leaves).toContain("The ledger never leaves this machine")
		expect(leaves).not.toContain("sends nothing anywhere")
		expect(leaves).toContain("the binary download, and the `skills` CLI")
		expect(body).not.toContain("nothing leaves your machine")
	})

	it("names the usage counts from 0.6.0, what they hold, and the switch that works on every version", () => {
		expect(leaves).toContain("**Usage counts, from 0.6.0.**")
		expect(leaves).toContain(
			"never sends a figure, an account, a path or anything the person typed",
		)
		expect(leaves).toContain(
			"`DO_NOT_TRACK=1` in their shell's environment stops it on any version",
		)
		expect(leaves).toContain("it is a notice, not an error")
	})

	it("says a feedback draft leaves only when the person sends it, and setup never sends one", () => {
		expect(leaves).toContain("A feedback draft is separate")
		expect(leaves).toContain(
			"only when the person sends it themselves, after reading the full text",
		)
		expect(leaves).toContain("setup never sends one")
	})

	it("warns never to rm -rf the directory that holds the ledger, once, with the reason", () => {
		expect(leaves).toContain("Never `rm -rf ~/.traj`")
		expect(leaves).toContain("destroys every row")
		expect(body.split("rm -rf ~/.traj")).toHaveLength(2)
	})

	it("names the guarded remove as the CLI's, not this Skill's, from 0.3.0", () => {
		expect(leaves).toContain("no command below 0.3.0 removes the data for you")
		expect(leaves).toContain("From 0.3.0 the CLI has its own guarded removal, which")
		expect(leaves).toContain("refuses without a confirmation")
	})

	it("points at no archived issue: the CLI's releases say what it does now", () => {
		expect(body).not.toContain("trajectonomics/cli#")
	})
})

describe("the feedback offer when setup fails", () => {
	const failed = section(body, "If a step fails")

	it("reports the failure in the command line's words, then offers once without waiting", () => {
		expect(failed).toContain("report what failed in the command line's own words")
		expect(failed).toContain("Then offer once")
		expect(failed).toContain("Setup does not wait for the answer")
		expect(failed).toContain("Do not offer again in this conversation")
	})

	it("drafts on the same form, never submits, and leaves personal detail out", () => {
		expect(failed).toContain("tried-and-stopped.yml")
		expect(failed).toContain("Leave out every figure, balance, account name")
		expect(failed).toContain("never submit it")
		expect(failed).toContain("the person sends it or not")
	})

	it("names the feedback offer once, and no traj command of its own", () => {
		expect(body.split("## If a step fails")).toHaveLength(2)
		const commands = body.match(/`traj [^`]+`/g) ?? []
		expect(commands.every((span) => ["`traj --version`", "`traj schema`"].includes(span))).toBe(
			true,
		)
	})
})
