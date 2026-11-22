import type { AccountRow, EntityRow, PostingRow, ScenarioRow, TxRow } from "./rows"

/** Every row of a lossless dump, by table, exactly as the list methods return them. */
export type RestoreRows = {
	entity: readonly EntityRow[]
	account: readonly AccountRow[]
	tx: readonly TxRow[]
	posting: readonly PostingRow[]
	scenario: readonly ScenarioRow[]
}
export type RestoreCounts = { [Table in keyof RestoreRows]: number }
