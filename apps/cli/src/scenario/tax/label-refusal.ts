import { type AppError, fail } from "../../errors"
import type { ScenarioDocument } from "../document"
import {
	mislabelledContributions,
	TAX_CONTRIBUTION_LABELS,
	TAX_INCOME_LABELS,
	unlabelledIncome,
} from "./labels"

/** The refusal for a document whose Flows tax-core would tally as nothing, or `null` when it is clear. */
export function labelRefusal(document: ScenarioDocument): AppError | null {
	const unlabelled = unlabelledIncome(document)
	if (unlabelled.length > 0) {
		return fail("invalid_input", {
			message: `With --tax, every income Flow needs a label from @trajectonomics/core/tax/th; ${
				unlabelled.length === 1 ? "one Flow has" : `${unlabelled.length} Flows have`
			} none this build recognises, so tax on them would be zero.`,
			path: "document",
			details: { flows: unlabelled, labels: TAX_INCOME_LABELS },
		})
	}
	if (mislabelledContributions(document).length > 0) {
		return fail("invalid_input", {
			message:
				"A contribution Flow carries a label tax-core does not read, so a retirement allowance would be silently missing.",
			path: "document",
			details: { flows: mislabelledContributions(document), labels: TAX_CONTRIBUTION_LABELS },
		})
	}
	return null
}
