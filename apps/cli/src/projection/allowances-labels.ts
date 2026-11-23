import { type AppError, fail } from "../errors"

/** The `--labels` list: each label named once, none empty, in the order they fill. */
export function labelsOf(text: string): string[] | AppError {
	const labels = text.split(",").map((label) => label.trim())
	const empty = labels.indexOf("")
	if (empty !== -1) {
		return fail("invalid_input", {
			path: "labels",
			message: `--labels: item ${empty + 1} is empty. Name the contribution labels separated by commas, with no gap.`,
			hint: "Give --labels the labels in the order the allowances should fill, such as allowance.retirement.rmf,allowance.thai_esg.",
		})
	}
	const repeated = labels.find((label, index) => labels.indexOf(label) !== index)
	if (repeated !== undefined) {
		return fail("invalid_input", {
			path: "labels",
			message: `--labels: "${repeated}" is named twice.`,
			hint: "Name each label once, in the order it should fill.",
		})
	}
	return labels
}
