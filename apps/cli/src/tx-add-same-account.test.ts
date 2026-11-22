import { describe, expect, it } from "bun:test"
import { errorOf } from "./test-support"
import { account, cli, ledgerHome, ledgerSize } from "./tx-test-support"

describe("tx add refuses a transfer from an account to itself", () => {
	it("refuses --from and --to naming one account, and stores nothing", async () => {
		const traj = cli(ledgerHome())
		await account(traj, "Cash")
		const res = await traj([
			"tx",
			"add",
			"--from",
			"Cash",
			"--to",
			"Cash",
			"--amount",
			"5.00",
			"--date",
			"2026-11-22",
			"--json",
		])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({
			code: "same_account",
			exitCode: 3,
			path: "to",
			message: 'to: "Cash" is both the from and the to account',
			hint: "Name two different accounts in --from and --to; a transfer from an account to itself moves nothing.",
		})
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses the same account named by its id on one side and its name on the other", async () => {
		const traj = cli(ledgerHome())
		const cash = await account(traj, "Cash")
		const res = await traj([
			"tx",
			"add",
			"--from",
			cash.id,
			"--to",
			"Cash",
			"--amount",
			"5.00",
			"--date",
			"2026-11-22",
			"--json",
		])
		expect(res.code).toBe(3)
		expect(errorOf(res).code).toBe("same_account")
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses the same rule in a dry run, which writes nothing either way", async () => {
		const traj = cli(ledgerHome())
		await account(traj, "Cash")
		const res = await traj([
			"tx",
			"add",
			"--from",
			"Cash",
			"--to",
			"Cash",
			"--amount",
			"5.00",
			"--date",
			"2026-11-22",
			"--dry-run",
			"--json",
		])
		expect(res.code).toBe(3)
		expect(errorOf(res)).toMatchObject({ code: "same_account", exitCode: 3, path: "to" })
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})

	it("refuses an opening balance whose account is also its contra", async () => {
		const traj = cli(ledgerHome())
		await account(traj, "Opening", "equity")
		const res = await traj([
			"tx",
			"add",
			"--opening",
			"--from",
			"Opening",
			"--to",
			"Opening",
			"--amount",
			"5.00",
			"--date",
			"2026-11-01",
			"--json",
		])
		expect(res.code).toBe(3)
		expect(errorOf(res).code).toBe("same_account")
		expect(await ledgerSize(traj)).toEqual({ transactions: 0, postings: 0 })
	})
})
