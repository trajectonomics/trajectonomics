import type { CollectorContext, Granularity, UsageRow, UsageSample } from "./types"

/** Floors an ISO timestamp or epoch milliseconds to the start of its UTC hour or day. */
export function bucketStartUtc(
	timestamp: string | number,
	granularity: Granularity = "hour",
): string {
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${String(timestamp)}`)
	const iso = date.toISOString()
	if (granularity === "day") return `${iso.slice(0, 10)}T00:00:00.000Z`
	return `${iso.slice(0, 13)}:00:00.000Z`
}

function addNullable(a: number | null, b: number | null): number | null {
	if (a === null) return b
	if (b === null) return a
	return a + b
}

function sumParts(sample: UsageSample): number {
	if (sample.tokensTotal !== undefined) return sample.tokensTotal
	return (
		(sample.tokensIn ?? 0) +
		(sample.tokensOut ?? 0) +
		(sample.cacheRead ?? 0) +
		(sample.cacheWrite ?? 0)
	)
}

function mergeSource(current: string, next: string): string {
	if (current === next) return current
	const parts = new Set(current.split("+"))
	for (const part of next.split("+")) parts.add(part)
	return [...parts].sort().join("+")
}

function combine(current: UsageRow, sample: UsageSample): void {
	current.tokensIn = addNullable(current.tokensIn, sample.tokensIn)
	current.tokensOut = addNullable(current.tokensOut, sample.tokensOut)
	current.cacheRead = addNullable(current.cacheRead, sample.cacheRead)
	current.cacheWrite = addNullable(current.cacheWrite, sample.cacheWrite)
	current.tokensTotal += sumParts(sample)
	current.requests += sample.requests
	current.bestEffort = current.bestEffort || (sample.bestEffort ?? false)
	current.source = mergeSource(current.source, sample.source)
}

/** Returns rows sorted by UTC bucket, plan, model and source, without mutating the input. */
export function sortUsageRows(rows: readonly UsageRow[]): UsageRow[] {
	return [...rows].sort(
		(a, b) =>
			a.hourUtc.localeCompare(b.hourUtc) ||
			a.plan.localeCompare(b.plan) ||
			a.model.localeCompare(b.model) ||
			a.source.localeCompare(b.source),
	)
}

/** Buckets samples by plan, model and UTC hour (or day) and sums their tokens and requests. */
export function aggregateSamples(
	samples: readonly UsageSample[],
	context: CollectorContext,
): UsageRow[] {
	const groups = new Map<string, UsageRow>()
	for (const sample of samples) {
		const granularity = sample.granularity ?? "hour"
		const hourUtc = bucketStartUtc(sample.timestamp, granularity)
		const key = [sample.plan, sample.model, hourUtc, granularity].join("\u0000")
		const existing = groups.get(key)
		if (existing) {
			combine(existing, sample)
			continue
		}
		groups.set(key, {
			contributor: context.contributor,
			machine: context.machine,
			plan: sample.plan,
			model: sample.model,
			hourUtc,
			granularity,
			tokensIn: sample.tokensIn,
			tokensOut: sample.tokensOut,
			cacheRead: sample.cacheRead,
			cacheWrite: sample.cacheWrite,
			tokensTotal: sumParts(sample),
			requests: sample.requests,
			source: sample.source,
			bestEffort: sample.bestEffort ?? false,
		})
	}
	return sortUsageRows([...groups.values()])
}
