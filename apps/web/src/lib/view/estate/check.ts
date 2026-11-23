/**
 * The shape checks of the estate form: each text that is not a shape `traj` may take is a problem at its field. The CLI
 * checks the rest (a share above 100%, an unknown Account, a liability as a base) in its own words (cli ADR 0064).
 */
import { parseBps } from "../../format/bps"
import { slugId, typedAmount } from "../plan-items/form"
import { percentText } from "../withdrawals/check"
import { type EstateDraft, fieldKey, type LineDraft, type ListName } from "./draft"

const ROUNDINGS = ["floor", "halfUp", "ceil"]
const ID_SHAPE = /^[a-z0-9][a-z0-9_-]*$/i
const RATE_WORDS = "Enter a percent with at most two places, such as 1 or 2.5."
const AMOUNT_WORDS = "Enter an amount as a decimal number, such as 50000.00."

/** The id a line is saved under: its own, or the one made from the name typed. */
export function idOf(line: LineDraft): string {
	return line.id !== "" ? line.id : slugId(line.name)
}

/** The problem of a line's name: a new line needs one that makes a valid id nobody else has. */
function nameProblem(
	line: LineDraft,
	taken: readonly string[],
	list: ListName,
): string | undefined {
	if (line.id !== "") return undefined
	const id = slugId(line.name)
	const noun = list === "costs" ? "cost" : "gift"
	if (id === "") return `Name this ${noun}, such as settlement.`
	if (!ID_SHAPE.test(id)) return "Use letters, digits and dashes in the name."
	// A refusal names a line by its id or its place; a name of digits only could be read as a place.
	if (/^\d+$/.test(id))
		return "Use at least one letter in the name, so it is not taken for a number."
	return taken.filter((one) => one === id).length > 1
		? "Another line already has this name."
		: undefined
}

type Found = [string, string][]

/** The problems of a share: its percent, its rounding and, for a cost, its base. */
function shareProblems(line: LineDraft, list: ListName): Found {
	const found: Found = []
	if (percentText(line.share) === null) found.push(["share", RATE_WORDS])
	if (!ROUNDINGS.includes(line.rounding))
		found.push(["rounding", "Choose how the share rounds to a minor unit."])
	if (list === "gifts") return found
	if (line.of === "") found.push(["of", "Choose what the share is of."])
	if (line.of === "accounts" && line.accounts.length === 0)
		found.push(["accounts", "Choose at least one Account."])
	return found
}

/** The problems of a fixed amount: its amount and how it grows. */
function fixedProblems(line: LineDraft): Found {
	const found: Found = []
	if (typedAmount(line.amount) === null) found.push(["amount", AMOUNT_WORDS])
	if (line.growth !== "inflation" && line.growth !== "fixed")
		found.push(["growth", "Choose how the amount grows each year."])
	if (line.growth === "fixed" && parseBps(line.rate) === null) found.push(["rate", RATE_WORDS])
	return found
}

/** The problems of a line's way of being set. */
function amountProblems(line: LineDraft, list: ListName): Found {
	if (line.how === "share") return shareProblems(line, list)
	if (line.how === "fixed") return fixedProblems(line)
	return [["how", "Choose a share or a fixed amount."]]
}

/** The problems a draft has at its fields, keyed as `fieldKey` names them. */
export function problemsOf(draft: EstateDraft): Map<string, string> {
	const found = new Map<string, string>()
	const taken = [...draft.costs, ...draft.gifts].map(idOf)
	for (const list of ["costs", "gifts"] as const) {
		draft[list].forEach((line, index) => {
			const name = nameProblem(line, taken, list)
			if (name !== undefined) found.set(fieldKey(list, index, "name"), name)
			for (const [field, text] of amountProblems(line, list))
				found.set(fieldKey(list, index, field), text)
		})
	}
	return found
}
