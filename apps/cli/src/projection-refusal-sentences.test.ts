import { describe, expect, it } from "bun:test"
import type { Flow, Scenario } from "@trajectonomics/core/sim"
import { SIM_SCENARIO } from "./baseline/fixture"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { refusal } from "./projection/engine"
import {
	AS_OF,
	baseFlags,
	errorOf,
	fi,
	HORIZON,
	leviedScenario,
	projection,
	seededHome,
} from "./projection/testing"
import { applyScenario } from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import { capture } from "./test-support"

/** A derived Flow worth a tenth of the salary: an amount that reads earned income. */
const FROM_SALARY = {
	measures: [
		{ id: "pay", op: "flow", flow: "salary" },
		{ id: "tenth", op: "scale", of: "pay", num: 1, den: 10, rounding: "floor" },
	],
	result: "tenth",
} as const

/** The fixture plan with its rent replaced by an expense derived from the salary. */
function derivedExpense(): Scenario {
	const rent: Flow = {
		id: "rent",
		kind: "expense",
		frequency: "monthly",
		start: "2026-05-01",
		derive: FROM_SALARY,
	}
	return {
		...SIM_SCENARIO,
		flows: SIM_SCENARIO.flows.map((flow) => (flow.id === "rent" ? rent : flow)),
	}
}

/** The fixture plan with a monthly payment into a liability derived from the salary. */
function derivedDebtPayment(): Scenario {
	const payment: Flow = {
		id: "pay-loan",
		kind: "contribution",
		frequency: "monthly",
		start: "2026-05-01",
		target: FIXTURE_ACCOUNTS.loan,
		derive: FROM_SALARY,
	}
	return { ...SIM_SCENARIO, flows: [...SIM_SCENARIO.flows, payment] }
}

async function homeWith(name: string, scenario: Scenario): Promise<string> {
	const home = seededHome()
	const applied = await applyScenario(home, name, scenario)
	expect(applied.code).toBe(0)
	return home
}

describe("an engine refusal says what went wrong", () => {
	it("explains a derived expense that reads earned income, in fi and in compare", async () => {
		const home = await homeWith("derived", derivedExpense())
		const res = await fi(home, baseFlags("derived"))
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error.code).toBe("projection_refused")
		expect(error.exitCode).toBe(3)
		expect(error.path).toBe("scenario.flows.1.derive")
		expect(error.message).toContain("derived expense reads earned income")
		expect(error.hint).toContain("fixed amount")
		expect(error.details).toEqual([
			{ code: "DERIVED_EXPENSE_READS_EARNED", path: "scenario.flows.1.derive" },
		])
		const compared = await projection(home, [
			"compare",
			"derived",
			"derived",
			...baseFlags().slice(2),
		])
		expect(compared.code).toBe(3)
		expect(errorOf(compared).message).toBe(error.message)
	})

	it("leaves projection run alone, because only the FI answer needs earned income to stop", async () => {
		const home = await homeWith("derived", derivedExpense())
		const res = await projection(home, ["run", ...baseFlags("derived")])
		expect(res.code).toBe(0)
	})

	it("explains a derived debt payment that reads earned income", async () => {
		const home = await homeWith("debt", derivedDebtPayment())
		const res = await fi(home, baseFlags("debt"))
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error.message).toContain("derived contribution into a liability reads earned income")
		expect(error.details).toMatchObject([{ code: "DERIVED_DEBT_PAYMENT_READS_EARNED" }])
	})

	it("explains a Baseline Account the Scenario does not declare, through projection run", async () => {
		const home = seededHome()
		await capture(
			["scenario", "apply", "small", "--file", "-", "--json"],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(SCENARIO_DOCUMENT),
		)
		const res = await projection(home, ["run", ...baseFlags("small")])
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error.code).toBe("projection_refused")
		expect(error.path).toBe("baseline.balances.0.account")
		expect(error.message).toBe(
			"The Ledger holds a balance on an Account the Scenario does not declare.",
		)
		expect(error.hint).toContain("traj scenario apply --template")
		expect((error.details as unknown[]).length).toBe(6)
	})

	it("explains a gain-tracked Account that opens with a balance and no basis, through projection run", async () => {
		const levied = leviedScenario()
		const scenario: Scenario = {
			...levied,
			accounts: levied.accounts.map((account) =>
				account.id === FIXTURE_ACCOUNTS.investment && account.kind === "asset"
					? { ...account, gainLabel: "gains" }
					: account,
			),
		}
		const home = await homeWith("gains", scenario)
		const res = await projection(home, [
			"run",
			"--scenario",
			"gains",
			"--as-of",
			AS_OF,
			"--horizon",
			HORIZON,
		])
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error.message).toContain("gainLabel has a positive opening balance")
		expect(error.details).toMatchObject([{ code: "MISSING_BASIS" }])
	})
})

describe("refusal() words and places a problem", () => {
	it("takes path from the problem its sentence came from, not from the first one", () => {
		const error = refusal([
			{ code: "INVALID_SEED", path: ["options", "seed"] },
			{ code: "UNDECLARED_BALANCE_ACCOUNT", path: ["baseline", "balances", 2, "account"] },
		])
		expect(error.body.path).toBe("baseline.balances.2.account")
		expect(error.body.message).toContain("does not declare")
		expect(error.body.details).toHaveLength(2)
	})

	it("words a document code from the document's own sentence, for a stored row nothing re-checked", () => {
		const path = ["scenario", "flows", 0, "derive", "measures", 1, "rounding"]
		const error = refusal([{ code: "INVALID_ROUNDING", path }])
		expect(error.body.path).toBe(path.join("."))
		expect(error.body.message).toBe(
			"document.flows.0.derive.measures.1.rounding: INVALID_ROUNDING (one of: floor, halfUp, ceil)",
		)
		expect(error.body.hint).toContain("traj schema scenario apply")
	})

	it("keeps the generic hint for a code that has no words", () => {
		const error = refusal([{ code: "INVALID_SEED", path: ["options", "seed"] }])
		expect(error.body.message).toContain("The projection engine refused its input")
		expect(error.body.hint).toContain("must agree")
	})
})
