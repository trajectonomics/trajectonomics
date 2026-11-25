import { type AppError, fail } from "../../errors"
import type { FilerScope } from "./filer-scope"
import { flagOf, type NamedValue } from "./flags"

/** The refusal for per-Return claims with no separate Return to hold them, at the flag that stated one. */
function noFilers(field: string): AppError {
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)} names a person, but this plan has no separate Return to put the value on: it needs --filing-status married_separate and a household with a partner and Owners.`,
		hint: 'Add a partner and Owners with "traj scenario household", or state the value bare for the holder.',
	})
}

/** The refusal for a value on a person with no income, whom no Levy is written for. */
function noIncome({ field, person }: NamedValue): AppError {
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)}: "${person}" has no taxed Flow or Account in this plan, so no Return is written to put the value on.`,
		hint: `Name "${person}" or "shared" as an Owner of a taxed item with "traj scenario household", or leave the value out.`,
	})
}

/** Refuses a person-qualified value that no written Return would carry (cli ADR-0075). */
export function personRefusal(
	named: readonly NamedValue[] | undefined,
	scope: FilerScope | null,
): AppError | null {
	const [first] = named ?? []
	if (first === undefined) return null
	if (scope?.kind !== "separate") return noFilers(first.field)
	const stray = named?.find((value) => !scope.filers.includes(value.person))
	return stray === undefined ? null : noIncome(stray)
}
