import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { isAppError } from "./errors"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { baseFlags, projection, projectionHome } from "./projection/testing"
import { LOAN_SCENARIO } from "./projection-liabilities-plan"
import {
	CAR_LOAN,
	loanHome,
	minor,
	monthStarting,
	monthsOf,
	paidOffOf,
} from "./projection-liabilities-support"
import { runBody, tableOf } from "./projection-run-support"
import { toDecimalForm } from "./scenario/decimal"
import { resultOf, rowOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

/*
 * `projection run --liabilities` (cli ADR-0059). The golden pins the bytes; the zero-rate loan is
 * checked by hand, and the car loan by the statement's own identity. Each other flag is combined with
 * --liabilities once, in projection-liabilities-flags.test.ts.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

describe("projection run --liabilities: the bytes are pinned", () => {
	it("pins the JSON of the car loan, byte for byte, with the Scenario's minted id replaced", async () => {
		const home = await loanHome()
		const res = await projection(home, ["run", ...baseFlags("car-loan"), "--liabilities"])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = runBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		const { engine } = JSON.parse(text) as { engine: { version: string } }
		expect(engine.version).toBe(simPackage.version)
		await recordGoldenTextIn(GOLDENS, "run-liabilities.output", text)
		expect(await goldenTextIn(GOLDENS, "run-liabilities.output")).toBe(text)
	})
})

describe("the statement is the engine's, and the identity holds on every month", () => {
	it("adds opening, drawn and interest less paid to closing, exactly, for each month", async () => {
		const body = runBody(
			await projection(await loanHome(), ["run", ...baseFlags("car-loan"), "--liabilities"]),
		)
		const months = monthsOf(body, CAR_LOAN)
		expect(months.length).toBeGreaterThan(0)
		for (const row of months) {
			expect(minor(row.opening) + minor(row.drawn) - minor(row.paid) + minor(row.interest)).toBe(
				minor(row.closing),
			)
		}
	})

	it("borrows the principal in June and charges interest once the loan is open", async () => {
		const body = runBody(
			await projection(await loanHome(), ["run", ...baseFlags("car-loan"), "--liabilities"]),
		)
		expect(monthStarting(body, CAR_LOAN, "2026-06-01").drawn).toBe("12000.00")
		expect(tableOf(body, "liabilities").rows.some((row) => minor(row.interest) > 0)).toBe(true)
	})

	it("pays the loan off with the extra payment, and reads the paid-off date from the statement", async () => {
		const body = runBody(
			await projection(await loanHome(), ["run", ...baseFlags("car-loan"), "--liabilities"]),
		)
		expect(paidOffOf(body, CAR_LOAN)).not.toBeNull()
		expect(monthsOf(body, CAR_LOAN).at(-1)?.closing).toBe("0.00")
	})
})

describe("a zero-rate loan, checked by hand", () => {
	// 6,000.00 THB borrowed on 2026-06-01, repaid by six payments of 1,000.00 on the 1st of each month
	// from July. With no interest, closing = opening + drawn - paid, and nothing else moves.
	it("moves each month by the withdrawal and then one payment, and is paid off on 2026-12-01", async () => {
		const body = runBody(
			await projection(await loanHome(), ["run", ...baseFlags("car-zero"), "--liabilities"]),
		)
		expect(monthStarting(body, CAR_LOAN, "2026-06-01")).toMatchObject({
			opening: "0.00",
			drawn: "6000.00",
			paid: "0.00",
			interest: "0.00",
			closing: "6000.00",
		})
		expect(monthStarting(body, CAR_LOAN, "2026-07-01")).toMatchObject({
			opening: "6000.00",
			drawn: "0.00",
			paid: "1000.00",
			closing: "5000.00",
		})
		expect(monthStarting(body, CAR_LOAN, "2026-12-01")).toMatchObject({
			opening: "1000.00",
			paid: "1000.00",
			closing: "0.00",
		})
		expect(paidOffOf(body, CAR_LOAN)).toBe("2026-12-01")
	})
})

describe("the human form prints one line per loan, then its month table", () => {
	it("says when a loan is paid off, and prints the statement's months under a heading", async () => {
		const home = await loanHome()
		const res = await capture(["projection", "run", ...baseFlags("car-zero"), "--liabilities"], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("car: paid off on 2026-12-01")
		expect(res.out).toContain("liabilities (")
		expect(res.out).not.toContain('"paidOff"')
	})

	it("says what a loan still owes at the end when it is not paid off", async () => {
		const home = await loanHome()
		const res = await capture(["projection", "run", ...baseFlags("car-loan"), "--liabilities"], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		expect(res.out).toMatch(
			/car: (paid off on \d{4}-\d{2}-\d{2}|owes \d+\.\d{2} at \d{4}-\d{2}-\d{2})/,
		)
	})
})

describe("opt-in: without --liabilities the result has neither table", () => {
	it("keeps the table list of a run that asks for no statement", async () => {
		const body = runBody(await projection(await loanHome(), ["run", ...baseFlags("car-loan")]))
		expect(body.tables.map((table) => table.name)).toEqual(["annual"])
	})
})

describe("the decimal form reads a loan's principal in major units", () => {
	it("round-trips level.principal as a decimal string", async () => {
		const home = await projectionHome()
		// The loan in decimal form, as `scenario show --decimal` prints it, with its principal restated.
		const converted = toDecimalForm(JSON.parse(JSON.stringify(LOAN_SCENARIO)))
		if (isAppError(converted)) throw new Error(converted.body.message)
		const flows = converted["flows"] as Record<string, unknown>[]
		for (const flow of flows) {
			if (flow["id"] === "car-pay")
				(flow["level"] as Record<string, unknown>)["principal"] = "100000.00"
		}
		const applied = await capture(
			["scenario", "apply", "car-decimal", "--file", "-", "--decimal", "--json"],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify(converted),
		)
		expect(applied.code).toBe(0)
		const shown = rowOf(resultOf(await scenario(home, ["show", "car-decimal", "--decimal"])))
		const pay = (shown.document["flows"] as { id: string; level?: { principal: unknown } }[]).find(
			(flow) => flow.id === "car-pay",
		)
		expect(pay?.level?.principal).toBe("100000.00")
	})
})
