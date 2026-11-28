// The contribution hint names the tax write that makes a non-Filer Owner a Filer, and that write
// then lets the apply form run (cli ADR-0083, ADR-0075).
import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { meOnly, read, runAsPrinted, unlabelled } from "./scenario-show-assumed-followups-support"
import { applyScenario } from "./scenario-test-support"

/** The ThaiESG contribution Flow the hint's shape describes, labelled for the partner. */
const ESG: Record<string, unknown> = {
	id: "esg",
	kind: "contribution",
	target: FIXTURE_ACCOUNTS.investment,
	amount: 500_000,
	frequency: "annual",
	start: "2026-06-01",
	end: "2026-12-31",
	growth: { bps: 0 },
	label: "allowance.thai_esg@partner",
}

/** The command the hint prints to make a non-Filer Owner a Filer. */
function routeOf(item: { hint: string | null } | undefined): string {
	return item?.hint?.match(/(?:theirs first: run|for them first, then run) "(.+?)"/)?.[1] ?? ""
}

describe("the contribution hint on a Levy that reads only the holder's suffix", () => {
	it("names the income route that makes the Owner a Filer, and its own command runs", async () => {
		const home = await meOnly(["partner-salary"])
		const item = (await read(home)).assumed.find((entry) => entry.path === "taxAllowances.thaiEsg")
		expect(item?.hint).toContain("not yet a Filer")
		expect(item?.hint).toContain("--from-stored --label 'partner-salary=income.section40_1'")
		const route = routeOf(item)
		expect((await runAsPrinted(home, route)).code).toBe(0)
		const command =
			item?.hint?.match(/^Add a contribution Flow with its label: run "(.+?)";/)?.[1] ?? ""
		const form = command.replace("flows=<json>", `flows='${JSON.stringify(ESG)}'`)
		expect((await runAsPrinted(home, form)).code).toBe(0)
		expect((await read(home)).assumed.some((entry) => entry.path === "taxAllowances.thaiEsg")).toBe(
			false,
		)
	}, 30_000)

	it("says to add an income Flow first when the Owner has none, and keeps a placeholder id", async () => {
		const home = await meOnly(["partner-salary"])
		const start = await read(home)
		const flows = start.document.flows.filter((flow) => flow["id"] !== "partner-salary")
		expect((await applyScenario(home, "base", { ...start.document, flows })).code).toBe(0)
		const item = (await read(home)).assumed.find((entry) => entry.path === "taxAllowances.thaiEsg")
		expect(item?.hint).toContain("add an income Flow for them first")
		expect(item?.hint).toContain("--label '<flow id>=income.section40_1'")
		expect(routeOf(item)).not.toBe("")
		expect(unlabelled(await read(home))).toEqual([])
	})
})
