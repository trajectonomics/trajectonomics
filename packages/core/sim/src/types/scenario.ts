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
	/**
	 * The standard deviation of one year's inflation, in bps (0 to 10000). Only the chance of success
	 * draws it; absent or 0 holds inflation at `inflation` on every Market path (ADR 0033).
	 */
	readonly inflationVolatility?: BasisPoints
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
