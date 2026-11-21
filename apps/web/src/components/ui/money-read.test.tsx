import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { Read } from "../../lib/contract"
import { Money } from "./Money"
import { ReadView } from "./ReadView"

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
		const html = renderToStaticMarkup(<Money amount="-1234567.50" currency="THB" hidden={false} />)
		expect(html).toContain("−1,234,567.50")
		expect(html).toContain("THB")
	})

	test("hides the digits behind the mask and keeps the sign and the currency", () => {
		const html = renderToStaticMarkup(<Money amount="-1234567.50" currency="THB" hidden />)
		expect(html).toContain("−•••••")
		expect(html).not.toContain("1,234")
		expect(html).toContain("THB")
		expect(html).toContain("amount hidden")
	})

	test("colours a negative amount as a warning only when asked to", () => {
		const plain = renderToStaticMarkup(<Money amount="-5.00" hidden={false} />)
		const signed = renderToStaticMarkup(<Money amount="-5.00" hidden={false} signed />)
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
		const html = renderToStaticMarkup(
			<ReadView read={read} label="Net worth" render={(data) => <p>{data.total}</p>} />,
		)
		expect(html).toBe("<p>1.00</p>")
	})

	test("renders the CLI's message, hint, code and command for a failed Read", () => {
		const html = renderToStaticMarkup(
			<ReadView read={failed} label="Net worth" render={() => <p>never</p>} />,
		)
		expect(html).toContain("Net worth could not be read")
		expect(html).toContain("The ledger has no transactions yet.")
		expect(html).toContain("Record one with traj tx add.")
		expect(html).toContain("LEDGER_EMPTY")
		expect(html).toContain("traj report networth --as-of 2026-10-31 --json")
		expect(html).not.toContain("never")
	})
})
