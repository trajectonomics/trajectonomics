import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { AccountsSection } from "./AccountsSection"
import { accountList, balance, failure } from "./fixtures.test-support"

describe("AccountsSection", () => {
	test("nests a header and its leaf, and shows the leaf's balance as the CLI printed it", () => {
		const html = renderToStaticMarkup(<AccountsSection accounts={accountList} balance={balance} />)
		expect(html).toContain("Header")
		expect(html).toContain("Checking")
		expect(html).toContain("1,500.00")
		expect(html).toContain("Assets and expenses are positive")
	})

	test("marks an archived account", () => {
		const html = renderToStaticMarkup(<AccountsSection accounts={accountList} balance={balance} />)
		expect(html).toContain("Archived")
	})

	test("shows the CLI's error in the accounts section when the chart of accounts failed", () => {
		const html = renderToStaticMarkup(
			<AccountsSection
				accounts={failure(["account", "list", "--json"], "The chart could not be listed.")}
				balance={balance}
			/>,
		)
		expect(html).toContain("The chart of accounts could not be read")
		expect(html).toContain("The chart could not be listed.")
	})

	test("keeps the tree without amounts and shows the error when only the balances failed", () => {
		const html = renderToStaticMarkup(
			<AccountsSection
				accounts={accountList}
				balance={failure(balance.argv, "Balances are unavailable.")}
			/>,
		)
		expect(html).toContain("Balances could not be read")
		expect(html).toContain("Balances are unavailable.")
		expect(html).toContain("Checking")
		expect(html).not.toContain("1,500.00")
	})
})
