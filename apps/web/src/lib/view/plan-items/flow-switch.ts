import type { FlowCard } from "./flows"

/**
 * The paths a card's switch turns off and on together: the Flow's own, and a salary's employer Flow, which `traj`
 * refuses to leave reading a salary a Removal took out (`UNKNOWN_FLOW`).
 */
export function switchPathsOf(card: Pick<FlowCard, "id" | "employerId">): string[] {
	return [`flows.${card.id}`, ...(card.employerId === null ? [] : [`flows.${card.employerId}`])]
}
