import { describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import type { Read } from "../../lib/contract"
import Money from "./Money.svelte"
import ReadView from "./ReadView.svelte"

const failed: Read<{ total: string }> = {
	argv: ["report", "networth", "--as-of", "2026-10-31", "--json"],
	ok: false,
	error: {
		code: "LEDGER_EMPTY",
		exitCode: 2,
		message: "The ledger has no transactions yet.",
		hint: "Record one with traj tx add.",
	},
}

describe("Money", () => {
	test("shows the CLI's string grouped, with its currency beside it", () => {
		const { body } = render(Money, {
			props: { amount: "-1234567.50", currency: "THB", hidden: false },
		})
		expect(body).toContain("−1,234,567.50")
		expect(body).toContain("THB")
	})

	test("hides the digits behind the mask and keeps the sign and the currency", () => {
		const { body } = render(Money, {
			props: { amount: "-1234567.50", currency: "THB", hidden: true },
		})
		expect(body).toContain("−•••••")
		expect(body).not.toContain("1,234")
		expect(body).toContain("THB")
		expect(body).toContain("amount hidden")
	})

	test("colours a negative amount as a warning only when asked to", () => {
		const plain = render(Money, { props: { amount: "-5.00", hidden: false } }).body
		const signed = render(Money, { props: { amount: "-5.00", hidden: false, signed: true } }).body
		expect(plain).not.toContain("text-destructive")
		expect(signed).toContain("text-destructive")
	})
})

describe("ReadView", () => {
	test("renders the data of a successful Read", () => {
		const read: Read<{ total: string }> = {
			argv: ["report", "networth", "--json"],
			ok: true,
			data: { total: "1.00" },
		}
		const children = createRawSnippet<[unknown]>((data) => ({
			render: () => `<p>${JSON.stringify(data())}</p>`,
		}))
		const { body } = render(ReadView, { props: { read, label: "Net worth", children } })
		expect(body).toContain('<p>{"total":"1.00"}</p>')
	})

	test("renders the CLI's message, hint, code and command for a failed Read", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>never</p>" }))
		const { body } = render(ReadView, { props: { read: failed, label: "Net worth", children } })
		expect(body).toContain("Net worth could not be read")
		expect(body).toContain("The ledger has no transactions yet.")
		expect(body).toContain("Record one with traj tx add.")
		expect(body).toContain("LEDGER_EMPTY")
		expect(body).toContain("traj report networth --as-of 2026-10-31 --json")
		expect(body).not.toContain("never")
	})
})
