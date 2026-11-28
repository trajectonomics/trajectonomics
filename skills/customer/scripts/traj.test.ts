import { describe, expect, it } from "bun:test"
import { skillFrontmatter } from "./skill-frontmatter"
import { metadataCli } from "./skill-metadata"
import { manifest, OPERATING_SKILL_PATH, read, SKILLS_SOURCE, section } from "./skills-test-support"

/**
 * Static checks on the first-party operating Skill, `traj`, which publishes from this repository and
 * which the onboarding Skill installs. `check-skills-install.test.ts` holds the install proof, and
 * `skill-command-surface.test.ts` holds the rule that it names only what the CLI publishes.
 */
describe("the traj operating Skill", () => {
	const source = read(OPERATING_SKILL_PATH)
	const { fields, block, body } = skillFrontmatter(source, OPERATING_SKILL_PATH)

	it("is named traj and fires on someone's own money", () => {
		expect(fields.get("name")).toBe("traj")
		const description = fields.get("description") ?? ""
		expect(description.length).toBeGreaterThan(0)
		expect(description.length).toBeLessThanOrEqual(1024)
		const lower = description.toLowerCase()
		for (const trigger of ["money", "net worth", "financial-independence"]) {
			expect(lower).toContain(trigger)
		}
	})

	it("is loaded by the agent itself, so a person needs no slash command", () => {
		expect(fields.has("disable-model-invocation")).toBe(false)
	})

	it("carries the manifest's CLI Range, and no version of its own to pin", () => {
		const row = manifest.skills.find((candidate) => candidate.name === "traj")
		expect(metadataCli(source)).toBe(row?.cliRange ?? "")
		expect(block).not.toMatch(/^\s+version:/m)
	})

	it("takes the command surface from the tool, never from its own prose", () => {
		for (const call of [
			"traj schema --json",
			"traj schema <command> --json",
			"traj help <command>",
		]) {
			expect(body).toContain(call)
		}
		expect(body).toContain("not from memory and not from this document")
	})

	it("starts a document from the release's own template, and lets the release outrank a page", () => {
		for (const call of ["traj scenario apply --template", "traj tx import --template"])
			expect(body).toContain(call)
		expect(body).toContain(
			"where the schema stops at its `schemaVersion`, the template is where the fields are",
		)
		expect(body).toContain(
			"A page about `traj` is depth, never the arbiter: when it and the release disagree, the release wins.",
		)
	})

	it("never invents a command, a flag, a field or an enum value", () => {
		expect(body).toContain("**Never invent a command, a flag, a field or an enum value.**")
		expect(body).toContain("a guess that happens to run is worse than a refusal")
	})

	it("runs the scoped package, warns that the unscoped name is another package, and pins the version", () => {
		expect(body).toContain("@trajectonomics/cli@latest")
		expect(body).toContain("the unscoped package of the same short name belongs to someone else")
		expect(body).toContain("get the version once and pin it")
		expect(body).toContain("one session cannot end up running two releases")
	})

	it("keeps the person's data on their own machine", () => {
		expect(body).toContain("~/.traj")
		expect(body).toContain("TRAJ_HOME")
		expect(body).toContain("never uploading or pasting")
	})

	it("asks the command line for JSON on every call, never inferring a format", () => {
		expect(body).toContain("Pass `--json` on every call")
		expect(body).toContain("never inferred from a terminal")
	})

	it("reads the error envelope and the exit classes, and stops on a launcher failure", () => {
		expect(body).toContain("A JSON error is an envelope on stderr")
		for (const exitClass of ["`0` ok", "`2` invalid input", "`3` the domain refused it"])
			expect(body).toContain(exitClass)
		expect(body).toContain("is plain text rather than an envelope")
	})

	it("states the money unit once per place, so no place invites a hundredfold error", () => {
		expect(body).toContain(
			'Money is a decimal string at the currency\'s scale, with its currency (`"120.50"`), ' +
				"everywhere except inside a Scenario document: an amount you pass in a flag, a CSV " +
				"`amount` cell, a transaction document, and every amount a ledger, report or projection " +
				"result prints.",
		)
		expect(body).toContain(
			"Inside a Scenario document money is an integer of minor units, so `100000` is 1,000.00 " +
				"THB, which is that document's form of the same amount and not a restatement. Where a " +
				"command publishes `--decimal`, it reads or writes the same amounts as decimal strings: " +
				"beside a `--set` or an `--add` it reads those amounts (`--set " +
				"'flows.salary.amount=\"90000.50\"' --decimal`), and a whole-document form reads or " +
				"writes every amount in the document.",
		)
		expect(body).not.toContain("it is refused when there is no")
		expect(body).toContain("`traj schema` is the authority wherever it states a unit.")
		expect(body).toContain(
			"Keep the unit the user's: restating one amount in a different unit is a second number " +
				"you invented.",
		)
	})

	it("retires both phrases that invited a hundredfold error", () => {
		expect(body).not.toContain("decimal string on the wire")
		expect(body).not.toContain("keep both ends integer")
	})

	it("keeps dates Gregorian YYYY-MM-DD, converting a Buddhist Era year", () => {
		expect(body).toContain("Dates are `YYYY-MM-DD` Gregorian")
		expect(body).toContain("A Buddhist Era year is the same day under a different year number")
	})

	it("takes every fact from the person, including every as-of, and never the clock", () => {
		expect(body).toContain("`traj` has no clock and no opinions")
		expect(body).toContain("including every as-of date")
		expect(body).toContain("it is never read off the machine")
		expect(body).toContain("is a question, not a guess")
	})

	it("dry-runs first and sets an external reference, wherever the schema lists them", () => {
		expect(body).toContain("**Dry run first.**")
		expect(body).toContain("**Set an external reference on every write.**")
		expect(body).toContain("wherever the schema lists them")
	})

	it("uses traj rather than a direct import, and says so", () => {
		expect(body).toContain("Use `traj`; never import a core package")
	})

	it("says what this version cannot do instead of approximating it", () => {
		expect(body).toContain("read it before you promise anything")
		expect(body).toContain("leave the missing number missing rather than approximating it")
		expect(body).toContain("never present an estimate as the tool's answer")
		expect(body).toContain("states the as-of date it was read at, and whether tax is in it")
	})

	it("hands a job to the Skill that owns it, installed by its explicit name from the pin", () => {
		expect(body).toContain(`npx -y skills@1.9.0 add ${SKILLS_SOURCE}#<commit> --skill <name> -y`)
		expect(body).not.toContain(`npx skills add ${SKILLS_SOURCE} --skill <name> -y`)
		expect(body).toContain("is not a router either")
	})

	it("carries no recipe of its own: the tax flags, the labels, the Scenario shape and the projection commands left it", () => {
		for (const removed of [
			"scenario tax",
			"--label",
			"--filing-status",
			"--children",
			"income.section40_1",
			"allowance.retirement",
			"contentHash",
			"Override path",
			"sim-core",
			"projection run",
			"projection compare",
			"traj fi",
		])
			expect(body).not.toContain(removed)
	})
})

/**
 * The sign conventions, stated once. Each span below was read from the real CLI at 0.2.0, 0.3.0 and
 * 0.7.0 on a scratch ledger: raw signed rows, a liability balance of `-2400.00` for a debt of 2,400.00,
 * net worth as the printed sum, `NEGATIVE_AMOUNT` on a negative plain write, and `--opening` as the
 * one signed write.
 */
describe("the traj operating Skill's sign conventions", () => {
	const signs = section(read(OPERATING_SKILL_PATH), "Read a sign")

	it("reads every row's sign from its type, raw and signed", () => {
		expect(signs).toContain(
			"print raw signed units, and each row's `type` says how to read its sign",
		)
		for (const row of [
			"| `asset` | positive | what they hold |",
			"| `expense` | positive | what they spent |",
			"| `liability` | negative | what they owe: `-2400.00` is a debt of 2,400.00 |",
			"| `income` | negative | what they earned |",
			"| `equity` | negative |",
		])
			expect(signs).toContain(row)
	})

	it("quotes net worth as printed, because it already counts every debt", () => {
		expect(signs).toContain("**Net worth already counts every debt.**")
		expect(signs).toContain("It is assets minus liabilities")
		expect(signs).toContain("`netWorth`")
		expect(signs).toContain("counts the debt twice")
	})

	it("reads the profit-and-loss rows raw and never flips a sign", () => {
		expect(signs).toContain("income negative and expense positive")
		expect(signs).toContain("its total is income minus expenses")
		expect(signs).toContain("never flip a sign to make a sentence read better")
	})

	it("writes a magnitude and gives the direction to --from and --to", () => {
		expect(signs).toContain(
			"**A write takes a magnitude, and the direction is `--from` and `--to`.**",
		)
		expect(signs).toContain("`NEGATIVE_AMOUNT`")
		expect(signs).toContain(
			"Borrowing runs `--from` the liability `--to` the account that received",
		)
	})

	it("opens a debt with a negative amount at every release in the range", () => {
		expect(signs).toContain("**`--opening` is the one signed write.**")
		expect(signs).toContain(
			"`traj tx add --opening --from Opening --to Mortgage --amount -2400.00 --date 2026-01-01`",
		)
		expect(signs).toContain("From 0.3.0 the command line refuses a positive opening on a liability")
		expect(signs).toContain("`liability_opening_positive`")
		expect(signs).toContain("On 0.2.0 a positive opening is accepted and the debt reads as a gain")
		expect(signs).toContain("at every release in the CLI Range")
	})

	it("is the only place a Skill states a sign convention", () => {
		for (const skill of ["traj-onboarding", "traj-import", "traj-review", "traj-plan"]) {
			const source = read(`skills/${skill}/SKILL.md`)
			expect(source).not.toContain("negative opening balance")
			expect(source).not.toContain("as a negative amount")
			expect(source).not.toContain("reads as a gain")
		}
	})
})
