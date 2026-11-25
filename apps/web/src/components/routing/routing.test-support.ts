import type { Snapshot } from "../../lib/contract"
import { accountNames } from "../../lib/view/account-names"
import type { RoutingContext } from "../../lib/view/routing/context"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"

/** The Demo snapshot with routing written into its `base` plan: a target, a share, a floor, its rest-of entry and a transfer. */
export function routedSnapshot(): {
	snapshot: Snapshot
	ctx: RoutingContext
	bank: string
	fund: string
} {
	const snapshot = structuredClone(DEMO)
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo has a base document")
	const doc = read.data.scenario.document
	const [bank, fund] = doc.accounts.map((account) => account.id)
	if (bank === undefined || fund === undefined) throw new Error("the Demo has two accounts")
	doc.cashflow = {
		surplus: [
			{ account: bank, upTo: { amount: "300000.00", growth: "inflation" } },
			{ account: fund, share: "30.00" },
			{ account: "condo-fund" },
		],
		contribute: [fund, bank],
		withdraw: [fund, { account: bank, downTo: "100000.00" }, bank],
	}
	doc.flows.push({
		id: "roll",
		kind: "transfer",
		source: bank,
		target: fund,
		frequency: "annual",
		start: "2031-06-30",
		derive: { measures: [{ id: "held", op: "account", account: bank }], result: "held" },
	})
	const ctx: RoutingContext = {
		name: "base",
		contentHash: read.data.scenario.contentHash,
		doc,
		shown: doc,
		names: accountNames(snapshot.reads.accounts),
		household: read.data.scenario.household,
		asOf: snapshot.params.asOf,
		editable: true,
		run: undefined,
		tried: false,
	}
	return { snapshot, ctx, bank, fund }
}
