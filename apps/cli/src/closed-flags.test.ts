import { describe, expect, it } from "bun:test"
import { root } from "./commands"
import { capture } from "./test-support"
import { fixtureRoot } from "./test-tree"
import { leavesOf } from "./tree"

/** The note column of the flag line that starts with `--<flag> `, or undefined when none does. */
function flagLine(page: string, flag: string): string | undefined {
	return page.split("\n").find((line) => line.trimStart().startsWith(`--${flag} `))
}

/** No flag line prints `repeatable` or `required` twice. */
function expectNoRepeatedWords(page: string): void {
	for (const line of page.split("\n").filter((text) => /^\s+--/.test(text))) {
		expect((line.match(/\brepeatable\b/g) ?? []).length).toBeLessThanOrEqual(1)
		expect((line.match(/\brequired\b/g) ?? []).length).toBeLessThanOrEqual(1)
	}
}

const help = (path: string[], from = root) => capture(["help", ...path], {}, from)

describe("a closed flag names the values it accepts", () => {
	it("renders a closed set in declaration order, once, beside its description", async () => {
		const page = (await help(["demo", "pick"], fixtureRoot)).out
		expect(flagLine(page, "kind")).toMatch(/A closed kind; one of zeta, alpha, mid$/)
	})

	it("prints an array of enums' set and repeatable once, beside its description", async () => {
		const page = (await help(["demo", "pick"], fixtureRoot)).out
		expect(flagLine(page, "kinds")).toMatch(/Closed kinds; one of zeta, alpha; repeatable$/)
	})

	it("prints the element's description on an array of numbers", async () => {
		const line = flagLine((await help(["projection", "compare"])).out, "age")
		expect(line).toMatch(/An age to report net worth at; needs --birth-date; repeatable$/)
	})

	it("prints the account type's values on the real page", async () => {
		const page = (await help(["account", "add"])).out
		expect(flagLine(page, "type")).toMatch(
			/The kind of account; one of asset, liability, equity, income, expense; required$/,
		)
	})

	it("prints the export format's values with no hand-kept list in the description", async () => {
		const page = (await help(["export"])).out
		expect(flagLine(page, "format")).toMatch(/The file format to write; one of jsonl, csv, md$/)
	})

	it("prints the tax Levy's value and filing statuses on the scenario tax page", async () => {
		const page = (await help(["scenario", "tax"])).out
		expect(flagLine(page, "tax")).toMatch(
			/Write the tax Levy for this jurisdiction: Thailand's 2026 income tax; one of th-2026$/,
		)
		expect(flagLine(page, "filing-status")).toMatch(
			/The taxpayer's filing status; needs --tax and defaults to `single`; one of single, married_no_income_spouse, married_separate, married_joint, married_separate_40_1_joint_rest$/,
		)
	})

	it("prints --set's own description and repeatable once, on each of its five pages", async () => {
		const satang =
			/Replace one existing dotted document path with a JSON value; amounts are in satang \(100 per THB\), or decimal strings with --decimal\. The paths a plan may lack are the estate block \(--set estate=<json> begins it whole\), an asset Account's volatility, a Flow's or Milestone's displayLabel, a surplus step's share and upTo, and a withdraw entry's downTo\. Items of cashflow\.surplus and cashflow\.withdraw are addressed by position from 0, such as cashflow\.withdraw\.0\.downTo; repeatable$/
		expect(flagLine((await help(["scenario", "fork"])).out, "set")).toMatch(satang)
		for (const path of [
			["fi"],
			["projection", "run"],
			["projection", "compare"],
			["projection", "chance"],
		]) {
			expect(flagLine((await help(path)).out, "set")).toMatch(satang)
		}
	})

	it("prints --label's description saying needs --tax, and repeatable once at the end", async () => {
		const line = flagLine((await help(["scenario", "tax"])).out, "label") ?? ""
		expect(line).toContain(
			"Classify one Flow for tax as <flow>=<label>, such as salary=income.section40_1; needs --tax. A label replaces that Flow's label and adds to the labels the other Flows already carry; --none clears them all. An income Flow takes one of ",
		)
		expect(line.match(/repeatable/g)).toHaveLength(1)
		expect(line).toMatch(/; repeatable$/)
	})

	it("sweeps every leaf: no flag note repeats a derived word, and every closed set prints in order", async () => {
		for (const { path, leaf } of leavesOf(root)) {
			const page = (await help(path)).out
			expectNoRepeatedWords(page)
			for (const spec of leaf.flags) {
				if (spec.choices === undefined) continue
				expect(flagLine(page, spec.flag) ?? "").toContain(`one of ${spec.choices.join(", ")}`)
			}
		}
	})
})
