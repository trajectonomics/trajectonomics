import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { ONBOARDING_SKILL_PATH, read, section } from "./skills-test-support"

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
		expect(stepTwo).toContain("records, in `skills-lock.json`, the `commit`")
		expect(stepTwo).toContain("Never install from `main`")
		expect(stepTwo).toContain("a branch moves")
	})

	it("reads the manifest at that commit and installs one explicit --skill per row", () => {
		expect(stepTwo).toContain(
			"Fetch `skills.manifest.json` from `skills/customer` in `trajectonomics/trajectonomics` at the",
		)
		expect(stepTwo).toContain("in install order")
		expect(stepTwo).toContain("with an explicit `--skill` per")
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

	it("enters a debt as a negative opening balance, the CLI refusing a positive one from 0.3.0", () => {
		expect(stepThree).toContain("Enter a debt as a negative opening balance")
		expect(stepThree).toContain(
			"from 0.3.0 the command line refuses a positive opening on a liability",
		)
		expect(stepThree).toContain("below 0.3.0 a debt")
		expect(stepThree).toContain("reads as a gain")
	})

	it("marks a number the person guessed as rough, and never one traj computed", () => {
		expect(stepThree).toContain("A number they guessed is theirs, and you mark it rough")
		expect(stepThree).toContain("rough — your estimate")
		expect(stepThree).toContain("A figure `traj` computed is never marked")
	})
})

describe("what setup leaves behind", () => {
	const leaves = section(body, "What setup leaves behind")

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
