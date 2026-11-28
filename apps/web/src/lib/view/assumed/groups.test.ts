import { describe, expect, test } from "bun:test"
import type { AssumedItem } from "../../contract"
import {
	allowance,
	DOCUMENT,
	filled,
	ONE_OF_EACH,
	taxFigure,
	unlabelled,
} from "./fixtures.test-support"
import { assumedGroups } from "./groups"

const groups = (items: readonly AssumedItem[], search = "") =>
	assumedGroups(items, DOCUMENT, search)

/** Each group's sentence, as its subject's id and the words after it. */
const said = (items: readonly AssumedItem[]) =>
	groups(items).map(({ key, sentence }) => [key, sentence.subject?.id ?? null, sentence.text])

describe("the sentence of each group", () => {
	test("names the item when the group holds one", () => {
		expect(said(ONE_OF_EACH)).toEqual([
			["inflation", null, "Inflation is 0% a year"],
			["account-rates", "cash", "grows at 1.5% a year"],
			["debt-rates", "car-loan", "charges 7% interest"],
			["amounts", "salary", "is an amount you did not set"],
			["unlabelled", "salary", "has no tax label"],
			["allowances", null, "Life insurance premiums is not in this plan's tax"],
			["tax-figures", null, "1 tax figure is not yet confirmed"],
		])
	})

	test("counts the items when it holds more, and states a rate they all share", () => {
		const items = [
			filled("accounts.cash.rate", 0),
			filled("accounts.fund.rate", 0),
			filled("accounts.car-loan.rate", 500),
			filled("accounts.card.rate", 500),
			filled("flows.salary.amount", "1.00"),
			filled("flows.rent.amount", "2.00"),
			unlabelled("salary"),
			unlabelled("rent"),
			allowance("lifeInsurance"),
			allowance("thaiEsg"),
			taxFigure("a.b", "One."),
			taxFigure("a.c", "Two."),
		]
		expect(said(items)).toEqual([
			["account-rates", null, "2 accounts grow at 0% a year"],
			["debt-rates", null, "2 debts charge 5% interest"],
			["amounts", null, "2 incomes and expenses are amounts you did not set"],
			["unlabelled", null, "2 incomes have no tax label"],
			["allowances", null, "2 tax allowances are not in this plan's tax"],
			["tax-figures", null, "2 tax figures are not yet confirmed"],
		])
	})

	test("gives no one rate to Accounts or debts whose rates differ", () => {
		const items = [
			filled("accounts.cash.rate", 0),
			filled("accounts.fund.rate", 200),
			filled("accounts.car-loan.rate", 500),
			filled("accounts.card.rate", 1600),
		]
		expect(said(items)).toEqual([
			["account-rates", null, "2 accounts grow at rates you did not set"],
			["debt-rates", null, "2 debts charge rates you did not set"],
		])
	})

	test("never shows an allowance's class key, even for a class the page has no words for", () => {
		const [group] = groups([allowance("someNewClass")])
		expect(group?.sentence.text).toBe("A tax allowance is not in this plan's tax")
		expect(group?.lines.map((line) => line.text)).toEqual(["A tax allowance"])
	})

	test("carries no money and no id, and leaves the item to be named by the page", () => {
		for (const { sentence } of groups(ONE_OF_EACH)) {
			expect(sentence.text).not.toContain("52000")
			expect(sentence.text).not.toMatch(/\b(cash|car-loan|salary|lifeInsurance)\b/)
		}
	})
})

describe("the lines and links of each group", () => {
	test("lists the groups in the page's order whatever order the items come in", () => {
		expect(groups([...ONE_OF_EACH].reverse()).map((group) => group.key)).toEqual(
			groups(ONE_OF_EACH).map((group) => group.key),
		)
	})

	test("links each group, or each amount, to the page that changes it", () => {
		const items = [...ONE_OF_EACH, filled("flows.rent.amount", "2.00")]
		const links = groups(items).map((group) => [
			group.key,
			group.link === null ? group.lines.map((line) => line.link?.href) : group.link.href,
		])
		expect(links).toEqual([
			["inflation", "/settings/assumptions/"],
			["account-rates", "/settings/assumptions/"],
			["debt-rates", "/assets-and-debts/"],
			["amounts", ["/income/", "/expenses/"]],
			["unlabelled", "/income/"],
			["allowances", "/settings/tax/"],
			["tax-figures", "/tax/"],
		])
		expect(groups(items).at(-1)?.link?.label).toBe("See tax")
	})

	test("keeps the address's query on every link", () => {
		const hrefs = groups(ONE_OF_EACH, "?scenario=trial").flatMap((group) => [
			...(group.link === null ? [] : [group.link.href]),
			...group.lines.flatMap((line) => (line.link === undefined ? [] : [line.link.href])),
		])
		expect(hrefs).toHaveLength(7)
		for (const href of hrefs) expect(href).toEndWith("?scenario=trial")
	})

	test("gives money to the amount lines alone, and a value to Keep to what the template wrote", () => {
		const lines = groups(ONE_OF_EACH).flatMap((group) => group.lines)
		expect(lines.flatMap((line) => line.amount ?? [])).toEqual([
			{ value: "52000.00", currency: "THB" },
		])
		expect(lines.flatMap((line) => line.keep?.path ?? [])).toEqual([
			"economy.inflation",
			"accounts.cash.rate",
			"accounts.car-loan.rate",
			"flows.salary.amount",
		])
	})

	test("prints a tax figure's note as the CLI's own words", () => {
		const [group] = groups([taxFigure("a.b", "Home-loan interest ceiling, baht.")])
		expect(group?.lines).toEqual([
			{ key: "a.b", text: "Home-loan interest ceiling, baht.", cli: true },
		])
	})
})
