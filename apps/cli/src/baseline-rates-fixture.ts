import { seededHome } from "./ledger-fixture"
import { account, ENTITY, posting, transaction } from "./ledger-fixture/rows"
import type { PostingRow, RestoreRows, TxRow } from "./store"

/** The As-of the rates fixture states: the window is 2025-11 to 2026-10, twelve whole months. */
export const RATES_AS_OF = "2026-11-15"

/** The fixture's Account ids, so a test can point at one row without restating it. */
export const RATES_ACCOUNTS = {
	cash: "0194c000-0001-7000-8000-000000000001",
	opening: "0194c000-0002-7000-8000-000000000002",
	salary: "0194c000-0003-7000-8000-000000000003",
	rent: "0194c000-0004-7000-8000-000000000004",
	food: "0194c000-0005-7000-8000-000000000005",
	fees: "0194c000-0006-7000-8000-000000000006",
	premium: "0194c000-0007-7000-8000-000000000007",
	repair: "0194c000-0008-7000-8000-000000000008",
	gadgets: "0194c000-0009-7000-8000-000000000009",
	oldHobby: "0194c000-0010-7000-8000-000000000010",
	savings: "0194c000-0011-7000-8000-000000000011",
	loan: "0194c000-0012-7000-8000-000000000012",
} as const

/** The twelve covered months, oldest first: 2025-11 through 2026-10. */
const MONTHS: readonly string[] = Array.from({ length: 12 }, (_, index) => {
	const month = 11 + index
	return month <= 12
		? `2025-${String(month).padStart(2, "0")}`
		: `2026-${String(month - 12).padStart(2, "0")}`
})

/**
 * The hand-computed Ledger the rates tests share. The record opens on 2025-10-01, the first day
 * of the month before the window, so all twelve window months are covered: salary 50,000.00 in
 * each, rent 15,000.00 in each, uneven food totalling 100,000.01, fees totalling 0.06, one March
 * premium of 24,000.00, repairs in May and August, a refunded gadget, and an archived expense.
 * A monthly transfer and a loan principal payment keep their rows off the P&L.
 */
function ratesRows(): RestoreRows {
	const tx: TxRow[] = []
	const postings: PostingRow[] = []
	let count = 0
	const write = (date: string, debit: string, credit: string, amount: number): void => {
		count += 1
		const id = `0194c100-${String(count).padStart(4, "0")}-7000-8000-000000000000`
		tx.push(transaction(id, date))
		postings.push(posting(id, 0, debit, amount), posting(id, 1, credit, -amount))
	}
	const spend = (date: string, accountId: string, amount: number): void => {
		write(date, accountId, RATES_ACCOUNTS.cash, amount)
	}
	write("2025-10-01", RATES_ACCOUNTS.cash, RATES_ACCOUNTS.opening, 100_000_000)
	write("2025-10-02", RATES_ACCOUNTS.cash, RATES_ACCOUNTS.loan, 10_000_000)
	for (const month of MONTHS) {
		write(`${month}-01`, RATES_ACCOUNTS.cash, RATES_ACCOUNTS.salary, 5_000_000)
		spend(`${month}-02`, RATES_ACCOUNTS.rent, 1_500_000)
		write(`${month}-05`, RATES_ACCOUNTS.savings, RATES_ACCOUNTS.cash, 1_000_000)
		write(`${month}-06`, RATES_ACCOUNTS.loan, RATES_ACCOUNTS.cash, 50_000)
	}
	spend("2025-11-10", RATES_ACCOUNTS.food, 5_000_000)
	spend("2026-02-10", RATES_ACCOUNTS.food, 3_000_001)
	spend("2026-07-10", RATES_ACCOUNTS.food, 2_000_000)
	spend("2026-01-10", RATES_ACCOUNTS.fees, 3)
	spend("2026-02-11", RATES_ACCOUNTS.fees, 3)
	spend("2026-03-10", RATES_ACCOUNTS.premium, 2_400_000)
	spend("2026-05-10", RATES_ACCOUNTS.repair, 300_000)
	spend("2026-08-10", RATES_ACCOUNTS.repair, 100_000)
	spend("2026-04-10", RATES_ACCOUNTS.gadgets, 200_000)
	spend("2026-09-10", RATES_ACCOUNTS.gadgets, -500_000)
	spend("2026-06-10", RATES_ACCOUNTS.oldHobby, 10_000)
	const accounts = [
		account(RATES_ACCOUNTS.cash, "Cash", "asset"),
		account(RATES_ACCOUNTS.opening, "Opening", "equity"),
		account(RATES_ACCOUNTS.salary, "Salary", "income"),
		account(RATES_ACCOUNTS.rent, "Rent", "expense"),
		account(RATES_ACCOUNTS.food, "Food", "expense"),
		account(RATES_ACCOUNTS.fees, "Fees", "expense"),
		account(RATES_ACCOUNTS.premium, "Premium", "expense"),
		account(RATES_ACCOUNTS.repair, "Repair", "expense"),
		account(RATES_ACCOUNTS.gadgets, "Gadgets", "expense"),
		account(RATES_ACCOUNTS.oldHobby, "Old hobby", "expense", null, "2026-07-01T00:00:00.000Z"),
		account(RATES_ACCOUNTS.savings, "Savings", "asset"),
		account(RATES_ACCOUNTS.loan, "Loan", "liability"),
	]
	return { entity: [ENTITY], account: accounts, tx, posting: postings, scenario: [] }
}

/** A fresh data directory holding the rates fixture, written through the store and read-only after. */
export function ratesFixtureHome(): string {
	return seededHome(ratesRows())
}
