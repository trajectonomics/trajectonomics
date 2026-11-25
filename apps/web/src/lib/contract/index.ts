/** The contract between `traj --json` and the Dashboard: one strict schema per read leaf and the Snapshot. */

export type { AccountList } from "./account-list"
export { accountList } from "./account-list"
export type { AccountRef } from "./account-ref"
export { accountRef } from "./account-ref"
export type { AccountType } from "./account-type"
export { accountType } from "./account-type"
export type { AccountValue, AccountValues } from "./account-value"
export { accountValue, accountValues } from "./account-value"
export type { AmountRow, CurrencyTotal } from "./amount-row"
export { amountRow, currencyTotal } from "./amount-row"
export type { Balance } from "./balance"
export { balance } from "./balance"
export type { Baseline } from "./baseline"
export { baseline } from "./baseline"
export type { CarryInRecord } from "./carry-in"
export { carryInRecord } from "./carry-in"
export type { CompareSide } from "./compare-side"
export { compareSide } from "./compare-side"
export type { DateString } from "./date"
export { dateString } from "./date"
export type { Doctor } from "./doctor"
export { doctor } from "./doctor"
export type { Engine } from "./engine"
export { engine } from "./engine"
export type { Fi } from "./fi"
export { fi } from "./fi"
export type { FiResult } from "./fi-result"
export { fiResult } from "./fi-result"
export type { HouseholdAnchor, HouseholdDocument, HouseholdPerson } from "./household"
export { householdAnchor, householdDocument, householdPerson } from "./household"
export type { Money } from "./money"
export { money } from "./money"
export type { NetWorth } from "./net-worth"
export { netWorth } from "./net-worth"
export type { NetWorthMonth, NetWorthMonthly } from "./net-worth-monthly"
export { netWorthMonth, netWorthMonthly } from "./net-worth-monthly"
export type { PersonAge } from "./person-age"
export { personAge, personAges } from "./person-age"
export type { Pnl } from "./pnl"
export { pnl } from "./pnl"
export type {
	AllowanceFlow,
	AllowanceRow,
	AllowanceYear,
	ProjectionAllowances,
} from "./projection-allowances"
export {
	allowanceFlow,
	allowanceRow,
	allowanceYear,
	projectionAllowances,
	stoppedBy,
} from "./projection-allowances"
export type { ProjectionChance } from "./projection-chance"
export { projectionChance } from "./projection-chance"
export type { ProjectionCompare } from "./projection-compare"
export { projectionCompare } from "./projection-compare"
export type { ProjectionPath } from "./projection-path"
export { projectionPath } from "./projection-path"
export type { ProjectionRun } from "./projection-run"
export { projectionRun } from "./projection-run"
export type { ProjectionTables } from "./projection-tables"
export { projectionTables } from "./projection-tables"
export type { ErrorBody, Read } from "./read"
export { errorBody, readOf } from "./read"
export type { ScenarioCashflow } from "./scenario-cashflow"
export type { ScenarioList } from "./scenario-list"
export { scenarioList } from "./scenario-list"
export type { ScenarioRef } from "./scenario-ref"
export { scenarioRef } from "./scenario-ref"
export type {
	EstateBlock,
	EstateLine,
	MilestoneLabel,
	ScenarioAccount,
	ScenarioDocument,
	ScenarioFlow,
	ScenarioShow,
} from "./scenario-show"
export {
	estateBlock,
	estateLine,
	milestoneLabel,
	scenarioAccount,
	scenarioDocument,
	scenarioFlow,
	scenarioShow,
} from "./scenario-show"
export type { Snapshot, SnapshotParams, SnapshotReads } from "./snapshot"
export { SNAPSHOT_VERSION, snapshot, snapshotParams, snapshotReads } from "./snapshot"
export type { TaxAllowances, TaxProfile } from "./tax-profile"
export { taxAllowances, taxProfile } from "./tax-profile"
export type { Assumption, TaxBracket, TaxWalk, TaxYear } from "./tax-year"
export { taxYear } from "./tax-year"
export type { TxList } from "./tx-list"
export { txList } from "./tx-list"
