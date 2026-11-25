import { type AppError, fail, isAppError } from "../../errors"
import type { TaxPlanner } from "../../store"
import type { ScenarioDocument } from "../document"
import { fromStoredRequest, mergedRequest, taxRequestOf } from "./claims"
import { coupleOf } from "./couple"
import type { TaxRequest } from "./flags"
import { holdsTaxLevy } from "./holds"
import type { FlowLabel } from "./labels"
import { type TaxLevyWritten, withTaxLevy } from "./levy"
import { noStoredProfile, type TaxMode } from "./mode"
import { withoutTaxLevy } from "./remove"
import { canonicalTax, parsedTax, storedTaxOf } from "./stored"

/** What a write that wrote a Levy leaves for the reply. */
export type Written = TaxLevyWritten

/** The request a mode states for this plan: its own flags, or the stored profile they build on. */
function requestFor(
	mode: Exclude<TaxMode, { kind: "remove" }>,
	document: ScenarioDocument,
	stored: string | null,
	household: string | null,
): TaxRequest | AppError {
	const couple = coupleOf(household)
	if (mode.kind === "write") {
		const request = taxRequestOf(mode.flags, couple)
		if (isAppError(request)) return request
		if (request === null) {
			return fail("internal", { message: "A write mode stated no tax jurisdiction." })
		}
		return request
	}
	const profile = parsedTax(stored)
	if (profile === null) {
		return noStoredProfile(
			mode.kind === "merge" ? "--merge" : "--from-stored",
			holdsTaxLevy(document),
		)
	}
	return mode.kind === "merge"
		? mergedRequest(profile, mode.flags, couple)
		: fromStoredRequest(profile, couple)
}

/**
 * The change one call makes, read from the document and profile the store holds inside the write.
 * Whatever it builds is handed to `done`, so the reply can say what the Levy was written for.
 */
export function plannerOf(
	mode: TaxMode,
	labels: readonly FlowLabel[],
	done: (written: Written) => void,
): TaxPlanner {
	return (document, stored, household) => {
		if (mode.kind === "remove") return { document: withoutTaxLevy(document) ?? document, tax: null }
		const request = requestFor(mode, document, stored, household)
		if (isAppError(request)) return request
		const next = withTaxLevy(document, request, labels, household)
		if (isAppError(next)) return next
		done(next)
		return { document: next.document, tax: canonicalTax(storedTaxOf(next.request)) }
	}
}
