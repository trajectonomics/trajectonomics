import type { ThFilingStatus } from "../types"
import {
	TH_LEVY_READ_PREFIX,
	TH_LEVY_SHARED_FILER,
	type ThLevyFilerIds,
	thFilerLabel,
} from "./filers"
import type { ThLevyGraph } from "./graph"
import { ThLevyRounding } from "./graph-types"
import {
	TH_LEVY_CONTRIBUTION_LABELS,
	TH_LEVY_INCOME_LABELS,
	type ThLevyContributionLabel,
} from "./labels"
import { addIncomeTallies, addThLevyTallies, type ThLevyTallies } from "./tallies"

type Income = ThLevyTallies["income"]

/**
 * What a Levy reads, Filer by Filer and as one Return.
 *
 * Purpose: Lets the expense and retirement stages run once per Filer while every later stage
 * runs once on the sums.
 * Math: `total` is the sum of the `views`, so a shared satang is counted once.
 * Units: Measure ids over integer satang.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 42 bis, 57 sexies.
 */
export interface ThLevyScope {
	/** One entry per Filer; a Levy without Filers has one, the bare labels. */
	readonly views: readonly ThLevyTallies[]
	/** The whole Return; the only entry of `views` when there is one. */
	readonly total: ThLevyTallies
}

function mapRecord<K extends string>(
	labels: readonly K[],
	build: (label: K) => string,
): Readonly<Record<K, string>> {
	const record = {} as Record<K, string>
	for (const label of labels) record[label] = build(label)
	return record
}

function viewOf(graph: ThLevyGraph, filer: string, shared?: Income): ThLevyTallies {
	const own = addThLevyTallies(graph, (label) => thFilerLabel(label, filer))
	if (shared === undefined) return own
	const income = mapRecord(TH_LEVY_INCOME_LABELS, (label) =>
		graph.add(own.income[label], shared[label], `${TH_LEVY_READ_PREFIX}${filer}.${label}`),
	)
	return { income, contributions: own.contributions }
}

function sumViews(graph: ThLevyGraph, a: ThLevyTallies, b: ThLevyTallies): ThLevyTallies {
	return {
		income: mapRecord(TH_LEVY_INCOME_LABELS, (label) =>
			graph.add(a.income[label], b.income[label], `${TH_LEVY_READ_PREFIX}total.${label}`),
		),
		contributions: mapRecord<ThLevyContributionLabel>(TH_LEVY_CONTRIBUTION_LABELS, (label) =>
			graph.add(a.contributions[label], b.contributions[label]),
		),
	}
}

function halfOf(graph: ThLevyGraph, shared: Income): Income {
	return mapRecord(TH_LEVY_INCOME_LABELS, (label) =>
		graph.scale(shared[label], 1, 2, ThLevyRounding.Floor),
	)
}

function oneFiler(graph: ThLevyGraph, filer: string, status: ThFilingStatus): ThLevyScope {
	const shared = (): Income =>
		addIncomeTallies(graph, (label) => thFilerLabel(label, TH_LEVY_SHARED_FILER))
	let view: ThLevyTallies
	if (status === "married_separate") view = viewOf(graph, filer, halfOf(graph, shared()))
	else if (status === "married_joint") view = viewOf(graph, filer, shared())
	else view = viewOf(graph, filer)
	return { views: [view], total: view }
}

function twoFilers(graph: ThLevyGraph, first: string, second: string): ThLevyScope {
	const shared = addIncomeTallies(graph, (label) => thFilerLabel(label, TH_LEVY_SHARED_FILER))
	const half = halfOf(graph, shared)
	const rest = mapRecord(TH_LEVY_INCOME_LABELS, (label) => graph.sub(shared[label], half[label]))
	const a = viewOf(graph, first, half)
	const b = viewOf(graph, second, rest)
	return { views: [a, b], total: sumViews(graph, a, b) }
}

/**
 * Emits the tallies of a Levy's Filers, and the Return they add up to.
 *
 * Purpose: Reads each Filer's labels, plus the shared income as s.57 sexies para 2 says: half of it
 * on a separate Return, all of it on a joint Return, split half and half between two Filers. The
 * second Filer takes the odd satang, so the two halves add up to the whole.
 * Math: `view = own + share of shared`; `total = view(1) + view(2)`. A half is `floor(shared / 2)`.
 * Units: Measure ids over integer satang.
 * Throws: Nothing; the ids were validated.
 *
 * @param graph Measure graph being built.
 * @param filers Validated Filer ids, or `undefined` for the bare labels.
 * @param status Filing status, which decides how much of the shared income a Filer reads.
 * @statute Thailand Revenue Code Sections 42 bis, 57 sexies.
 */
export function addThLevyScope(
	graph: ThLevyGraph,
	filers: ThLevyFilerIds | undefined,
	status: ThFilingStatus,
): ThLevyScope {
	if (filers === undefined) {
		const bare = addThLevyTallies(graph)
		return { views: [bare], total: bare }
	}
	const [first, second] = filers
	return second === undefined ? oneFiler(graph, first, status) : twoFilers(graph, first, second)
}

/**
 * Lists the Tally labels a Levy with these Filers reads.
 *
 * Purpose: Lets a caller check that every labelled Flow is read by some Levy.
 * Math: No arithmetic.
 * Units: Dimensionless label strings.
 * Throws: TaxValidationError if a Filer id does not match `[a-z0-9-]{1,32}`.
 *
 * @param filers Filer ids; an empty list reads the bare labels.
 * @param status Filing status; only `married_separate` and `married_joint` read shared income.
 * @statute Thailand Revenue Code Section 57 sexies.
 */
export function thLevyTalliesFor(
	filers: readonly string[],
	status: ThFilingStatus = "single",
): { readonly income: readonly string[]; readonly contributions: readonly string[] } {
	if (filers.length === 0) {
		return { income: TH_LEVY_INCOME_LABELS, contributions: TH_LEVY_CONTRIBUTION_LABELS }
	}
	const readsShared = status === "married_separate" || status === "married_joint"
	const ids = readsShared ? [...filers, TH_LEVY_SHARED_FILER] : filers
	const labelsOf = (labels: readonly string[], ids: readonly string[]): string[] =>
		ids.flatMap((id) => labels.map((label) => thFilerLabel(label, id)))
	return {
		income: labelsOf(TH_LEVY_INCOME_LABELS, ids),
		contributions: labelsOf(TH_LEVY_CONTRIBUTION_LABELS, filers),
	}
}
