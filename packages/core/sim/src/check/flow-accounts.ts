import type { AccountIndex, Emit, Path } from "./codes"
import { isRecord } from "./shape"

/** An `account` Measure of a Flow's `derive`: the Account it reads and the Measure's path. */
export interface AccountRead {
	readonly account: string
	readonly path: Path
}

/** The `account` reads of one Flow's `derive`, in Measure order; `at` is the Flow's own path. */
export function accountReadsOf(flow: unknown, at: Path): readonly AccountRead[] {
	if (!isRecord(flow) || !isRecord(flow["derive"])) return []
	const measures = flow["derive"]["measures"]
	if (!Array.isArray(measures)) return []
	const reads: AccountRead[] = []
	for (let index = 0; index < measures.length; index++) {
		const measure: unknown = measures[index]
		if (!isRecord(measure) || measure["op"] !== "account") continue
		const account = measure["account"]
		if (typeof account === "string") {
			reads.push({ account, path: [...at, "derive", "measures", index, "account"] })
		}
	}
	return reads
}

/** The Account a Flow changes: a contribution's `target`, a withdrawal's `source`. */
export function changedAccountOf(flow: unknown): string | undefined {
	if (!isRecord(flow)) return undefined
	const value =
		flow["kind"] === "contribution"
			? flow["target"]
			: flow["kind"] === "withdrawal"
				? flow["source"]
				: undefined
	return typeof value === "string" ? value : undefined
}

/**
 * One edge from a Flow that reads an Account to each Flow that changes that Account, so a cycle
 * through a Flow that changes the Account it reads is reported as `FLOW_CYCLE`.
 */
export function accountEdges(
	flows: readonly unknown[],
	index: number,
	path: Path,
): readonly { readonly to: number; readonly path: Path }[] {
	const edges: { readonly to: number; readonly path: Path }[] = []
	for (const read of accountReadsOf(flows[index], [...path, index])) {
		for (let other = 0; other < flows.length; other++) {
			if (changedAccountOf(flows[other]) === read.account)
				edges.push({ to: other, path: read.path })
		}
	}
	return edges
}

/** Reports each `account` read of a Derived amount that names no declared Account. */
export function checkAccountReads(
	flows: unknown,
	path: Path,
	accounts: AccountIndex | undefined,
	emit: Emit,
): void {
	if (!Array.isArray(flows) || accounts === undefined) return
	for (let index = 0; index < flows.length; index++) {
		for (const read of accountReadsOf(flows[index], [...path, index])) {
			if (!accounts.has(read.account)) emit("UNKNOWN_ACCOUNT", read.path)
		}
	}
}
