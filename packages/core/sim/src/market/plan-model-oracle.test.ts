import { describe, expect, it } from "bun:test"
import { type OracleAccount, oracleColumn } from "../golden/oracle-plan-model"
import { planReturnModel } from "../index"
import type { Account } from "../types"
import { planScenario } from "./plan-model-fixture"

interface Case {
	readonly name: string
	readonly account: OracleAccount
}

const CASES: readonly Case[] = [
	{ name: "7% a year, 15% volatility", account: { rate: 700, volatility: 1500 } },
	{ name: "0% a year, 20% volatility", account: { rate: 0, volatility: 2000 } },
	{
		name: "12% nominal monthly, 25% volatility",
		account: { rate: 1200, compounding: "monthly", volatility: 2500 },
	},
	{
		name: "5% nominal quarterly, 8% volatility",
		account: { rate: 500, compounding: "quarterly", volatility: 800 },
	},
	{ name: "-90% a year, 100% volatility", account: { rate: -9000, volatility: 10_000 } },
	{ name: "1000% a year, 100% volatility", account: { rate: 100_000, volatility: 10_000 } },
]

function asAccount({ rate, compounding, volatility }: OracleAccount): Account {
	return {
		id: "fund",
		kind: "asset",
		rate,
		volatility,
		...(compounding === undefined ? {} : { compounding }),
	}
}

/** The oracle's column clamped to the Return model's range, and how many buckets the clamp moved. */
function expected(account: OracleAccount, buckets: number) {
	const exact = oracleColumn(account, buckets)
	const returns = exact.map((value) => Math.min(10_000, Math.max(-9999, value)))
	const count = exact.filter((value, index) => value !== returns[index]).length
	return { returns, notes: count === 0 ? [] : [{ account: "fund", clamped: count }] }
}

describe("the plan Return model against the independent oracle", () => {
	for (const { name, account } of CASES) {
		it(`matches the oracle's exact fixed-point build for ${name}`, () => {
			for (const buckets of [16, 64, 256, 1024]) {
				const result = planReturnModel(planScenario([asAccount(account)]), { buckets })
				if (!result.ok) throw new Error("refused")
				const want = expected(account, buckets)
				expect(result.model.buckets.map((bucket) => bucket.returnsBps[0])).toEqual(want.returns)
				expect(result.notes).toEqual(want.notes)
			}
		})
	}
})
