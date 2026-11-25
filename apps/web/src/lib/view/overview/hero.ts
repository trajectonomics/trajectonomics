import type { Fi, ProjectionChance, Read, Snapshot } from "../../contract"
import { type BestCaseView, fiModelOf, type UnreachableFi } from "../fi/model"
import { householdOf, type PersonNames, personNames } from "../item-names"
import { noteAnchor } from "../projection/notes"
import { homePlan } from "./scenario"

/** One note the CLI states that asks the reader to check something, with the anchor it lives at on the FI page. */
export interface HeroWarning {
	/** The note exactly as the CLI stated it. */
	readonly text: string
	/** The id of that note's entry in the FI page's NoteList. */
	readonly anchor: string
	/** A short label for the link that opens the note. */
	readonly label: string
}

/** Home's answer to "when could I stop working?", built only from Snapshot fields. */
export interface HeroView {
	/** The answer: the FI date and ages, then what the chance measured, or the CLI's best case. */
	readonly sentence: string
	/** The notes worth checking, in the CLI's order. */
	readonly warnings: readonly HeroWarning[]
	/** "1 thing to check", "2 things to check", or null when the CLI states none. */
	readonly warningsLabel: string | null
}

/**
 * The notes that report unfunded Contributions, an unmet amount or a tax assumption. The words are
 * the CLI's own (see `funding.ts`, `withdraw-notes.ts` and `levies.ts`); the page only recognises them.
 */
const WARNING_PATTERNS: readonly RegExp[] = [
	/could not be funded/,
	/could not fund/,
	/\bunmet on\b/,
	/^No tax is applied\b/,
	/tax year is charged on/,
	/^Tax before .* is not recomputed\b/,
]

/** What the CLI's success note begins with: the one sentence that says what the chance read measured. */
const CHANCE_SUCCESS_PREFIX = "The plan holds to "

/** Whether a note is one the hero counts as something to check. */
export function isWarningNote(note: string): boolean {
	return WARNING_PATTERNS.some((pattern) => pattern.test(note))
}

/** The hero of a Snapshot's plan, or null when it has no plan or no FI read to answer from. */
export function heroOf(snapshot: Snapshot, requested = ""): HeroView | null {
	const plan = homePlan(snapshot, requested)
	if (plan === null) return null
	const read = snapshot.reads.fi[plan]
	if (read === undefined || !read.ok) return null
	const warnings = warningsOf(read.data, plan)
	const people = personNames(householdOf(snapshot, plan))
	return {
		sentence: sentenceOf(read.data, people, snapshot.reads.chance[plan]),
		warnings,
		warningsLabel: warningsLabel(warnings.length),
	}
}

/** The answer's sentence: the FI date and each person's age, then what the chance read measured. */
function sentenceOf(
	fi: Fi,
	people: PersonNames,
	chance: Read<ProjectionChance> | undefined,
): string {
	const model = fiModelOf(fi, people)
	if (model.kind === "unreachable") return unreachableSentence(model)
	const opening =
		model.ages === null
			? `You could stop working in ${model.month}.`
			: `You could stop working in ${model.month}, at ${model.ages}.`
	const measured = chanceSentenceOf(chance)
	return measured === null ? opening : `${opening} ${measured}`
}

/**
 * What the chance result measured: the CLI's own success note when it states one, so the sentence never
 * says the FI date itself held. Otherwise the horizon and the counts, as the chance result gives them.
 */
function chanceSentenceOf(chance: Read<ProjectionChance> | undefined): string | null {
	if (chance === undefined || !chance.ok) return null
	const stated = chance.data.notes.find((note) => note.startsWith(CHANCE_SUCCESS_PREFIX))
	if (stated !== undefined) return stated
	return `Your plan as written holds to ${chance.data.horizon} in ${chance.data.succeeded} of ${chance.data.paths} simulated markets, which is not a guarantee.`
}

/** The unreachable answer: the horizon, the FI model's binding sentence and the CLI's best case, if any. */
function unreachableSentence(model: UnreachableFi): string {
	const opening = `You could not stop working before ${model.horizon}.`
	const parts = [opening, model.sentence]
	if (model.best !== null) parts.push(bestCaseSentence(model.best))
	return parts.join(" ")
}

/** What the CLI's best case says: when the money runs out, or when the buffer is breached. */
function bestCaseSentence(best: BestCaseView): string {
	if (best.kind === "runsOut") {
		return `If earned income stopped in ${best.month}, the money runs out on ${best.date}.`
	}
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

/** The count in words, or null when there is nothing to check. */
export function warningsLabel(count: number): string | null {
	if (count === 0) return null
	return count === 1 ? "1 thing to check" : `${count} things to check`
}
