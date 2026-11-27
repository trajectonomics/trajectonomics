import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import type { CarryInRecordForm } from "./carryin"
import { withCarryIn } from "./carryin-apply"
import { compareOf } from "./compare"
import type { CompareView } from "./compare-view"
import type { Prepare } from "./leaf"

/** The flags one compare states, as the command's own input schema declares them. */
type CompareFlags = {
	a: string
	b?: string | undefined
	set?: readonly string[] | undefined
	without?: readonly string[] | undefined
	add?: readonly string[] | undefined
	decimal?: boolean | undefined
	birthDate?: string | undefined
	asOf: string
}

/**
 * The what-if applies the Overrides to A and is compared with A; a second Scenario is compared as
 * stored.
 */
function secondSide(flags: CompareFlags, prepare: Prepare): ReturnType<Prepare> {
	if (flags.b !== undefined) {
		return prepare({ scenario: flags.b, scenarioPath: "b", sets: [], readHousehold: false })
	}
	return prepare({
		scenario: flags.a,
		scenarioPath: "a",
		sets: flags.set ?? [],
		without: flags.without ?? [],
		add: flags.add ?? [],
		decimal: flags.decimal ?? false,
		readHousehold: false,
	})
}

/** Both sides prepared and placed, then compared: a what-if reuses A's Scenario and its record. */
export function compared(input: {
	input: CompareFlags
	records: readonly CarryInRecordForm[]
	ages: readonly number[]
	prepare: Prepare
}): CompareView | AppError {
	const { prepare } = input
	const a = prepare({ scenario: input.input.a, scenarioPath: "a", sets: [], readHousehold: false })
	if (isAppError(a)) return a
	const b = secondSide(input.input, prepare)
	if (isAppError(b)) return b
	const placed = withCarryIn({
		sides: [a, b],
		records: input.records,
		asOf: input.input.asOf,
		currency: a.currency,
	})
	if (isAppError(placed)) return placed
	const [sideA, sideB] = placed
	if (sideA === undefined || sideB === undefined) {
		return fail("internal", { message: "A compare prepared fewer than two sides." })
	}
	return compareOf({
		a: sideA,
		b: sideB,
		birthDate: input.input.birthDate ?? null,
		ages: input.ages,
	})
}
