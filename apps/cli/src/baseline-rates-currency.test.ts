import { describe, expect, it } from "bun:test"
import { edited } from "./baseline/testing"
import { seededHome } from "./ledger-fixture"
import { account, ENTITY, posting, transaction } from "./ledger-fixture/rows"
import type { RestoreRows } from "./store"
import { capture } from "./test-support"

const VISA = "0194c400-0001-7000-8000-000000000001"
const WALLET = "0194c400-0002-7000-8000-000000000002"
const CASH = "0194c400-0003-7000-8000-000000000003"
const OPENING = "0194c400-0004-7000-8000-000000000004"

/** A THB Ledger with one Visa expense, so a hand edit can move that row and its wallet to USD. */
function home(): string {
	const txs = [
		transaction("0194c500-0001-7000-8000-000000000001", "2026-01-01"),
		transaction("0194c500-0002-7000-8000-000000000002", "2026-02-10"),
	]
	const rows: RestoreRows = {
		entity: [ENTITY],
		account: [
			account(CASH, "Cash", "asset"),
			account(OPENING, "Opening", "equity"),
			account(VISA, "Visa", "expense"),
			account(WALLET, "Wallet", "asset"),
		],
		tx: txs,
		posting: [
			posting(txs[0]!.id, 0, CASH, 1_000_000),
			posting(txs[0]!.id, 1, OPENING, -1_000_000),
			posting(txs[1]!.id, 0, VISA, 1000),
			posting(txs[1]!.id, 1, WALLET, -1000),
		],
		scenario: [],
	}
	return seededHome(rows)
}

describe("baseline rates in another currency", () => {
	it("refuses an income or expense row stated in anything but THB", async () => {
		const usd = edited(
			home(),
			`UPDATE account SET currency = 'USD' WHERE id IN ('${VISA}', '${WALLET}')`,
			`UPDATE posting SET currency = 'USD' WHERE account_id IN ('${VISA}', '${WALLET}')`,
		)
		const res = await capture(
			["baseline", "rates", "--as-of", "2026-03-31", "--months", "3", "--json"],
			{ TRAJ_HOME: usd },
		)
		expect(res.code).toBe(3)
		expect(res.out).toBe("")
		expect(JSON.parse(res.err).error).toMatchObject({
			code: "unsupported_currency",
			exitCode: 3,
			path: `rows.${VISA}`,
		})
	})
})
