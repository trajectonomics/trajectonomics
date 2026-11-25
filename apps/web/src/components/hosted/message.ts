/** The command that opens the Dashboard on a person's own plan, which the hosted Demo points to. */
export const INSTALL_COMMAND = "traj dashboard"

/** What a switched-off control says when a person points at it: what it would do, and where to do it. */
export function disabledTitle(name: string): string {
	return `${name}: switched off in this demo. Install traj and run ${INSTALL_COMMAND} to do this to your own plan.`
}
