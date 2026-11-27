import type {
	Fi,
	HouseholdDocument,
	PersonAge,
	ProjectionChance,
	ProjectionRun,
	Read,
} from "../../contract"
import { formatDate, formatMonth } from "../../format"
import { chanceSummaryOf } from "../chance/page"
import { annualRowsOf } from "./annual"
import { headlineOf } from "./headline"

/** One person on the Plan's people row: their id and the age the CLI states for the first year, or null. */
export interface PlanPerson {
	readonly id: string
	readonly age: number | null
}

/** The three figures the Plan opens with, each null when the Snapshot does not state it. */
export interface PlanStats {
	/** The month earned income could stop, and the day the FI read states. */
	readonly stopWorking: { readonly month: string; readonly date: string } | null
	/** The last annual row's closing net worth in future money, and the year it ends in. */
	readonly closing: { readonly amount: string; readonly year: string } | null
	/** The chance of success, through `trimPercent`, such as "96.5%". */
	readonly chance: string | null
}

/** The household's people, each with the age the first annual row states for them. A person it does not state has no age. */
export function planPeople(
	household: HouseholdDocument | null,
	ages: readonly PersonAge[],
): PlanPerson[] {
	const byPerson = new Map(ages.map((entry) => [entry.person, entry.age]))
	return (household?.people ?? []).map((person) => ({
		id: person.id,
		age: byPerson.get(person.id) ?? null,
	}))
}

/** The Plan's figures from the Reads the Snapshot holds. Every figure is the CLI's string, and none is computed here. */
export function planStats(
	fi: Read<Fi> | undefined,
	chance: Read<ProjectionChance> | undefined,
	run: ProjectionRun,
): PlanStats {
	const closing = headlineOf(run)
	const answer = fi?.ok === true ? fi.data.fi : null
	return {
		stopWorking:
			answer?.reachable === true
				? { month: formatMonth(answer.fiDate), date: formatDate(answer.fiDate) }
				: null,
		closing:
			closing === null ? null : { amount: closing.closing.amount, year: closing.horizonYear },
		chance: chance?.ok === true ? chanceSummaryOf(chance.data).share : null,
	}
}

/** The first annual row's ages, as the Plan's people row reads them. Empty when the projection has no row. */
export function firstAges(run: ProjectionRun): readonly PersonAge[] {
	return annualRowsOf(run)[0]?.ages ?? []
}
