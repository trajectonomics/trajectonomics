import { type AppError, fail } from "../../errors"
import { SHARED } from "../household/model"
import type { FilerScope } from "./filer-scope"
import { flagOf, type NamedValue } from "./flags"
import { sharedNeedsSeparate } from "./shared-mortgage"

/** The refusal for per-Return claims with no separate Return to hold them, at the flag that stated one. */
function noFilers(field: string): AppError {
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)} names a person, but this plan has no separate Return to put the value on: it needs --filing-status married_separate and a household with a partner and Owners.`,
		hint: 'Add a partner and Owners with "traj scenario household", or state the value bare for the holder.',
	})
}

/** The refusal for a value on a person with no income, whom no Levy is written for. */
function noIncome({ field, person, bare }: NamedValue): AppError {
	const what = bare ? `a bare value names the holder "${person}", who` : `"${person}"`
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)}: ${what} has no taxed Flow or Account in this plan, so no Return is written to put the value on.`,
		hint: `Name "${person}" or "shared" as an Owner of a taxed item with "traj scenario household", put the value on the person who has income, or leave it out.`,
	})
}

/**
 * Refuses a value that no written Return would carry (cli ADR-0075): one naming a person, or the
 * shared loan, where no separate Return is written, and one for a person, bare for the holder
 * included, with no Return. Any separate Return claims a share of the shared loan.
 */
export function personRefusal(
	named: readonly NamedValue[] | undefined,
	scope: FilerScope | null,
): AppError | null {
	if (scope?.kind !== "separate") {
		const first = named?.find((value) => !value.bare)
		if (first === undefined) return null
		return first.person === SHARED ? sharedNeedsSeparate() : noFilers(first.field)
	}
	const stray = named?.find(
		(value) => value.person !== SHARED && !scope.filers.includes(value.person),
	)
	return stray === undefined ? null : noIncome(stray)
}
