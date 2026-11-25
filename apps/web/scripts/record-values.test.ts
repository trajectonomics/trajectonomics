// The record-values Edit against the real traj, over the fictional ledger: three values change net worth by
// the CLI's own differences, an equal value writes no Transaction, and a refusal writes nothing (web ADR 0008).
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { accountValues } from "../src/lib/contract"
import { recordValuesSchema } from "../src/lib/edit/record-values"
import {
	BINARY,
	disposeEditor,
	ledgerHome,
	postEdit,
	SLOW_MS,
	setupEditor,
} from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { recordValues } from "./serve-record-values"

type Reads = {
	accounts: { data: { accounts: { id: string; name: string }[] } }
	netWorth: { data: { totals: { amount: string }[] } }
}

/** The served Snapshot's reads, after the last Edit. */
async function reads(): Promise<Reads> {
	const editor = await setupEditor()
	return (JSON.parse(editor.body ?? "null") as { reads: Reads }).reads
}

/** An account's id by its name, from the Snapshot's chart of accounts. */
async function idOf(name: string): Promise<string> {
	const found = (await reads()).accounts.data.accounts.find((account) => account.name === name)
	if (found === undefined) throw new Error(`no account ${name}`)
	return found.id
}

/** Net worth in minor units, for the test's own arithmetic (the page does none). */
async function netWorthCents(): Promise<bigint> {
	const amount = (await reads()).netWorth.data.totals[0]?.amount ?? "0"
	return BigInt(amount.replace(".", ""))
}

const cents = (amount: string): bigint => BigInt(amount.replace(".", ""))

/** How many transactions the ledger holds, read by traj itself. */
function transactionCount(): number {
	const run = Bun.spawnSync([BINARY, "tx", "list", "--json"], {
		env: { ...process.env, TRAJ_HOME: ledgerHome() },
	})
	return (JSON.parse(run.stdout.toString()) as { transactions: unknown[] }).transactions.length
}

async function record(rows: [string, string][], against = "Fund Return") {
	const values = await Promise.all(
		rows.map(async ([name, value]) => ({ account: await idOf(name), date: "2026-10-31", value })),
	)
	return postEdit(JSON.stringify({ kind: "record-values", against: await idOf(against), values }))
}

afterEach(settle, SLOW_MS)
afterAll(disposeEditor)

describe("the record-values Edit", () => {
	test(
		"three values move net worth by the CLI's differences, and an equal value writes nothing",
		async () => {
			const before = await netWorthCents()
			const written = transactionCount()
			const { status, answer } = await record([
				["Bank", "999999.00"],
				["Fund", "888888.00"],
				["Car Loan", "123456.00"],
			])
			expect(status).toBe(200)
			if (!answer.ok) throw new Error(answer.error.message)
			const result = accountValues.parse((answer as unknown as { result: unknown }).result)
			expect(result.counts.added).toBe(3)
			const difference = (name: string) =>
				cents(result.values.find((row) => row.account.name === name)?.difference ?? "0")
			// A liability's difference is what it owes more: net worth falls by it.
			const expected = before + difference("Bank") + difference("Fund") - difference("Car Loan")
			expect(await netWorthCents()).toBe(expected)
			expect(transactionCount()).toBe(written + 3)

			const again = await record([["Bank", "999999.00"]])
			if (!again.answer.ok) throw new Error(again.answer.error.message)
			const equal = accountValues.parse((again.answer as unknown as { result: unknown }).result)
			expect(equal.values[0]).toMatchObject({
				status: "unchanged",
				difference: "0.00",
				transaction: null,
			})
			expect(transactionCount()).toBe(written + 3)
		},
		SLOW_MS,
	)

	test(
		"a refused row is named by its index in details.values, and nothing is written",
		async () => {
			const before = await netWorthCents()
			const written = transactionCount()
			const { answer } = await record([
				["Bank", "5.00"],
				["Car Loan", "-5"],
			])
			expect(answer.ok).toBe(false)
			if (answer.ok) return
			expect(answer.error.code).toBe("valuation_value_negative")
			const { values } = (answer.error as unknown as { details: { values: { index: number }[] } })
				.details
			expect(values.map((row) => row.index)).toEqual([1])
			expect(await netWorthCents()).toBe(before)
			expect(transactionCount()).toBe(written)
		},
		SLOW_MS,
	)

	test(
		"an account the Snapshot does not hold is refused before traj runs",
		async () => {
			const written = transactionCount()
			const body = JSON.stringify({
				kind: "record-values",
				against: await idOf("Fund Return"),
				values: [{ account: "no-such-account", date: "2026-10-31", value: "1.00" }],
			})
			const { status, answer } = await postEdit(body)
			expect(status).toBe(400)
			expect(answer.ok || answer.error.code).toBe("unknown_account")
			expect(transactionCount()).toBe(written)
		},
		SLOW_MS,
	)
})

describe("an Edit the Snapshot cannot check", () => {
	test("is refused as no_accounts, before traj runs, when the Snapshot holds no chart of accounts", async () => {
		const edit = recordValuesSchema.parse({
			kind: "record-values",
			against: "a",
			values: [{ account: "b", date: "2026-10-31", value: "1" }],
		})
		const response = await recordValues(
			{
				traj: { binary: "/no/such/traj" },
				held: null,
				refresh: () => Promise.reject(new Error("ran")),
			},
			edit,
		)
		const answer = (await response.json()) as { ok: boolean; error: { code: string } }
		expect(response.status).toBe(400)
		expect(answer.error.code).toBe("no_accounts")
	})
})
