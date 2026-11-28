import type { AccountRow, EntityRow, PostingRow, ScenarioRow, TxRow } from "../store"

/** Bumped when an existing field changes meaning; adding a field keeps it (ADR-0017). */
export const FORMAT_VERSION = 1

/**
 * How a field is written and read back. `time` is `YYYY-MM-DDTHH:MM:SS.sssZ`; `amount` is an
 * ADR-0009 decimal string in the record's `currency`; `dimensions` is an object of strings or
 * `null`, never `{}`; `document` is a JSON object written as its RFC 8785 canonical text;
 * `correction` is `reversal`, `replacement` or `null`; `household?` is a household document, which
 * is `null` when none is set (cli ADR-0048); `tax?` is a tax profile, which is `null` when none is
 * stored (cli ADR-0066); `notes?` is a plan's notes, which is `null` when it has none, and `flag` is
 * a JSON boolean (cli ADR-0071).
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
	| "tax?"
	| "notes?"
	| "unstated?"
	| "flag"
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

/** A Scenario record's fields, which each layout below narrows to the columns it had. */
type ScenarioFields = Fields<ScenarioRow>

/** A Scenario's columns before the household (schema version 2). */
const SCENARIO_V2: Omit<ScenarioFields, "household" | "tax" | "notes" | "main" | "unstated"> = {
	id: "text",
	entityId: "text",
	name: "text",
	document: "document",
	contentHash: "text",
	forkedFrom: "text?",
	...SYNC,
	deletedAt: "time?",
}

/** A Scenario's columns with the household and before the tax profile (schema version 3). */
const SCENARIO_V3: Omit<ScenarioFields, "tax" | "notes" | "main" | "unstated"> = {
	...SCENARIO_V2,
	household: "household?",
}

/** A Scenario's columns with the tax profile beside the household (schema version 4). */
const SCENARIO_V4: Omit<ScenarioFields, "notes" | "main" | "unstated"> = {
	...SCENARIO_V3,
	tax: "tax?",
}

/** A Scenario's columns with the notes and the main-plan flag after the tax profile (schema version 5). */
const SCENARIO_V5: Omit<ScenarioFields, "unstated"> = {
	...SCENARIO_V4,
	notes: "notes?",
	main: "flag",
}

/** A Scenario's columns with the paths `traj` wrote after the main-plan flag (schema version 6). */
const SCENARIO_V6: ScenarioFields = { ...SCENARIO_V5, unstated: "unstated?" }

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
	scenario: SCENARIO_V6,
}

/**
 * The record layouts this build reads, by the schema version a header states. Schema 2 predates
 * the household column and schema 3 the tax column, so their Scenario records have none and restore
 * with it null, and schema 4 the notes and the main plan, so its records restore with no notes and
 * no main plan (cli ADR-0048, ADR-0066, ADR-0071).
 * Any other version is refused: a restore never guesses a layout.
 */
export const READABLE_LAYOUTS: Readonly<Record<number, Layout>> = {
	2: { ...FIELDS, scenario: SCENARIO_V2 },
	3: { ...FIELDS, scenario: SCENARIO_V3 },
	4: { ...FIELDS, scenario: SCENARIO_V4 },
	5: { ...FIELDS, scenario: SCENARIO_V5 },
	6: FIELDS,
}
