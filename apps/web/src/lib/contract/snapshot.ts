import { z } from "zod"
import { accountList } from "./account-list"
import { balance } from "./balance"
import { baseline } from "./baseline"
import { dateString } from "./date"
import { doctor } from "./doctor"
import { fi } from "./fi"
import { netWorth } from "./net-worth"
import { pnl } from "./pnl"
import { projectionChance } from "./projection-chance"
import { projectionCompare } from "./projection-compare"
import { projectionRun } from "./projection-run"
import { readOf } from "./read"
import { scenarioList } from "./scenario-list"
import { scenarioShow } from "./scenario-show"
import { txList } from "./tx-list"

/** The version of the Snapshot document. A change to its shape bumps it. */
export const SNAPSHOT_VERSION = 1

/** The parameters a Snapshot was planned from, as the caller stated them and the Plan resolved them. */
export const snapshotParams = z.strictObject({
	asOf: dateString,
	horizon: dateString,
	scenarios: z.array(z.string()),
	compare: z.strictObject({ a: z.string(), b: z.string() }).nullable(),
	birthDate: dateString.nullable(),
	ages: z.array(z.number().int().min(0).safe()),
	historyDates: z.array(dateString),
})
export type SnapshotParams = z.infer<typeof snapshotParams>

/** Every Read a Snapshot holds, keyed by the question it answers. */
export const snapshotReads = z.strictObject({
	doctor: readOf(doctor),
	accounts: readOf(accountList),
	balance: readOf(balance),
	netWorth: readOf(netWorth),
	netWorthHistory: z.array(readOf(netWorth)),
	pnl: readOf(pnl),
	transactions: readOf(txList),
	baseline: readOf(baseline),
	scenarios: readOf(scenarioList),
	// Absent from a Snapshot made before the planner pages, so a document that never had the key reads as none.
	documents: z.record(z.string(), readOf(scenarioShow)).default({}),
	projections: z.record(z.string(), readOf(projectionRun)),
	fi: z.record(z.string(), readOf(fi)),
	compare: readOf(projectionCompare).nullable(),
	// Absent from a Snapshot made without a Return model, so a document that never had the key reads as none.
	chance: z.record(z.string(), readOf(projectionChance)).default({}),
})
export type SnapshotReads = z.infer<typeof snapshotReads>

/** The Snapshot, version 1: the parameters, the CLI version and every Read. */
export const snapshot = z.strictObject({
	snapshotVersion: z.literal(SNAPSHOT_VERSION),
	params: snapshotParams,
	cliVersion: z.string(),
	reads: snapshotReads,
})
export type Snapshot = z.infer<typeof snapshot>
