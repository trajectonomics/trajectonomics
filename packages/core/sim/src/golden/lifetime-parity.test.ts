import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { AccountAmount, AssetRule, Projection } from "../types"
import { EVERY_PARITY_CASE } from "./every-parity-case"

function sumOf(values: readonly number[]): number {
	return values.reduce((sum, value) => sum + value, 0)
}

function ownSum(lines: readonly AccountAmount[], account: string): number {
	return sumOf(lines.filter((line) => line.account === account).map((line) => line.amount))
}

/** What the Account's own roll-up figures sum to, or undefined for a figure it does not declare. */
function summed(projection: Projection, account: string, item: "fees" | "payouts") {
	const lines =
		item === "fees"
			? projection.annual.flatMap((roll) => roll.accountFees ?? [])
			: projection.cashflow!.flatMap((year) => year.payouts ?? [])
	return ownSum(lines, account)
}

describe("the lifetime totals of every parity case", () => {
	it.each(EVERY_PARITY_CASE.map((item) => [item.name, item] as const))(
		"%s: each total is the sum of that Account's roll-up figures, and none is stated undeclared",
		(_name, { fixture, projectOptions }) => {
			const { baseline, scenario, timeline } = fixture
			const result = project(baseline, scenario, timeline, {
				...projectOptions,
				cashflowBreakdown: true,
			})
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const { projection } = result
			const assets = scenario.accounts.filter(
				(account): account is AssetRule => account.kind === "asset",
			)
			const charging = assets.filter((account) => (account.fee?.bps ?? 0) > 0)
			const paying = assets.filter((account) => (account.payout?.bps ?? 0) > 0)
			const stated = assets.filter(
				(account) => charging.includes(account) || paying.includes(account),
			)
			expect((projection.accountLifetimes ?? []).map((item) => item.account)).toEqual(
				stated.map((account) => account.id),
			)
			expect(projection.lifetimeFees === undefined).toBe(charging.length === 0)
			for (const account of charging) {
				const own = projection.accountLifetimes!.find((item) => item.account === account.id)!
				expect(own.lifetimeFees).toBe(summed(projection, account.id, "fees"))
			}
			for (const account of paying) {
				const own = projection.accountLifetimes!.find((item) => item.account === account.id)!
				expect(own.lifetimePayouts).toBe(summed(projection, account.id, "payouts"))
			}
			expect(sumOf((projection.accountLifetimes ?? []).map((item) => item.lifetimeFees ?? 0))).toBe(
				projection.lifetimeFees ?? 0,
			)
			expect(
				sumOf((projection.accountLifetimes ?? []).map((item) => item.lifetimePayouts ?? 0)),
			).toBe(sumOf(projection.annual.map((roll) => roll.payouts ?? 0)))
		},
	)

	it("covers every parity case that declares a fee or a payout", () => {
		const declaring = EVERY_PARITY_CASE.filter(({ fixture }) =>
			fixture.scenario.accounts.some(
				(a) => a.kind === "asset" && ((a.fee?.bps ?? 0) > 0 || (a.payout?.bps ?? 0) > 0),
			),
		)
		expect(declaring.map((item) => item.name)).toEqual(
			expect.arrayContaining(["payout-year", "fee-year", "lifetime-year"]),
		)
	})
})
