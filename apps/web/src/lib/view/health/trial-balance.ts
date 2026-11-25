/**
 * The note beside a trial balance whose totals are not stated, because a column's sum is past the safe
 * integer range (cli ADR 0079). The columns were still compared exactly, so the note says whether they
 * agree; the date is on the line above the note, so it is not repeated here.
 */
export function trialBalanceNote(balanced: boolean): string {
	const columns = balanced ? "Debits equal credits" : "Debits and credits disagree"
	return `${columns}, compared exactly; the totals exceed the safe range.`
}
