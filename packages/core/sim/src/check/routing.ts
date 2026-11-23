import type { AccountIndex, Emit, Path } from "./codes"
import { isRecord } from "./shape"

/** Account ids in `cashflow.contribute`, or `undefined` when the list is unusable. */
function routedContributeIds(
	cashflow: Readonly<Record<string, unknown>>,
): ReadonlySet<string> | undefined {
	const contribute = cashflow["contribute"]
	if (!Array.isArray(contribute)) return undefined
	const routed = new Set<string>()
	for (const item of contribute) if (typeof item === "string") routed.add(item)
	return routed
}

function isUnroutedAsset(
	flow: unknown,
	routed: ReadonlySet<string>,
	accounts: AccountIndex | undefined,
): flow is Readonly<Record<string, unknown>> {
	if (!isRecord(flow) || flow["kind"] !== "contribution") return false
	if (flow["funding"] === "obligation") return false
	const target = flow["target"]
	return typeof target === "string" && accounts?.get(target) === "asset" && !routed.has(target)
}

/** Emits `CONTRIBUTION_UNROUTED` for every asset-target contribution absent from `contribute`. */
export function checkContributionRouting(
	flows: unknown,
	cashflow: unknown,
	accounts: AccountIndex | undefined,
	path: Path,
	emit: Emit,
): void {
	if (!Array.isArray(flows) || !isRecord(cashflow)) return
	const routed = routedContributeIds(cashflow)
	if (routed === undefined) return
	for (let index = 0; index < flows.length; index++) {
		if (isUnroutedAsset(flows[index], routed, accounts)) {
			emit("CONTRIBUTION_UNROUTED", [...path, "flows", index, "target"])
		}
	}
}

function isIlliquid(value: unknown, illiquid: ReadonlySet<string>): boolean {
	return typeof value === "string" && illiquid.has(value)
}

/** Emits `ILLIQUID_ROUTED` for an illiquid Account that a withdrawal or a surplus step names. */
export function checkIlliquidRouting(
	cashflow: unknown,
	illiquid: ReadonlySet<string>,
	path: Path,
	emit: Emit,
): void {
	if (!isRecord(cashflow) || illiquid.size === 0) return
	const withdraw = Array.isArray(cashflow["withdraw"]) ? cashflow["withdraw"] : []
	withdraw.forEach((id: unknown, index) => {
		if (isIlliquid(id, illiquid)) emit("ILLIQUID_ROUTED", [...path, "cashflow", "withdraw", index])
	})
	const surplus = Array.isArray(cashflow["surplus"]) ? cashflow["surplus"] : []
	surplus.forEach((step: unknown, index) => {
		if (isRecord(step) && isIlliquid(step["account"], illiquid)) {
			emit("ILLIQUID_ROUTED", [...path, "cashflow", "surplus", index, "account"])
		}
	})
}
