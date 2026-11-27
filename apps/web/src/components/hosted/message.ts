/** The command that opens the Dashboard on a person's own plan, which the hosted Demo points to. */
export const INSTALL_COMMAND = "traj dashboard"

/** Where a visitor installs traj: the Site's install window. */
export const INSTALL_URL = "https://trajectonomics.com/#install"

/** What a switched-off control says when a person points at it: what it would do, and where to do it. */
export function disabledTitle(name: string): string {
	return `${name}: switched off in this demo. Install traj and run ${INSTALL_COMMAND} to do this to your own plan.`
}
