import { describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import type { Read } from "../../lib/contract"
import DirectedMoney from "./DirectedMoney.svelte"
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

	test("shows a card's short form, keeping the exact figure in the accessible text and the title", () => {
		const { body } = render(Money, {
			props: { amount: "1214900.00", currency: "THB", hidden: false, compact: true },
		})
		expect(body).toMatch(/aria-hidden="true">1\.21M<\/span>/)
		expect(body).toContain('<span class="sr-only">1,214,900.00</span>')
		expect(body).toContain('title="1,214,900.00"')
		expect(body).toContain("THB")
	})

	test("masks a compact amount, revealing neither form when hidden", () => {
		const { body } = render(Money, {
			props: { amount: "1214900.00", currency: "THB", hidden: true, compact: true },
		})
		expect(body).toContain("•••••")
		expect(body).toContain("amount hidden")
		expect(body).not.toContain("1.21M")
		expect(body).not.toContain("1,214,900.00")
		expect(body).not.toContain("title=")
	})

	test("colours a negative amount as a warning only when asked to", () => {
		const plain = render(Money, { props: { amount: "-5.00", hidden: false } }).body
		const signed = render(Money, { props: { amount: "-5.00", hidden: false, signed: true } }).body
		expect(plain).not.toContain("text-destructive")
		expect(signed).toContain("text-destructive")
	})
})

describe("DirectedMoney", () => {
	test("reads a row's sign as money in or money out, whatever the account type", () => {
		const refund = render(DirectedMoney, {
			props: { amount: "-1500.00", kind: "money", currency: "THB" },
		}).body
		expect(refund).toContain("Money in")
		expect(refund).toContain("1,500.00")
		expect(refund).toContain('title="The ledger states −1,500.00 THB"')
		const reversal = render(DirectedMoney, { props: { amount: "700.00", kind: "money" } }).body
		expect(reversal).toContain("Money out")
		expect(reversal).toContain("700.00")
	})

	test("reads a liability's sign as what you owe, or as what is owed to you", () => {
		expect(render(DirectedMoney, { props: { amount: "-200.00", kind: "owed" } }).body).toContain(
			"You owe",
		)
		const overpaid = render(DirectedMoney, { props: { amount: "50.00", kind: "owed" } }).body
		expect(overpaid).toContain("Owed to you")
		expect(overpaid).toContain("50.00")
	})

	test("gives zero no direction word, whether the CLI writes a sign or not", () => {
		for (const amount of ["0.00", "-0.00"]) {
			const { body } = render(DirectedMoney, { props: { amount, kind: "money" } })
			expect(body).toContain("0.00")
			expect(body).not.toContain("Money in")
			expect(body).not.toContain("Money out")
		}
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

	test("marks the error text as the CLI's only when the CLI wrote it", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>never</p>" }))
		const shown = (code: string) => {
			const read: Read<{ total: string }> = {
				argv: ["report", "networth", "--json"],
				ok: false,
				error: { code, exitCode: 1, message: "Some words." },
			}
			return render(ReadView, { props: { read, label: "Net worth", children } }).body
		}
		expect(shown("LEDGER_EMPTY")).toContain("data-cli")
		for (const code of ["traj_unavailable", "contract_mismatch", "unparsed_error"])
			expect(shown(code)).not.toContain("data-cli")
	})
})
