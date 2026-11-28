// The contribution hint says the suffix must be one the Levy reads, and names the route for an
// Owner who is not yet a Filer (cli ADR-0083, ADR-0075).
import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import {
	commandOf,
	meOnly,
	read,
	runAsPrinted,
	unlabelled,
} from "./scenario-show-assumed-followups-support"

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

describe("the contribution hint on a Levy that reads only the holder's suffix", () => {
	it("names what to do first, and that route makes its own command run", async () => {
		const home = await meOnly(["partner-salary"])
		const item = (await read(home)).assumed.find((entry) => entry.path === "taxAllowances.thaiEsg")
		expect(item?.hint).toContain("The suffix must be one the Levy reads")
		expect(item?.hint).toContain("not yet a Filer")
		expect(item?.hint).toContain("traj scenario tax base --from-stored")
		const command = item?.hint?.match(/run "(.+?)";/)?.[1] ?? ""
		const form = command.replace("flows=<json>", `flows='${JSON.stringify(ESG)}'`)
		expect((await runAsPrinted(home, form)).code).toBe(2)
		const route = unlabelled(await read(home))[0]
		expect((await runAsPrinted(home, commandOf(route?.hint ?? null))).code).toBe(0)
		expect((await runAsPrinted(home, form)).code).toBe(0)
		expect((await read(home)).assumed.some((entry) => entry.path === "taxAllowances.thaiEsg")).toBe(
			false,
		)
	}, 30_000)
})
