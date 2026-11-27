import { INSTALL_URL } from "../components/hosted/message"
import type { FocusButton } from "../lib/view/overview/focus-setup"

/**
 * The hosted Demo's setup action: there is no write path to make a plan with, so it points at the
 * install, the same target the demo notice's "Get traj" uses.
 */
export function setupButton(): FocusButton {
	return { label: "Start a plan", href: INSTALL_URL, external: true }
}
