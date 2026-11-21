import { describe, expect, test } from "bun:test"
import { row } from "../overview/fixtures.test-support"
import { assetBars, liabilityRows } from "./composition"

describe("assetBars", () => {
	test("divides only the asset rows, by currency, in the CLI's order", () => {
		const bars = assetBars([
			row("Bank", "asset", "600.00"),
			row("Card", "liability", "-200.00"),
			row("Fund", "asset", "400.00"),
			row("Cash", "asset", "10.00", "USD"),
		])
		expect(bars.map((bar) => bar.currency)).toEqual(["THB", "USD"])
		expect(bars[0]?.segments.map((segment) => segment.label)).toEqual(["Bank", "Fund"])
		expect(bars[0]?.segments[1]?.amount).toBe("400.00")
	})

	test("gives a negative asset no width and keeps its amount as the CLI states it", () => {
		const [bar] = assetBars([row("Overdrawn", "asset", "-50.00"), row("Bank", "asset", "50.00")])
		expect(bar?.segments[0]).toEqual({ label: "Overdrawn", amount: "-50.00", value: 0 })
		expect(bar?.segments[1]?.value).toBe(50)
	})

	test("has no bar when no asset account has a row", () => {
		expect(assetBars([])).toEqual([])
		expect(assetBars([row("Card", "liability", "-200.00")])).toEqual([])
	})
})

describe("liabilityRows", () => {
	test("keeps the liability rows with their negative amounts", () => {
		const rows = liabilityRows([
			row("Bank", "asset", "1.00"),
			row("Loan", "liability", "-184000.00"),
		])
		expect(rows.map((item) => [item.account.name, item.amount])).toEqual([["Loan", "-184000.00"]])
	})
})
