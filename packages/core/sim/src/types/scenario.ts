import type { Account } from "./account"
import type { Calendar } from "./calendar"
import type { Cashflow } from "./cashflow"
import type { BasisPoints } from "./common"
import type { Estate } from "./estate"
import type { Flow } from "./flow"
import type { Levy } from "./levy"
import type { Milestone } from "./milestone"

export interface Economy {
	readonly inflation: BasisPoints
}

export interface Scenario {
	readonly schemaVersion: 4
	readonly currency: string
	readonly economy: Economy
	readonly accounts: readonly Account[]
	readonly flows: readonly Flow[]
	readonly cashflow: Cashflow
	readonly levies?: readonly Levy[]
	readonly milestones?: readonly Milestone[]
	readonly calendar?: Calendar
	readonly estate?: Estate
}
