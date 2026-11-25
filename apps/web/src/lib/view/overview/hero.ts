import type { Fi, ProjectionChance, Read, Snapshot } from "../../contract"
import { formatDate, formatMonth } from "../../format"
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
	/** The one-sentence answer, or the CLI's best case when FI is not reachable. */
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
	return {
		sentence: sentenceOf(read.data, snapshot.reads.chance[plan], holderId(snapshot, plan)),
		warnings,
		warningsLabel: warningsLabel(warnings.length),
	}
}

/** The household's account holder id, or null when the Snapshot holds no household for the plan. */
function holderId(snapshot: Snapshot, plan: string): string | null {
	const read = snapshot.reads.documents[plan]
	if (read === undefined || !read.ok) return null
	const people = read.data.scenario.household?.people ?? []
	return people.find((person) => person.role === "holder")?.id ?? null
}

/** The answer's sentence: the month and the holder's age, then the share that held, or the best case. */
function sentenceOf(
	fi: Fi,
	chance: Read<ProjectionChance> | undefined,
	holder: string | null,
): string {
	const result = fi.fi
	if (!result.reachable) return unreachableSentence(fi)
	const month = formatMonth(result.fiDate)
	const age = result.ages.find((entry) => entry.person === holder)?.age ?? null
	const opening =
		age === null
			? `You could stop working in ${month}.`
			: `You could stop working in ${month}, at ${age}.`
	if (chance === undefined || !chance.ok) return opening
	return `${opening} It held in ${chance.data.succeeded} of ${chance.data.paths} simulated markets, which is not a guarantee.`
}

/** The unreachable answer, with the CLI's best case when it states one (its amounts are left to its notes). */
function unreachableSentence(fi: Fi): string {
	const result = fi.fi
	if (result.reachable) return ""
	const opening = `You could not stop working before ${formatDate(fi.horizon)}.`
	if (!("bestCase" in result)) return opening
	const best = result.bestCase
	if ("runsOut" in best) {
		return `${opening} If earned income stopped in ${formatMonth(best.month)}, the money runs out on ${formatDate(best.runsOut.date)}.`
	}
	return `${opening} If earned income stopped in ${formatMonth(best.month)}, accessible net worth falls short of the buffer on ${formatDate(best.bufferBreach.date)}.`
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
