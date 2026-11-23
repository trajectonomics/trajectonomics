import { describe, expect, it } from "bun:test"
import { carryInFile } from "./projection/carry-in-support"
import { baseFlags, projection } from "./projection/testing"
import { CAR_LOAN } from "./projection-liabilities-plan"
import {
	loanHome,
	minor,
	monthStarting,
	monthsOf,
	paidOffOf,
} from "./projection-liabilities-support"
import { runBody } from "./projection-run-support"

/*
 * `projection run --liabilities` beside each other flag, once each (cli ADR-0059).
 */

describe("--liabilities beside each other flag, once each", () => {
	it("--breakdown: the cash flow and the statements are both present", async () => {
		const body = runBody(
			await projection(await loanHome(), [
				"run",
				...baseFlags("car-loan"),
				"--breakdown",
				"--liabilities",
			]),
		)
		expect(body.tables.map((table) => table.name)).toEqual([
			"annual",
			"cashflow",
			"liabilities",
			"paidOff",
		])
	})

	it("--monthly: the monthly rows and the statements are both present", async () => {
		const body = runBody(
			await projection(await loanHome(), [
				"run",
				...baseFlags("car-loan"),
				"--monthly",
				"--liabilities",
			]),
		)
		expect(body.tables.map((table) => table.name)).toEqual([
			"annual",
			"monthly",
			"liabilities",
			"paidOff",
		])
	})

	it("--set: a rate set to zero on the loan gives every month no interest", async () => {
		const body = runBody(
			await projection(await loanHome(), [
				"run",
				...baseFlags("car-loan"),
				"--set",
				`accounts.${CAR_LOAN}.rate=0`,
				"--liabilities",
			]),
		)
		for (const row of monthsOf(body, CAR_LOAN)) expect(row.interest).toBe("0.00")
	})

	it("--without: taking the extra payment out leaves more owed from September on, and no earlier payoff", async () => {
		const home = await loanHome()
		const withExtra = runBody(
			await projection(home, ["run", ...baseFlags("car-loan"), "--liabilities"]),
		)
		const without = runBody(
			await projection(home, [
				"run",
				...baseFlags("car-loan"),
				"--without",
				"flows.car-extra",
				"--liabilities",
			]),
		)
		expect(minor(monthStarting(without, CAR_LOAN, "2026-10-01").closing)).toBeGreaterThan(
			minor(monthStarting(withExtra, CAR_LOAN, "2026-10-01").closing),
		)
		const paid = paidOffOf(withExtra, CAR_LOAN)
		const late = paidOffOf(without, CAR_LOAN)
		expect(paid).not.toBeNull()
		expect(late === null || late >= (paid ?? "")).toBe(true)
	})

	it("--decimal with --set: a decimal extra payment changes the statement from its month on", async () => {
		const home = await loanHome()
		const base = runBody(await projection(home, ["run", ...baseFlags("car-loan"), "--liabilities"]))
		const smaller = runBody(
			await projection(home, [
				"run",
				...baseFlags("car-loan"),
				"--decimal",
				"--set",
				'flows.car-extra.amount="1000.00"',
				"--liabilities",
			]),
		)
		expect(monthStarting(smaller, CAR_LOAN, "2026-09-01").closing).not.toBe(
			monthStarting(base, CAR_LOAN, "2026-09-01").closing,
		)
	})

	it("--carry-in: the statements are present beside a carry-in document", async () => {
		const home = await loanHome()
		const body = runBody(
			await projection(home, [
				"run",
				...baseFlags("car-loan"),
				"--carry-in",
				carryInFile(home, []),
				"--liabilities",
			]),
		)
		expect(body.tables.map((table) => table.name)).toEqual(["annual", "liabilities", "paidOff"])
	})
})
