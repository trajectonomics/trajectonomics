import { valuationTriggers } from "./account/value/triggers.test-support"
import type { CommandRaised } from "./command-raised"
import { ledgerHome } from "./store/testing"
import { capture } from "./test-support"

/** One real command line per code a write command raises itself, before the store is asked to write. */
export const commandTriggers: Record<CommandRaised, () => ReturnType<typeof capture>> = {
	liability_opening_positive: async () => {
		const home = ledgerHome()
		for (const [name, type] of [
			["Opening", "equity"],
			["Loan", "liability"],
		] as const) {
			await capture(["account", "add", name, "--type", type, "--currency", "THB", "--json"], {
				TRAJ_HOME: home,
			})
		}
		return capture(
			[
				"tx",
				"add",
				"--opening",
				"--from",
				"Opening",
				"--to",
				"Loan",
				"--amount",
				"300000.00",
				"--date",
				"2026-11-01",
				"--json",
			],
			{ TRAJ_HOME: home },
		)
	},
	same_account: async () => {
		const home = ledgerHome()
		await capture(["account", "add", "Cash", "--type", "asset", "--currency", "THB", "--json"], {
			TRAJ_HOME: home,
		})
		return capture(
			[
				"tx",
				"add",
				"--from",
				"Cash",
				"--to",
				"Cash",
				"--amount",
				"5.00",
				"--date",
				"2026-11-22",
				"--json",
			],
			{ TRAJ_HOME: home },
		)
	},
	...valuationTriggers,
}
