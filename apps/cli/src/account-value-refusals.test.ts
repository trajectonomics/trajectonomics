import { describe, expect, it } from "bun:test"
import { chartHome, value } from "./account-value-support"
import { ledgerSize } from "./tx-test-support"

type Failure = {
	error: { code: string; exitCode: number; path?: string; hint?: string; message: string }
}

const failure = (res: { err: string }): Failure["error"] =>
	(JSON.parse(res.err.trim().split("\n").at(-1)!) as Failure).error

describe("account value refusals", () => {
	it("requires --date, --against, --value and the account, and reads no clock", async () => {
		const { traj } = await chartHome()
		const all = ["--value", "1.00", "--date", "2026-03-01", "--against", "Gains"]
		for (const [field, flag] of [
			["date", "--date"],
			["against", "--against"],
			["value", "--value"],
		] as const) {
			const at = all.indexOf(flag)
			const flags = all.filter((_, i) => i !== at && i !== at + 1)
			const res = await traj(["account", "value", "Fund", ...flags, "--json"])
			expect(res.code).toBe(2)
			expect(failure(res)).toMatchObject({ code: "invalid_input", path: `--${field}` })
		}
		const bare = await traj(["account", "value", ...all, "--json"])
		expect(bare.code).toBe(2)
		expect(failure(bare)).toMatchObject({ code: "invalid_input", path: "account" })
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses an --against that is not income or equity, and names `traj account add`", async () => {
		const { traj } = await chartHome()
		for (const against of ["Food", "Home", "Loan"]) {
			const res = await value(traj, "Fund", "1.00", "2026-03-01", against)
			expect(res.code).toBe(3)
			const error = failure(res)
			expect(error).toMatchObject({
				code: "valuation_against_invalid",
				exitCode: 3,
				path: "against",
			})
			expect(error.hint).toContain("traj account add")
		}
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses an unknown --against as UNKNOWN_ACCOUNT, with the hint that names `traj account add`", async () => {
		const { traj } = await chartHome()
		const res = await value(traj, "Fund", "1.00", "2026-03-01", "Nowhere")
		expect(res.code).toBe(3)
		expect(failure(res)).toMatchObject({ code: "UNKNOWN_ACCOUNT", path: "against" })
		expect(failure(res).hint).toContain("traj account add")
	})

	it("refuses an --against that is a header account or archived", async () => {
		const { traj } = await chartHome()
		await traj(["account", "add", "Income", "--type", "income", "--currency", "THB"])
		await traj([
			"account",
			"add",
			"Wages",
			"--type",
			"income",
			"--currency",
			"THB",
			"--parent",
			"Income",
		])
		const header = await value(traj, "Fund", "1.00", "2026-03-01", "Income")
		expect(failure(header)).toMatchObject({ code: "valuation_against_invalid", path: "against" })
		await traj(["account", "close", "Wages"])
		const archived = await value(traj, "Fund", "1.00", "2026-03-01", "Wages")
		expect(failure(archived)).toMatchObject({ code: "account_archived", path: "against" })
	})

	it("refuses an account that is not an asset or a liability", async () => {
		const { traj } = await chartHome()
		for (const account of ["Gains", "Equity", "Food"]) {
			const res = await value(traj, account, "1.00", "2026-03-01", "Equity")
			expect(res.code).toBe(3)
			expect(failure(res)).toMatchObject({ code: "valuation_account_invalid", path: "account" })
		}
	})

	it("refuses an unknown account, a header, an impossible date and an inexact value", async () => {
		const { traj } = await chartHome()
		await traj(["account", "add", "Parent", "--type", "asset", "--currency", "THB"])
		await traj([
			"account",
			"add",
			"Child",
			"--type",
			"asset",
			"--currency",
			"THB",
			"--parent",
			"Parent",
		])
		expect(failure(await value(traj, "Nobody", "1.00", "2026-03-01"))).toMatchObject({
			code: "UNKNOWN_ACCOUNT",
			path: "account",
		})
		expect(failure(await value(traj, "Parent", "1.00", "2026-03-01"))).toMatchObject({
			code: "NON_LEAF_ACCOUNT",
			path: "account",
		})
		expect(failure(await value(traj, "Fund", "1.00", "2026-02-30"))).toMatchObject({
			code: "INVALID_DATE",
			path: "date",
		})
		expect(failure(await value(traj, "Fund", "1.005", "2026-03-01"))).toMatchObject({
			code: "INVALID_AMOUNT",
			path: "value",
		})
		expect(failure(await value(traj, "Fund", "abc", "2026-03-01"))).toMatchObject({
			code: "invalid_input",
			path: "--value",
		})
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses an archived account to value", async () => {
		const { traj } = await chartHome()
		await traj(["account", "close", "Home"])
		const res = await value(traj, "Home", "1.00", "2026-03-01")
		expect(failure(res)).toMatchObject({ code: "account_archived", path: "account" })
	})

	it("refuses a negative value for a liability, which an asset may take", async () => {
		const { traj } = await chartHome()
		const res = await value(traj, "Loan", "-1800000.00", "2026-03-01")
		expect(res.code).toBe(3)
		const error = failure(res)
		expect(error).toMatchObject({ code: "valuation_value_negative", exitCode: 3, path: "value" })
		expect(error.hint).toBe(
			"State what the liability still owes as a positive amount, such as 800.00.",
		)
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
		const asset = await value(traj, "Fund", "-250.00", "2026-03-01")
		expect(asset.code).toBe(0)
	})
})
