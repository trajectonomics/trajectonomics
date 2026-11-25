import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, SAVINGS, taxCouple } from "./scenario-tax-filers-support"
import {
	amend,
	BARE_PLAN,
	BONUS_LABELS,
	BONUS_OWNERS,
	documentOf,
	flowOf,
	refile,
} from "./scenario-tax-separate-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

/* Which Prepayments a tax write moves, and where to (cli ADR-0075). */

const PIT = "th-2026-pit"

/** The couple's salaries and shared bonus, taxed jointly. */
async function jointHome(): Promise<string> {
	const home = await couple(BARE_PLAN, coupleHousehold(BONUS_OWNERS))
	expect((await taxCouple(home, "married_joint", BONUS_LABELS)).code).toBe(0)
	return home
}

const share = (levy: string, bps: number) => ({ levy, bps })
const capped = (levy: string, bps: number, upTo: string) => ({ levy, bps, upTo })

describe("a separate Return's Prepayments", () => {
	it("moves each to its Owner's Levy, halves a shared one, and joins the halves again", async () => {
		const home = await jointHome()
		await amend(home, {
			salary: { prepayments: [share(PIT, 500)] },
			"partner-salary": { prepayments: [share(PIT, 300)] },
			bonus: { prepayments: [share(PIT, 101)] },
		})
		const joint = await documentOf(home)
		await refile(home, "married_separate")
		const document = await documentOf(home)
		expect(flowOf(document, "salary")["prepayments"]).toEqual([share(`${PIT}@me`, 500)])
		expect(flowOf(document, "partner-salary")["prepayments"]).toEqual([
			share(`${PIT}@partner`, 300),
		])
		expect(flowOf(document, "bonus")["prepayments"]).toEqual([
			share(`${PIT}@me`, 51),
			share(`${PIT}@partner`, 50),
		])
		await refile(home, "married_joint")
		expect((await documentOf(home))["flows"]).toEqual(joint["flows"])
	})

	it("leaves another Levy's Prepayments, plain and capped, where they are", async () => {
		const home = await jointHome()
		await amend(
			home,
			{
				salary: { prepayments: [share("sso", 200)] },
				"partner-salary": { cappedPrepayment: capped("sso", 400, "base") },
				bonus: { prepayments: [share("sso", 100), share(PIT, 300)] },
			},
			["sso"],
		)
		const joint = await documentOf(home)
		await refile(home, "married_separate")
		const document = await documentOf(home)
		expect(flowOf(document, "salary")["prepayments"]).toEqual([share("sso", 200)])
		expect(flowOf(document, "partner-salary")["cappedPrepayment"]).toEqual(
			capped("sso", 400, "base"),
		)
		expect(flowOf(document, "bonus")["prepayments"]).toEqual([
			share("sso", 100),
			share(`${PIT}@me`, 150),
			share(`${PIT}@partner`, 150),
		])
		await refile(home, "married_joint")
		expect((await documentOf(home))["flows"]).toEqual(joint["flows"])
	})

	it("keeps a shared Flow's capped Prepayment whole on the holder's Levy", async () => {
		const home = await jointHome()
		await amend(home, { bonus: { cappedPrepayment: capped(PIT, 101, "credit.dividend") } })
		await refile(home, "married_separate")
		expect(flowOf(await documentOf(home), "bonus")["cappedPrepayment"]).toEqual(
			capped(`${PIT}@me`, 101, "credit.dividend"),
		)
		await refile(home, "married_joint")
		expect(flowOf(await documentOf(home), "bonus")["cappedPrepayment"]).toEqual(
			capped(PIT, 101, "credit.dividend"),
		)
	})

	it("keeps a shared entry of no basis points through a switch and back", async () => {
		const home = await jointHome()
		await amend(home, { bonus: { prepayments: [share(PIT, 0)] } })
		await refile(home, "married_separate")
		await refile(home, "married_joint")
		expect(flowOf(await documentOf(home), "bonus")["prepayments"]).toEqual([share(PIT, 0)])
	})

	it("moves an Account payout's Prepayments as a Flow's", async () => {
		const home = await jointHome()
		const before = await documentOf(home)
		const payout = {
			bps: 100,
			frequency: "annual",
			rounding: "halfUp",
			label: "income.section40_4.dividends@shared",
			prepayments: [share(PIT, 1000)],
		}
		const accounts = (before["accounts"] as Record<string, unknown>[]).map((account) =>
			account["id"] === SAVINGS ? { ...account, payout } : account,
		)
		expect((await applyScenario(home, "base", { ...before, accounts })).code).toBe(0)
		const paying = async () =>
			((await documentOf(home))["accounts"] as Record<string, unknown>[]).find(
				(account) => account["id"] === SAVINGS,
			)?.["payout"]
		await refile(home, "married_separate")
		expect(await paying()).toMatchObject({
			prepayments: [share(`${PIT}@me`, 500), share(`${PIT}@partner`, 500)],
		})
		await refile(home, "married_joint")
		expect(await paying()).toEqual(payout)
	})
})

describe("the Prepayments of a plan without Filers", () => {
	it("keeps their order, so writing the tax again changes no byte", async () => {
		const home = await couple(BARE_PLAN, null)
		expect((await taxCouple(home, "single", BONUS_LABELS)).code).toBe(0)
		const prepayments = [share(PIT, 500), share("national", 300)]
		await amend(home, { salary: { prepayments } }, ["national"])
		const again = await scenario(home, ["tax", "base", "--from-stored"])
		expect(again.code, again.err).toBe(0)
		expect(resultOf(again)).toMatchObject({ status: "unchanged" })
		expect(flowOf(await documentOf(home), "salary")["prepayments"]).toEqual(prepayments)
	})
})
