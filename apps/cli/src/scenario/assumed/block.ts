import type { AssumedItem } from "./shape"

/** The heading of the human block `scenario show` prints after its body (cli ADR-0083). */
export const ASSUMED_HEADING = "This plan assumes (values nobody stated):"

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The list the result states under `scenario.assumed`, or none when the field is absent or odd. */
function itemsOf(data: Record<string, unknown>): AssumedItem[] {
	const scenario = data["scenario"]
	if (!isRecord(scenario)) return []
	const found = scenario["assumed"]
	return Array.isArray(found) ? (found as AssumedItem[]) : []
}

/** An array prints the way `assumptionLines` prints one; everything else as it is. */
function valueText(value: number | number[]): string {
	return Array.isArray(value) ? `[${value.join(", ")}]` : String(value)
}

/** The words for one item, and the hint line under it when it has one. */
function itemLines(item: AssumedItem): string[] {
	switch (item.kind) {
		case "unlabelled-income":
			return [`- ${item.path} (income with no tax label)`, `  hint: ${item.hint}`]
		case "unstated-allowance":
			return [`- ${item.path} (tax allowance not stated)`, `  hint: ${item.hint}`]
		case "tax-figure":
			return [`- ${item.path} = ${valueText(item.value)} (${item.status} tax figure): ${item.note}`]
	}
}

/** The human block, or none when the plan assumes nothing; JSON always carries the list itself. */
export function assumedBlock(data: Record<string, unknown>): string[] {
	const items = itemsOf(data)
	if (items.length === 0) return []
	return [[ASSUMED_HEADING, ...items.flatMap(itemLines)].join("\n")]
}

/** The body the human form prints: the result without `assumed`, which the block prints instead. */
export function assumedShownBody(data: Record<string, unknown>): Record<string, unknown> {
	const scenario = data["scenario"]
	if (!isRecord(scenario)) return data
	const { assumed: _assumed, ...rest } = scenario
	return { ...data, scenario: rest }
}
