import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { Read, TxList } from "../../lib/contract"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import LedgerFocus from "./LedgerFocus.svelte"

describe("LedgerFocus", () => {
	test("labels the newest record, and draws one row per account", () => {
		const { body } = render(LedgerFocus, {
			props: { accounts: DEMO.reads.accounts, transactions: DEMO.reads.transactions },
		})
		expect(body).toContain(
			"When did you last record your accounts? 28 Oct 2026. 9 accounts, 0 not recorded in the month before it.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("28 Oct 2026")
		expect(body).toContain("9 accounts")
		expect(body.match(/Bank/g)?.length).toBeGreaterThan(0)
		expect(body).not.toContain("data-primary-action")
	})

	test("keeps the page's own empty state, with no focus point, when the transactions could not be read", () => {
		const failed: Read<TxList> = {
			argv: ["tx", "list", "--json"],
			ok: false,
			error: { code: "LEDGER_EMPTY", exitCode: 2, message: "The ledger is empty." },
		}
		const { body } = render(LedgerFocus, {
			props: { accounts: DEMO.reads.accounts, transactions: failed },
		})
		expect(body).not.toContain("data-focus-section")
	})
})
