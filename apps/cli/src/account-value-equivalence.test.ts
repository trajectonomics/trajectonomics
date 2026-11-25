import { describe, expect, it } from "bun:test"
import { bodyOf, bothPlans, MOST, own } from "./account-value-equivalence-support"
import { chartHome, value } from "./account-value-support"
import { isAppError } from "./errors"
import { accounts, cli, ledgerHome } from "./tx-test-support"

describe("account value --file keeps each entry's Balance as it rescanned the Ledger", () => {
	it("plans a mixed batch exactly as the full rescan does", async () => {
		const { home, traj } = await chartHome()
		await value(traj, "Fund", "100.00", "2026-01-10")
		await own(traj, "Equity", "Fund", "25.00", "2026-02-05")
		await own(traj, "Fund", "Food", "10.00", "2026-03-05")
		await own(traj, "Equity", "Home", "300.00", "2026-02-20")
		await own(traj, "Loan", "Food", "40.00", "2026-02-15")
		await value(traj, "Fund", "500.00", "2026-06-01")
		await value(traj, "Loan", "90.00", "2026-05-01")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-04-01", value: "300.00" },
			{ account: "Home", date: "2026-02-25", value: "700.00" },
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Fund", date: "2026-03-01", value: "200.00" },
			{ account: "Loan", date: "2026-03-01", value: "60.00" },
			{ account: "Home", date: "2026-02-10", value: "50.00" },
			{ account: "Home", date: "2026-03-15", value: "700.00" },
			{ account: "Fund", date: "2026-02-01", value: "120.50" },
			{ account: "Loan", date: "2026-01-01", value: "30.00" },
			{ account: "Fund", date: "2026-02-28", value: "0.00" },
		])
		expect(isAppError(fast)).toBe(false)
		expect(fast).toEqual(slow)
		const rows = isAppError(fast) ? [] : fast.value.rows
		expect(rows.some((row) => row.write === null)).toBe(true)
		expect(rows.some((row) => row.notes.length > 0)).toBe(true)
		expect(rows.some((row) => row.account.name === "Loan" && row.write !== null)).toBe(true)
	})

	it("reads an entry's Balance with the transactions that sit between its date and the earlier entry's", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Equity", "Fund", "70.00", "2026-01-15")
		await own(traj, "Fund", "Food", "5.00", "2026-01-20")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-31", value: "100.00" },
			{ account: "Fund", date: "2026-01-10", value: "10.00" },
			{ account: "Fund", date: "2026-01-17", value: "80.00" },
		])
		expect(fast).toEqual(slow)
		const rows = isAppError(fast) ? [] : fast.value.rows
		expect(rows.map((row) => [row.date, row.before])).toEqual([
			["2026-01-10", 0],
			["2026-01-17", 8000],
			["2026-01-31", 7500],
		])
	})

	it("refuses a batch with the same envelope the full rescan gives", async () => {
		const { home } = await chartHome()
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-10", value: "100.00" },
			{ account: "Nobody", date: "2026-02-10", value: "1.00" },
			{ account: "Fund", date: "2026-01-10", value: "5.00" },
			{ account: "Loan", date: "2026-03-01", value: "-2.00" },
		])
		expect(bodyOf(fast).details).toBeDefined()
		expect(bodyOf(fast)).toEqual(bodyOf(slow))
	})

	it("refuses an entry the core refuses while it is applied, as the full rescan does", async () => {
		const { home, traj } = await chartHome()
		await own(traj, "Fund", "Food", MOST, "2026-01-15")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-02-01", value: MOST },
			{ account: "Home", date: "2026-02-02", value: "1.00" },
		])
		expect(bodyOf(fast).code).toBe("AMOUNT_OVERFLOW")
		expect(bodyOf(fast).details).toBeDefined()
		expect(bodyOf(fast)).toEqual(bodyOf(slow))
	})

	it("refuses an entry that overflows the account it posts against, at that account's field", async () => {
		const { home, chart } = await chartHome()
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-01", value: MOST },
			{ account: "Home", date: "2026-01-02", value: MOST },
			{ account: "Fund", date: "2026-01-03", value: MOST },
		])
		const body = bodyOf(fast)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(JSON.stringify(body)).toContain(`balance[${chart.Gains.id}]`)
		expect(body).toEqual(bodyOf(slow))
	})

	it("refuses an entry when another account the batch values overflows, at that account's field", async () => {
		const { home, traj, chart } = await chartHome()
		await own(traj, "Equity", "Fund", "1.00", "2026-01-05")
		const { fast, slow } = bothPlans(home, [
			{ account: "Fund", date: "2026-01-01", value: MOST },
			{ account: "Home", date: "2026-01-06", value: "0.00" },
		])
		const body = bodyOf(fast)
		expect(body.code).toBe("AMOUNT_OVERFLOW")
		expect(JSON.stringify(body)).toContain(`balance[${chart.Fund.id}]`)
		expect(body).toEqual(bodyOf(slow))
	})

	it("refuses a batch when an account it does not touch already overflows in the ledger", async () => {
		const { home, traj, chart } = await chartHome()
		await own(traj, "Equity", "Fund", MOST, "2026-01-01")
		await own(traj, "Equity", "Fund", "1.00", "2026-01-02")
		const { fast, slow } = bothPlans(home, [{ account: "Home", date: "2026-01-06", value: "5.00" }])
		expect(JSON.stringify(bodyOf(fast))).toContain(`balance[${chart.Fund.id}]`)
		expect(bodyOf(fast)).toEqual(bodyOf(slow))
	})

	it("reports the first overflowing account in chart order, not the one being valued", async () => {
		const home = ledgerHome()
		const traj = cli(home)
		const chart = await accounts(traj, [
			["Gains", "income"],
			["Fund", "asset"],
		])
		await own(traj, "Gains", "Fund", MOST, "2026-01-01")
		await own(traj, "Gains", "Fund", "1.00", "2026-01-02")
		const { fast, slow } = bothPlans(home, [{ account: "Fund", date: "2026-01-03", value: "1.00" }])
		expect(bodyOf(fast).code).toBe("AMOUNT_OVERFLOW")
		expect(JSON.stringify(bodyOf(fast))).toContain(`balance[${chart["Gains"]!.id}]`)
		expect(bodyOf(fast)).toEqual(bodyOf(slow))
	})
})
