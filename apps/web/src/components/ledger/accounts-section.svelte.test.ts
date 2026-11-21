import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { AccountList, Balance, Read } from "../../lib/contract"
import AccountsSection from "./AccountsSection.svelte"
import { accountList, balance, failure } from "./fixtures.test-support"

describe("AccountsSection", () => {
	test("nests a header and its leaf, and shows the leaf's balance as the CLI printed it", () => {
		const { body } = render(AccountsSection, { props: { accounts: accountList, balance } })
		expect(body).toContain("Header")
		expect(body).toContain("Checking")
		expect(body).toContain("1,500.00")
		expect(body).toContain("Assets and expenses are positive")
	})

	test("marks an archived account", () => {
		const { body } = render(AccountsSection, { props: { accounts: accountList, balance } })
		expect(body).toContain("Archived")
	})

	test("shows the CLI's error in the accounts section when the chart of accounts failed", () => {
		const accounts: Read<AccountList> = failure(
			["account", "list", "--json"],
			"The chart could not be listed.",
		)
		const { body } = render(AccountsSection, { props: { accounts, balance } })
		expect(body).toContain("The chart of accounts could not be read")
		expect(body).toContain("The chart could not be listed.")
	})

	test("keeps the tree without amounts and shows the error when only the balances failed", () => {
		const { body } = render(AccountsSection, {
			props: {
				accounts: accountList,
				balance: failure<Balance>(balance.argv, "Balances are unavailable."),
			},
		})
		expect(body).toContain("Balances could not be read")
		expect(body).toContain("Balances are unavailable.")
		expect(body).toContain("Checking")
		expect(body).not.toContain("1,500.00")
	})
})
