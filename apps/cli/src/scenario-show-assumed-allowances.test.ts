// The allowance hints on a couple plan and on a plan name that starts with "-" (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { projectionHome } from "./projection/testing"
import { setHousehold } from "./scenario-household-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"
import { capture } from "./test-support"

type AssumedItem = { kind: string; path: string; hint: string | null }

type Shown = { document: Record<string, unknown>; assumed: AssumedItem[] }

/** What `scenario show` states for a plan, read with the name after `--` so `-neg` is a name. */
async function shownNamed(home: string, name: string): Promise<Shown> {
	const res = await capture(["scenario", "show", "--json", "--", name], { TRAJ_HOME: home })
	expect(res.code).toBe(0)
	return JSON.parse(res.out).scenario as Shown
}

/** The argv of the command a hint prints, split where a shell would. */
function argvOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3] ?? "",
	)
}

/** The item at `path`, if the plan assumes it. */
function itemAt(read: Shown, path: string): AssumedItem | undefined {
	return read.assumed.find((item) => item.path === path)
}

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

describe("the contribution hint on a couple plan", () => {
	it("names the Filer suffix and the Owner, and the form it describes runs", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		expect((await taxCouple(home, "married_joint")).code).toBe(0)
		const item = itemAt(await shownNamed(home, "base"), "taxAllowances.thaiEsg")
		expect(item?.hint).toContain("Filer suffix")
		expect(item?.hint).toContain("Owner")
		const command = item?.hint?.match(/run "(.+?)";/)?.[1] ?? ""
		const argv = argvOf(command).map((arg) =>
			arg === "flows=<json>" ? `flows=${JSON.stringify(ESG)}` : arg,
		)
		expect((await capture([...argv.slice(1), "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const owners = [...(COUPLE_OWNERS ?? []), { path: "flows.esg", person: "partner" }]
		expect((await setHousehold(home, coupleHousehold(owners))).code).toBe(0)
		expect(itemAt(await shownNamed(home, "base"), "taxAllowances.thaiEsg")).toBeUndefined()
	})
})

describe("the --merge hint for a plan name that starts with -", () => {
	it("says the flag goes before --, and that form states the allowance", async () => {
		const home = await projectionHome()
		const base = (await shownNamed(home, "base")).document
		const made = await capture(
			["scenario", "apply", "--file", "-", "--json", "--", "-neg"],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(base),
		)
		expect(made.code).toBe(0)
		const paid = await capture(
			[
				"scenario",
				"tax",
				"--tax",
				"th-2026",
				"--children",
				"1",
				"--label",
				"salary=income.section40_1",
				"--json",
				"--",
				"-neg",
			],
			{ TRAJ_HOME: home },
		)
		expect(paid.code).toBe(0)
		const item = itemAt(await shownNamed(home, "-neg"), "taxAllowances.lifeInsurance")
		expect(item?.hint).toContain("before --")
		const ran = await capture(
			["scenario", "tax", "--merge", "--life-insurance", "1000", "--json", "--", "-neg"],
			{ TRAJ_HOME: home },
		)
		expect(ran.code).toBe(0)
		expect(itemAt(await shownNamed(home, "-neg"), "taxAllowances.lifeInsurance")).toBeUndefined()
	})
})
