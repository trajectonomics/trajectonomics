import type { Fi, HouseholdDocument, ProjectionChance, Read, Snapshot } from "../../contract"
import { chanceLasts } from "../chance/words"
import { type BestCaseView, fiModelOf, type UnreachableFi } from "../fi/model"
import { householdOf, type PersonNames, personNames } from "../item-names"
import { noteAnchor } from "../projection/notes"
import { homePlan } from "./scenario"
import { isWarningNote } from "./warning-notes"

/** One note the CLI states that asks the reader to check something, with the anchor it lives at on the FI page. */
export interface HeroWarning {
	/** The note exactly as the CLI stated it. */
	readonly text: string
	/** The id of that note's entry in the FI page's NoteList. */
	readonly anchor: string
	/** A short label for the link that opens the note. */
	readonly label: string
}

/** The line below the answer: the label, then the CLI's note on the plan as written. */
export interface PlanNote {
	/** The words that label the note: "Your plan as written:". */
	readonly label: string
	/** The CLI's note, or the chance's own horizon and counts when it states none; `fromCli` says which. */
	readonly text: string
	readonly fromCli: boolean
}

/** Home's answer to "when could I stop working?", built only from Snapshot fields. */
export interface HeroView {
	/** The answer: the FI date and the holder's and partner's ages. */
	readonly sentence: string
	/** The plan-as-written line below the answer, or null when no chance read states one. */
	readonly planNote: PlanNote | null
	/** The notes worth checking, in the CLI's order. */
	readonly warnings: readonly HeroWarning[]
	/** "1 thing to check", "2 things to check", or null when the CLI states none. */
	readonly warningsLabel: string | null
}

/** What the CLI's success note begins with: the one sentence that says what the chance read measured. */
export const SUCCESS_NOTE_PREFIX = "The plan holds to "

/** The hero of a Snapshot's plan, or null when it has no plan or no FI read to answer from. */
export function heroOf(snapshot: Snapshot, requested = ""): HeroView | null {
	const plan = homePlan(snapshot, requested)
	if (plan === null) return null
	const read = snapshot.reads.fi[plan]
	if (read === undefined || !read.ok) return null
	const household = householdOf(snapshot, plan)
	const people = personNames(household)
	const warnings = warningsOf(read.data, plan)
	return {
		sentence: sentenceOf(read.data, household, people),
		planNote: planNoteOf(snapshot.reads.chance[plan]),
		warnings,
		warningsLabel: warningsLabel(warnings.length),
	}
}

/** The answer's sentence: the FI date and the holder's and partner's ages, never the chance note. */
function sentenceOf(fi: Fi, household: HouseholdDocument | null, people: PersonNames): string {
	const model = fiModelOf(fi, people)
	if (model.kind === "unreachable") return unreachableSentence(model)
	const ages = agesClauseOf(fi, household, people)
	return ages === null
		? `You could stop working in ${model.month}.`
		: `You could stop working in ${model.month}, ${ages}.`
}

/** "when you are 50 and your partner is 48": the holder and partner only, by the role words the lookup states. */
function agesClauseOf(
	fi: Fi,
	household: HouseholdDocument | null,
	people: PersonNames,
): string | null {
	if (!fi.fi.reachable) return null
	const roles = new Map((household?.people ?? []).map((person) => [person.id, person.role]))
	const parts: string[] = []
	for (const entry of fi.fi.ages) {
		const role = roles.get(entry.person)
		if (role !== "holder" && role !== "partner") continue
		const subject = people.get(entry.person)?.subject ?? entry.person
		parts.push(`${subject} ${subject === "you" ? "are" : "is"} ${entry.age}`)
	}
	return parts.length === 0 ? null : `when ${andList(parts)}`
}

/** The parts as one list: "a", "a and b", "a, b and c". */
function andList(parts: readonly string[]): string {
	if (parts.length === 1) return parts[0] ?? ""
	return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

/** The plan-as-written line: the CLI's success note when it states one, else the chance's horizon and counts. */
function planNoteOf(chance: Read<ProjectionChance> | undefined): PlanNote | null {
	if (chance === undefined || !chance.ok) return null
	const stated = chance.data.notes.find((note) => note.startsWith(SUCCESS_NOTE_PREFIX))
	const text = stated ?? chanceLasts(chance.data.succeeded, chance.data.paths, chance.data.horizon)
	return { label: "Your plan as written:", text, fromCli: stated !== undefined }
}

/** The unreachable answer: the horizon, the FI model's binding sentence and the CLI's best case, if any. */
function unreachableSentence(model: UnreachableFi): string {
	const parts = [`You could not stop working before ${model.horizon}.`, model.sentence]
	if (model.best !== null) parts.push(bestCaseSentence(model.best))
	return parts.join(" ")
}

/** What the CLI's best case says: when the money runs out, or when the buffer is breached. */
function bestCaseSentence(best: BestCaseView): string {
	if (best.kind === "runsOut")
		return `If earned income stopped in ${best.month}, the money runs out on ${best.date}.`
	return `If earned income stopped in ${best.month}, accessible net worth falls short of the buffer on ${best.date}.`
}

/** The warning notes, each with the anchor its entry has on the FI page. */
function warningsOf(fi: Fi, plan: string): HeroWarning[] {
	const warnings: HeroWarning[] = []
	fi.notes.forEach((note, index) => {
		if (!isWarningNote(note)) return
		warnings.push({
			text: note,
			anchor: noteAnchor(plan, index),
			label: `Note ${warnings.length + 1}`,
		})
	})
	return warnings
}

export function warningsLabel(count: number): string | null {
	return count === 0 ? null : count === 1 ? "1 thing to check" : `${count} things to check`
}
