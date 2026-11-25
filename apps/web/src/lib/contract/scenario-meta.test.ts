import { describe, expect, it } from "bun:test"
import { scenarioList } from "./scenario-list"
import { scenarioShow } from "./scenario-show"

/*
 * The CLI's own `scenario list` and `scenario show` goldens for a plan with notes that is the main plan,
 * and for one with neither, parsed by the Dashboard's contract (cli ADR-0071). The goldens are the CLI's
 * bytes, so a field the CLI adds or renames fails here before it reaches a page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/scenario/fixtures/", import.meta.url)

async function golden(name: string): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL(name, CLI_FIXTURES)).text())
}

describe("the scenario contract against the CLI's goldens", () => {
	it("parses the list with the notes flag and the main mark", async () => {
		const list = scenarioList.parse(await golden("list.output"))
		const base = list.scenarios.find((scenario) => scenario.name === "base")
		expect(base).toMatchObject({ hasNotes: true, main: true })
		expect(list.scenarios.filter((scenario) => scenario.main)).toHaveLength(1)
		expect(list.scenarios.find((scenario) => scenario.name !== "base")).toMatchObject({
			hasNotes: false,
			main: false,
		})
	})

	it("parses a show of the main plan, with its notes", async () => {
		const shown = scenarioShow.parse(await golden("show-main.output"))
		expect(shown.scenario).toMatchObject({ notes: "แผนหลัก: เกษียณอายุ 55 ปี", main: true })
	})

	it("parses a show of a plan with no notes and no main mark", async () => {
		const shown = scenarioShow.parse(await golden("show-plain.output"))
		expect(shown.scenario).toMatchObject({ notes: null, main: false })
	})

	it("still parses a Snapshot saved before the fields existed", async () => {
		const {
			notes: _notes,
			main: _main,
			...older
		} = (
			(await golden("show-plain.output")) as {
				scenario: Record<string, unknown>
			}
		).scenario
		expect(scenarioShow.safeParse({ scenario: older }).success).toBe(true)
		const [row] = ((await golden("list.output")) as { scenarios: Record<string, unknown>[] })
			.scenarios
		const { hasNotes: _has, main: _m, ...olderRow } = row ?? {}
		expect(scenarioList.safeParse({ scenarios: [olderRow] }).success).toBe(true)
	})

	it("decodes the tax allowances of a taxed plan, and a Snapshot saved without them (cli ADR-0073)", async () => {
		const plain = ((await golden("show-plain.output")) as { scenario: Record<string, unknown> })
			.scenario
		expect(scenarioShow.parse({ scenario: plain }).scenario.taxAllowances).toBeUndefined()
		const taxAllowances = { stated: ["children"], notStated: ["parents", "someLaterClass"] }
		const shown = scenarioShow.parse({ scenario: { ...plain, taxAllowances } })
		expect(shown.scenario.taxAllowances).toEqual(taxAllowances)
		expect(
			scenarioShow.safeParse({ scenario: { ...plain, taxAllowances: { stated: [] } } }).success,
		).toBe(false)
	})

	it("refuses a key the contract does not name", async () => {
		const body = (await golden("show-main.output")) as { scenario: object }
		const wrong = { scenario: { ...body.scenario, extra: 1 } }
		expect(scenarioShow.safeParse(wrong).success).toBe(false)
	})
})
