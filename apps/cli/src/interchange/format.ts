import type { AccountRow, EntityRow, PostingRow, ScenarioRow, TxRow } from "../store"

/** Bumped when an existing field changes meaning; adding a field keeps it (ADR-0017). */
export const FORMAT_VERSION = 1

/**
 * How a field is written and read back. `time` is `YYYY-MM-DDTHH:MM:SS.sssZ`; `amount` is an
 * ADR-0009 decimal string in the record's `currency`; `dimensions` is an object of strings or
 * `null`, never `{}`; `document` is a JSON object written as its RFC 8785 canonical text;
 * `correction` is `reversal`, `replacement` or `null`; `household?` is a household document, which
 * is `null` when none is set (cli ADR-0048).
 */
export type FieldKind =
	| "text"
	| "text?"
	| "time"
	| "time?"
	| "int"
	| "amount"
	| "dimensions"
	| "document"
	| "household?"
	| "correction"

type Fields<Row> = { readonly [K in keyof Row]-?: FieldKind }

/** The fields a record type declares, by name, in the writer's order. */
export type Layout = Readonly<Record<RecordType, Readonly<Record<string, FieldKind>>>>

/** One record type per table, keyed like the store's rows. */
export type RecordRows = {
	entity: EntityRow
	account: AccountRow
	tx: TxRow
	posting: PostingRow
	scenario: ScenarioRow
}
export type RecordType = keyof RecordRows

/** The fixed order record types appear in after the header. */
export const RECORD_ORDER: readonly RecordType[] = [
	"entity",
	"account",
	"tx",
	"posting",
	"scenario",
]

const SYNC = { version: "int", createdAt: "time", updatedAt: "time" } as const

/** A Scenario's columns before the household (schema version 2). */
const SCENARIO_V2: Omit<Fields<ScenarioRow>, "household"> = {
	id: "text",
	entityId: "text",
	name: "text",
	document: "document",
	contentHash: "text",
	forkedFrom: "text?",
	...SYNC,
	deletedAt: "time?",
}

/**
 * The writer's declared key order for each record, after its leading `"record"` key. The reader
 * accepts exactly these keys in exactly this order.
 */
export const FIELDS: { readonly [T in RecordType]: Fields<RecordRows[T]> } = {
	entity: { id: "text", name: "text", ...SYNC, deletedAt: "time?" },
	account: {
		id: "text",
		entityId: "text",
		name: "text",
		type: "text",
		currency: "text",
		parentId: "text?",
		archivedAt: "time?",
		...SYNC,
		deletedAt: "time?",
	},
	tx: {
		id: "text",
		entityId: "text",
		date: "text",
		memo: "text?",
		linkedTo: "text?",
		externalRef: "text?",
		...SYNC,
		correctionKind: "correction",
	},
	posting: {
		txId: "text",
		ordinal: "int",
		accountId: "text",
		amount: "amount",
		currency: "text",
		dimensions: "dimensions",
	},
	scenario: { ...SCENARIO_V2, household: "household?" },
}

/**
 * The record layouts this build reads, by the schema version a header states. Schema 2 predates
 * the household column, so its Scenario records have none and restore with it null (cli ADR-0048).
 * Any other version is refused: a restore never guesses a layout.
 */
export const READABLE_LAYOUTS: Readonly<Record<number, Layout>> = {
	2: { ...FIELDS, scenario: SCENARIO_V2 },
	3: FIELDS,
}
