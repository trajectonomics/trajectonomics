import { describe, expect, it } from "bun:test"
import {
	cli,
	csv,
	errorOf,
	HEADER,
	ledgerHome,
	ledgerSize,
	row,
	seeded,
} from "./tx-import-test-support"

const SELF_ROW = row(["2026-11-22", "Cash", "Cash", "7.00", "self", "ref-self-1", ""])
const GOOD_ROW = row(["2026-11-22", "Cash", "Food", "3.00", "lunch", "ref-good-1", ""])

describe("tx import refuses a row whose from and to name one account", () => {
	it("rejects the row at its to column and writes no row of the file", async () => {
		const home = ledgerHome()
		const traj = cli(home)
		await seeded(traj)
		const file = csv(home, "self.csv", [HEADER, GOOD_ROW, SELF_ROW])
		const res = await traj(["tx", "import", file, "--json"])
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "same_account",
			exitCode: 3,
			path: "line.3.to",
			message: "The import was rejected and nothing was written.",
			hint: 'Fix line 3 first: line.3.to: "Cash" is both the from and the to account',
		})
		expect(error.details.rows).toEqual([
			{
				line: 3,
				externalRef: "ref-self-1",
				status: "rejected",
				reason: expect.objectContaining({ code: "same_account", exitCode: 3, path: "line.3.to" }),
			},
		])
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("reports the same rejection under --dry-run and writes nothing", async () => {
		const home = ledgerHome()
		const traj = cli(home)
		await seeded(traj)
		const file = csv(home, "self-dry.csv", [HEADER, SELF_ROW])
		const res = await traj(["tx", "import", file, "--dry-run", "--json"])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({ code: "same_account", exitCode: 3, path: "line.2.to" })
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})
})
