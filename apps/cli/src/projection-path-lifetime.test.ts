import { describe, expect, it } from "bun:test"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import type { ProjectionPathView } from "./projection/path-view"
import { projection } from "./projection/testing"
import { satang } from "./projection-income-read"
import { INCOME_FLAGS } from "./projection-income-support"
import { projectionLifetimeHome } from "./projection-lifetime-support"
import { capture } from "./test-support"

/*
 * `projection path` states a Projection as `projection run` does (cli ADR-0069), so the totals of a fee and
 * a payout are stated the same way on a Market path (cli ADR-0067).
 */

const flags = (model: string) => [
	...INCOME_FLAGS,
	"--return-model",
	model,
	"--paths",
	"5",
	"--seed",
	ILLUSTRATIVE_SEED,
	"--index",
	"2",
]

describe("projection path states the lifetime totals as projection run does", () => {
	it("states each Account's totals and the plan's fees, equal to the sums of the path's own figures", async () => {
		const { home, model } = await projectionLifetimeHome(true)
		const res = await projection(home, ["path", ...flags(model)])
		expect(res.err).toBe("")
		expect(res.code).toBe(0)
		const path = JSON.parse(res.out) as ProjectionPathView
		const annual = path.tables.find((table) => table.name === "annual")
		const fees = path.tables.find((table) => table.name === "fees")
		if (annual?.name !== "annual" || fees?.name !== "fees") throw new Error("a table is missing")
		expect(path.accountLifetimes).toHaveLength(1)
		expect(path.accountLifetimes?.[0]?.account).toBe("fund")
		const fund = path.accountLifetimes?.[0]
		expect(path.lifetimeFees).toBe(fund?.lifetimeFees)
		expect(satang([fund?.lifetimeFees ?? ""])).toBe(satang(fees.rows.map((row) => row.amount)))
		expect(satang([fund?.lifetimePayouts ?? ""])).toBe(
			satang(annual.rows.map((row) => row.payouts ?? "")),
		)
	})

	it("states none without a fee or a payout, and prints the labels in the human form", async () => {
		const bare = await projectionLifetimeHome(false)
		const none = await projection(bare.home, ["path", ...flags(bare.model)])
		expect(none.code).toBe(0)
		expect(none.out).not.toContain("accountLifetimes")
		expect(none.out).not.toContain("lifetimeFees")
		const full = await projectionLifetimeHome(true)
		const human = await capture(["projection", "path", ...flags(full.model)], {
			TRAJ_HOME: full.home,
		})
		expect(human.code).toBe(0)
		expect(human.out).toContain("Fees over the plan, all accounts:")
		expect(human.out).toContain("accountLifetimes (1 row)")
	})
})
