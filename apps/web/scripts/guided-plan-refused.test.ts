// A guided plan's two failure paths, each with the workspace `traj` behind a wrapper that refuses the household
// write: the household's own error after the plan is removed, and `guided_plan_half_saved` when the removal is
// refused too (web ADR 0031). The dry run always goes through, so only the real household write is refused.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { accountList, scenarioList } from "../src/lib/contract"
import { type GuidedEdit, guidedEditSchema } from "../src/lib/edit/guided-edit"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import {
	AS_OF,
	disposeGuidedLedger,
	guidedEnv,
	setupGuidedLedger,
	trajText,
} from "./guided-ledger.test-support"
import type { RunContext } from "./run-traj"
import { runEdit } from "./serve-apply"

/** A `traj` around the workspace binary: the dry household write passes, the real one names no plan. */
const REFUSED = `
if [ "$1" = scenario ] && [ "$2" = household ]; then
	case " $* " in
		*" --dry-run "*) ;;
		*) exec "$TRAJ_REAL" scenario household zz-no-such-plan --file - --json ;;
	esac
fi
if [ "$1" = scenario ] && [ "$2" = rm ] && [ -n "$RM_FAIL" ]; then
	exec "$TRAJ_REAL" scenario rm zz-no-such-plan --json
fi
exec "$TRAJ_REAL" "$@"
`

/** The one person of the household: a holder who stops working at 60. */
const ME = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 } as const

let salary = ""
let food = ""

/** A guided plan's answers, from the two rows the ledger states. */
function editOf(name: string): GuidedEdit {
	return guidedEditSchema.parse({
		kind: "start-guided-plan",
		name,
		asOf: AS_OF,
		money: {
			from: "history",
			rows: [
				{ id: salary, keep: true },
				{ id: food, keep: true },
			],
		},
		people: [ME],
		stopWork: { person: "me", age: 60 },
	})
}

/** The run behind the wrapper; `rmFail` refuses the removal as well as the household. */
function contextOf(rmFail = false): RunContext {
	return {
		binary: "/bin/sh",
		prefix: ["-c", REFUSED, "traj"],
		env: { ...guidedEnv(), TRAJ_REAL: BINARY, RM_FAIL: rmFail ? "1" : undefined },
	}
}

/** Every stored plan, as traj lists it. */
async function list() {
	return scenarioList.parse(JSON.parse(await trajText(["scenario", "list", "--json"]))).scenarios
}

beforeAll(async () => {
	await setupGuidedLedger()
	const accounts = accountList.parse(
		JSON.parse(await trajText(["account", "list", "--json"])),
	).accounts
	const idOf = (name: string) => {
		const account = accounts.find((one) => one.name === name)
		if (account === undefined) throw new Error(`the fixture ledger has no ${name}`)
		return account.id
	}
	salary = idOf("Salary")
	food = idOf("Food")
}, SLOW_MS)

afterAll(disposeGuidedLedger)

describe("a guided plan whose household write is refused", () => {
	test(
		"the plan is removed, and the household's own error is answered",
		async () => {
			const before = await list()
			const refused = await runEdit(contextOf(), editOf("refused-household"))
			expect(refused.ok).toBe(false)
			if (!refused.ok) {
				expect(refused.error.code).toBe("not_found")
				expect(refused.error.message).toBe('No scenario matches "zz-no-such-plan".')
			}
			expect(await list()).toEqual(before)
		},
		SLOW_MS,
	)

	test(
		"a removal refused too answers guided_plan_half_saved, and the plan is still listed",
		async () => {
			const half = await runEdit(contextOf(true), editOf("half-saved"))
			expect(half.ok).toBe(false)
			if (!half.ok) {
				expect(half.error).toEqual({
					code: "guided_plan_half_saved",
					exitCode: 1,
					message:
						"The plan half-saved was saved without its household. Delete it on Plans, then try again.",
				})
			}
			expect((await list()).map((plan) => plan.name)).toContain("half-saved")
		},
		SLOW_MS,
	)
})
