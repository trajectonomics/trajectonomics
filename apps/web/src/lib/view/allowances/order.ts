import { ALLOWANCE_LABELS } from "../../contract/allowance-labels"
import type { AllowancePlan } from "../../snapshot/allowance-params"

/** One allowance in the person's order: its label, the name read, and whether it is on. */
export interface OrderChoice {
	readonly label: string
	readonly name: string
	readonly on: boolean
}

/**
 * The allowances in the order the page shows them: the ones the inputs name come first, in their order and on,
 * then the others in the Levy's order, off. Nothing is on before the person chooses (no inputs: all off).
 */
export function orderOf(plan: AllowancePlan | null): OrderChoice[] {
	const chosen = plan?.labels ?? []
	const named = chosen.flatMap((label) => ALLOWANCE_LABELS.filter((entry) => entry.label === label))
	const rest = ALLOWANCE_LABELS.filter((entry) => !chosen.includes(entry.label))
	return [
		...named.map((entry) => ({ ...entry, on: true })),
		...rest.map((entry) => ({ ...entry, on: false })),
	]
}

/** The order with one allowance switched on or off. */
export function toggled(order: readonly OrderChoice[], label: string): OrderChoice[] {
	return order.map((choice) => (choice.label === label ? { ...choice, on: !choice.on } : choice))
}

/** The order with one allowance moved one place up (`-1`) or down (`1`); at an end it stays. */
export function moved(order: readonly OrderChoice[], label: string, by: -1 | 1): OrderChoice[] {
	const from = order.findIndex((choice) => choice.label === label)
	const to = from + by
	if (from < 0 || to < 0 || to >= order.length) return [...order]
	const next = [...order]
	const [item] = next.splice(from, 1)
	if (item !== undefined) next.splice(to, 0, item)
	return next
}

/** The labels that are on, in the person's order: the `--labels` the read takes. */
export function chosenLabels(order: readonly OrderChoice[]): string[] {
	return order.filter((choice) => choice.on).map((choice) => choice.label)
}
