import { describe, expect, it } from "bun:test"
import { HOUSEHOLD, seedBase, setHousehold, shown } from "./scenario-household-support"
import {
	applyScenario,
	documentFile,
	errorOf,
	resultOf,
	scenario,
	scenarioHome,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/** The way out a required anchored date names: leaving it out would be `MISSING_KEY` (cli ADR-0048). */
const REQUIRED_ENDING = "or write the anchored date it names."

/** The words of one quoted command: a single-quoted word stays whole, and a bare word ends at a space. */
function wordsOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|([^ ']+)/g)].map((word) => word[1] ?? word[2] ?? "")
}

/** The argv of every `traj ...` command a hint quotes, with `<path>` filled with `file`. */
function printedArgv(hint: string, file: string): string[][] {
	return [...hint.matchAll(/"traj ([^"]*)"/g)].map((match) =>
		wordsOf((match[1] ?? "").replace("<path>", file)),
	)
}

/** The arguments that reach a leaf, with every positional after `--`: `-x` is a name, not a flag. */
const DASH = ["--file", "-", "--json", "--", "-x"]

describe("the way out a household conflict names", () => {
	it("tells a required anchored date's edit to write the anchored date, not to remove it", async () => {
		const home = scenarioHome()
		await seedBase(home)
		await setHousehold(home, {
			...HOUSEHOLD,
			anchors: [{ path: "flows.salary.start", person: "me", age: 36 }],
		})
		const document = (await shown(home)).document
		const res = await applyScenario(home, "base", {
			...document,
			flows: [{ ...document.flows[0], start: "2027-01-01" }, document.flows[1]],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.flows.0.start",
		})
		expect(errorOf(res).hint).toBe(
			`Run "traj scenario household base --file <path>" to move the anchor, ${REQUIRED_ENDING}`,
		)
	})

	it("treats a Milestone criterion's date as required too", async () => {
		const home = scenarioHome()
		const milestones = [
			{ id: "retire", combine: "all", criteria: [{ id: "when", kind: "date", on: "2045-01-01" }] },
		]
		await seedBase(home, { ...SCENARIO_DOCUMENT, milestones })
		await setHousehold(home, {
			...HOUSEHOLD,
			anchors: [{ path: "milestones.retire.criteria.when.on", person: "me", age: 36 }],
		})
		const document = (await shown(home)).document
		const shownMilestones = document["milestones"] as Record<string, unknown>[]
		const criteria = shownMilestones[0]?.["criteria"] as Record<string, unknown>[]
		const changed = {
			...document,
			milestones: [{ ...shownMilestones[0], criteria: [{ ...criteria[0], on: "2046-01-01" }] }],
		}
		const res = await applyScenario(home, "base", changed)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.milestones.0.criteria.0.on",
		})
		expect(errorOf(res).hint).toBe(
			`Run "traj scenario household base --file <path>" to move the anchor, ${REQUIRED_ENDING}`,
		)
	})

	it("quotes a plan name with an apostrophe in the apply hint", async () => {
		const home = scenarioHome()
		await applyScenario(home, "it's", SCENARIO_DOCUMENT)
		await scenario(home, ["household", "it's", "--file", "-"], JSON.stringify(HOUSEHOLD))
		const document = (await shown(home, "it's")).document
		const res = await applyScenario(home, "it's", {
			...document,
			flows: [{ ...document.flows[0], end: "2030-01-01" }, document.flows[1]],
		})
		expect(res.code).toBe(2)
		expect(errorOf(res).hint).toBe(
			`Run "traj scenario household 'it'\\''s' --file <path>" to move the anchor, or remove the value so the anchor fills it.`,
		)
	})

	it("quotes a plan name with a space in the fork hint", async () => {
		const home = scenarioHome()
		await applyScenario(home, "my plan", SCENARIO_DOCUMENT)
		await scenario(home, ["household", "my plan", "--file", "-"], JSON.stringify(HOUSEHOLD))
		const res = await scenario(home, [
			"fork",
			"my plan",
			"retire",
			"--set",
			'flows.salary.end="2030-01-01"',
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).hint).toBe(
			`Remove the --set so the household sets the date, or run "traj scenario fork 'my plan' retire" first, then "traj scenario household retire --file <path>" to move the anchor.`,
		)
	})

	it("puts a name that starts with a dash after -- in the apply hint, and its command runs", async () => {
		const home = scenarioHome()
		await capture(
			["scenario", "apply", ...DASH],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(SCENARIO_DOCUMENT),
		)
		await capture(
			["scenario", "household", ...DASH],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(HOUSEHOLD),
		)
		const shownDash = resultOf(
			await capture(["scenario", "show", "--json", "--", "-x"], { TRAJ_HOME: home }),
		)
		const document = shownDash.scenario.document as { flows: Record<string, unknown>[] }
		const changed = {
			...document,
			flows: [{ ...document.flows[0], end: "2030-01-01" }, document.flows[1]],
		}
		const res = await capture(
			["scenario", "apply", ...DASH],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(changed),
		)
		expect(res.code).toBe(2)
		const hint = errorOf(res).hint ?? ""
		expect(hint).toBe(
			'Run "traj scenario household --file <path> -- -x" to move the anchor, or remove the value so the anchor fills it.',
		)
		const [printed = []] = printedArgv(hint, documentFile(HOUSEHOLD))
		expect((await capture(printed, { TRAJ_HOME: home })).code).toBe(0)
	})

	it("puts a name that starts with a dash after -- in the fork hint, and both commands run", async () => {
		const home = scenarioHome()
		await capture(
			["scenario", "apply", ...DASH],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(SCENARIO_DOCUMENT),
		)
		await capture(
			["scenario", "household", ...DASH],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(HOUSEHOLD),
		)
		const res = await capture(
			[
				"scenario",
				"fork",
				"--json",
				"--set",
				'flows.salary.end="2030-01-01"',
				"--",
				"-x",
				"retire",
			],
			{ TRAJ_HOME: home },
		)
		expect(res.code).toBe(2)
		const hint = errorOf(res).hint ?? ""
		expect(hint).toBe(
			'Remove the --set so the household sets the date, or run "traj scenario fork -- -x retire" first, then "traj scenario household retire --file <path>" to move the anchor.',
		)
		const printed = printedArgv(hint, documentFile(HOUSEHOLD))
		expect(printed).toHaveLength(2)
		for (const argv of printed) expect((await capture(argv, { TRAJ_HOME: home })).code).toBe(0)
	})
})
