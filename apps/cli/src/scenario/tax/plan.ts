import { type AppError, isAppError } from "../../errors"
import type { TaxPlanner } from "../../store"
import type { ScenarioDocument } from "../document"
import type { TaxRequest } from "./flags"
import { holdsTaxLevy } from "./holds"
import type { FlowLabel } from "./labels"
import { withTaxLevy } from "./levy"
import { mergedRequest, noStoredProfile, type TaxMode } from "./mode"
import { withoutTaxLevy } from "./remove"
import { canonicalTax, parsedTax, requestOfStored, storedTaxOf } from "./stored"

/** What a write that wrote a Levy leaves for the reply: the request it built and the document it wrote. */
export type Written = { request: TaxRequest; document: ScenarioDocument }

/** The request a mode states for this plan: its own flags, or the stored profile they build on. */
function requestFor(
	mode: Exclude<TaxMode, { kind: "remove" }>,
	document: ScenarioDocument,
	stored: string | null,
): TaxRequest | AppError {
	if (mode.kind === "write") return mode.request
	const profile = parsedTax(stored)
	if (profile === null) {
		return noStoredProfile(
			mode.kind === "merge" ? "--merge" : "--from-stored",
			holdsTaxLevy(document),
		)
	}
	return mode.kind === "merge" ? mergedRequest(profile, mode.flags) : requestOfStored(profile)
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
	return (document, stored) => {
		if (mode.kind === "remove") return { document: withoutTaxLevy(document) ?? document, tax: null }
		const request = requestFor(mode, document, stored)
		if (isAppError(request)) return request
		const next = withTaxLevy(document, request, labels)
		if (isAppError(next)) return next
		done({ request, document: next })
		return { document: next, tax: canonicalTax(storedTaxOf(request)) }
	}
}
