import { fromMinorUnits, toMinorUnits } from "@trajectonomics/core/money"
import { type AppError, fail } from "../../errors"
import { SHARED } from "../household/model"
import type { Stated } from "./claims-values"
import type { NamedValue, TaxRequest } from "./flags"

/*
 * Interest on one loan borrowed together, which the caller states as
 * `--mortgage-interest shared=<amount>` (cli ADR-0075). Each separate Return claims its share with
 * its own interest, and tax-core checks the shares against the loan's one ceiling (tax ADR-0010).
 */

const FIELD = "mortgageInterest"

/** The call's values without the shared loan's interest, and that interest when the call states it. */
export function takeShared(stated: Stated): { own: Stated; shared: number | undefined } {
	const values = stated.get(FIELD)
	const shared = values?.get(SHARED)
	if (values === undefined || shared === undefined) return { own: stated, shared: undefined }
	const rest = new Map([...values].filter(([person]) => person !== SHARED))
	return { own: new Map(stated).set(FIELD, rest), shared }
}

/** The refusal for the shared loan's interest where no separate Return could claim a share of it. */
export function sharedNeedsSeparate(): AppError {
	return fail("invalid_input", {
		path: FIELD,
		message: `--mortgage-interest: "${SHARED}=" states interest on one loan borrowed together, which needs --filing-status married_separate and a household with a partner and Owners.`,
		hint: "File separately with a partner and Owners in the household, or state the interest bare, as the one Return's own.",
	})
}

/**
 * Puts the shared loan's interest on a request: the call's, else the one its base keeps. A call's is
 * also named, so a write with no separate Return refuses it.
 */
export function withShared(
	request: TaxRequest,
	shared: number | undefined,
	base: TaxRequest | undefined,
	named: NamedValue[],
): TaxRequest {
	const interest = shared ?? base?.sharedMortgageInterest
	if (shared !== undefined) named.push({ field: FIELD, person: SHARED })
	return {
		...request,
		...(interest === undefined ? {} : { sharedMortgageInterest: interest }),
		...(named.length === 0 ? {} : { named }),
	}
}

/**
 * Each Filer's share of the shared interest in satang, in the Filers' order, the holder first: half
 * each, the odd satang to the holder. A sole Filer claims it all, because a borrower with no income
 * claims nothing (s.47(1)(ซ), tax research on separate filing).
 */
export function sharedShares(request: TaxRequest, filers: number): number[] {
	const total = toMinorUnits(request.sharedMortgageInterest ?? 0, 2)
	if (filers < 2) return [total]
	const half = (total - (total % 2)) / 2
	return [total - half, half]
}

/** The interest one Return claims: its own, with its share in satang of the loan borrowed together. */
export function withShare(own: number, share: number): number {
	return share === 0 ? own : fromMinorUnits(toMinorUnits(own, 2) + share, 2)
}
