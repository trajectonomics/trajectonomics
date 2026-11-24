import { formatMinorUnits, type PlannedWrite } from "../../store"
import { viewTransactionBody } from "../../tx/view"
import { ref } from "../view"
import type { ValueResult, ValueRow, ValuesResult } from "./schema"
import type { Valuation, ValuedRow } from "./types"

function rowOf(
	row: ValuedRow,
	written: PlannedWrite<Valuation>["written"],
	dryRun: boolean,
): ValueRow {
	const stored = row.write === null ? undefined : written[row.write]
	const currency = row.account.currency
	return {
		index: row.index,
		status: stored === undefined ? "unchanged" : "added",
		account: ref(row.account),
		date: row.date,
		before: formatMinorUnits(row.before, currency),
		value: formatMinorUnits(row.value, currency),
		difference: formatMinorUnits(row.difference, currency),
		transaction: stored === undefined ? null : viewTransactionBody(stored, dryRun),
		notes: row.notes,
	}
}

/** The rows in the order they were applied, each paired with the Transaction it wrote. */
export function viewRows(outcome: PlannedWrite<Valuation>, dryRun: boolean): ValueRow[] {
	return outcome.value.rows.map((row) => rowOf(row, outcome.written, dryRun))
}

export function viewValue(outcome: PlannedWrite<Valuation>, dryRun: boolean): ValueResult {
	const { index: _index, ...row } = viewRows(outcome, dryRun)[0]!
	return { dryRun, against: ref(outcome.value.against), ...row }
}

export function viewValues(
	outcome: PlannedWrite<Valuation>,
	file: string,
	dryRun: boolean,
): ValuesResult {
	const values = viewRows(outcome, dryRun)
	return {
		dryRun,
		file,
		against: ref(outcome.value.against),
		values,
		counts: {
			added: values.filter((row) => row.status === "added").length,
			unchanged: values.filter((row) => row.status === "unchanged").length,
		},
	}
}
