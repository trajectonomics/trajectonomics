import type { AccountList, NetWorth, Read, ScenarioList } from "../contract"
import type { PlanParams } from "./params"
import { type PlannedRead, plainRead } from "./planned"

/** The reads of stage one: the Scenarios, the accounts, and net worth at the As-of. */
export type StageOneReads = {
	scenarios: Read<ScenarioList>
	accounts: Read<AccountList>
	netWorth: Read<NetWorth>
}

/** The argv of stage one. Net worth at the As-of carries the first transaction date stage two needs. */
export function planStageOne(params: PlanParams): Record<keyof StageOneReads, PlannedRead> {
	return {
		scenarios: plainRead(["scenario", "list", "--json"]),
		accounts: plainRead(["account", "list", "--json"]),
		netWorth: plainRead(["report", "networth", "--as-of", params.asOf, "--json"]),
	}
}
