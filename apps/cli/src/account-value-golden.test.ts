import { describe, expect, it } from "bun:test"
import { chartHome, value } from "./account-value-support"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { cli } from "./tx-test-support"

/*
 * `account value`'s bytes in both result shapes, pinned (cli ADR-0071) and decoded by the Dashboard's
 * contract. Re-baseline deliberately with TRAJ_UPDATE_GOLDEN=1 bun test src/account-value-golden.test.ts
 */
const GOLDENS = new URL("./account/value/fixtures/", import.meta.url)
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const STAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g

/** The command's bytes with each minted id and timestamp replaced by a stable token. */
function stable(text: string): string {
	const seen = new Map<string, string>()
	const token = (id: string) => {
		if (!seen.has(id)) seen.set(id, `id-${seen.size + 1}`)
		return seen.get(id)!
	}
	return `${text.replace(UUID, token).replace(STAMP, "2026-01-01T00:00:00.000Z")}\n`
}

async function expectGolden(name: string, text: string): Promise<void> {
	await recordGoldenTextIn(GOLDENS, name, text)
	expect(text).toBe(await goldenTextIn(GOLDENS, name))
}

describe("account value is pinned by goldens", () => {
	it("pins one value, with the note a later valuation brings", async () => {
		const { traj } = await chartHome()
		await value(traj, "Fund", "1500.00", "2026-04-01")
		const res = await value(traj, "Fund", "1000.00", "2026-03-01")
		expect(res.code).toBe(0)
		await expectGolden("value.output", stable(res.out))
	})

	it("pins a batch, an unchanged entry included", async () => {
		const { home, traj } = await chartHome()
		await value(traj, "Fund", "100.00", "2026-01-10")
		const text = JSON.stringify({
			against: "Gains",
			values: [
				{ account: "Loan", date: "2026-03-01", value: "800.00" },
				{ account: "Fund", date: "2026-01-10", value: "100.00" },
				{ account: "Fund", date: "2026-02-10", value: "150.00" },
			],
		})
		const res = await cli(home, text)(["account", "value", "--file", "-", "--json"])
		expect(res.code).toBe(0)
		await expectGolden("values.output", stable(res.out))
	})
})
