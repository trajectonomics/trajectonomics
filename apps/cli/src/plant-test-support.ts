import { Database } from "bun:sqlite"
import { join } from "node:path"
import { PERSONAL_ENTITY_ID } from "./store"
import { newId } from "./store/ids"

/** A decimal amount of baht as satang, read from its digits, so a Balance at the edge of the range stays exact. */
function satang(amount: string): number {
	const [whole = "0", fraction = ""] = amount.split(".")
	return Number(`${whole}${fraction.padEnd(2, "0")}`)
}

/**
 * Writes a transaction straight into the ledger file, past the checks `tx add` makes, so a test
 * can hold a ledger a Balance already overflows in (one an earlier release, or another tool,
 * left): `tx add` no longer writes one. The debit is `to`, the credit `from`, as `tx add` posts.
 */
export function plant(home: string, from: string, to: string, amount: string, date: string): void {
	const db = new Database(join(home, "traj.db"))
	try {
		const id = (name: string): string =>
			db.query<{ id: string }, [string]>("SELECT id FROM account WHERE name = ?1").get(name)!.id
		const at = new Date().toISOString()
		const txId = newId(new Date())
		db.run(
			`INSERT INTO tx (id, entity_id, date, version, created_at, updated_at)
			VALUES (?1, ?2, ?3, 1, ?4, ?4)`,
			[txId, PERSONAL_ENTITY_ID, date, at],
		)
		const rows: [string, number][] = [
			[id(to), satang(amount)],
			[id(from), -satang(amount)],
		]
		for (const [ordinal, [account, value]] of rows.entries()) {
			db.run(
				`INSERT INTO posting (tx_id, ordinal, account_id, amount, currency) VALUES (?1, ?2, ?3, ?4, 'THB')`,
				[txId, ordinal, account, value],
			)
		}
	} finally {
		db.close()
	}
}
