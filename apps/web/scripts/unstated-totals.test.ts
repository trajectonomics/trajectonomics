// The read the Dashboard makes on a ledger whose cross-account sums leave the safe range while every account is in range
// (cli ADR 0079): a Loan at 90071992547402.70 and a Fund overdrawn to -9.58. The real traj states the rows and no totals,
// and the contract parses each result.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { balance, pnl } from "../src/lib/contract"
import { trialBalanceView } from "../src/lib/view/ledger/trial-balance"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"

let scratch = ""

function traj(argv: string[]): unknown {
	const run = Bun.spawnSync([BINARY, ...argv, "--json"], {
		env: { ...process.env, TRAJ_HOME: join(scratch, "home") },
	})
	if (run.exitCode !== 0) throw new Error(`traj ${argv.join(" ")}: ${run.stderr.toString()}`)
	return JSON.parse(run.stdout.toString())
}

beforeAll(() => {
	return mkdtemp(join(tmpdir(), "traj-web-unstated-")).then((dir) => {
		scratch = dir
		traj(["init"])
		for (const [name, type] of [
			["Fund", "asset"],
			["Loan", "liability"],
			["Gains", "income"],
			["Food", "expense"],
		]) {
			traj(["account", "add", name ?? "", "--type", type ?? "", "--currency", "THB"])
		}
		const at = ["--date", "2026-01-01", "--against", "Gains"]
		traj(["account", "value", "Loan", "--value", "90071992547402.70", ...at])
		traj(["account", "value", "Fund", "--value", "9.42", ...at])
		const spend = ["--from", "Fund", "--to", "Food", "--amount", "19.00", "--date", "2026-02-10"]
		traj(["tx", "add", ...spend])
	})
}, SLOW_MS)

afterAll(() => rm(scratch, { recursive: true, force: true }))

describe("the Dashboard's reads of a ledger whose sums are out of range", () => {
	test("`balance --trial-balance` parses, with every row and no totals", () => {
		const read = balance.parse(traj(["balance", "--as-of", "2026-02-11", "--trial-balance"]))
		expect(read.netWorth).toBeNull()
		expect(read.trialBalance?.rows).toHaveLength(4)
		expect(read.trialBalance?.totals).toBeNull()
		expect(read.trialBalance?.totalsError?.code).toBe("AMOUNT_OVERFLOW")
		const view = trialBalanceView(read.trialBalance)
		expect(view?.lines).toHaveLength(4)
		expect(view?.totals).toEqual([])
		expect(view?.note).toContain("The totals are not stated")
	})

	test("`report pnl` parses, with every row and no total", () => {
		const read = pnl.parse(traj(["report", "pnl", "--until", "2026-02-11"]))
		expect(read.rows.map((row) => row.account.name)).toEqual(["Food", "Gains"])
		expect(read.totals).toBeNull()
		expect(read.totalsError?.code).toBe("AMOUNT_OVERFLOW")
	})

	test("a date before the overdraft still states its totals", () => {
		const read = balance.parse(traj(["balance", "--as-of", "2026-01-02", "--trial-balance"]))
		expect(read.trialBalance?.totals).toEqual([
			{ currency: "THB", debit: "90071992547402.70", credit: "90071992547402.70" },
		])
		expect(read.trialBalance).not.toHaveProperty("totalsError")
	})
})
