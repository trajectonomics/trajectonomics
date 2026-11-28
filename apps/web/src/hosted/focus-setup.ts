import { INSTALL_URL } from "../components/hosted/message"
import type { FocusButton, SetupAction } from "../lib/view/overview/focus-setup"
import { withBase } from "./links"

/**
 * The hosted Demo's setup action: with no plan, the guided page is a link under the base path; any other setup case
 * points at the install, the same target the demo notice's "Get traj" uses, since the Demo has no write path.
 */
export function setupButton(action: SetupAction = "plan"): FocusButton {
	if (action === "first") {
		return { label: "Set up a first plan", href: withBase("/plans/new/"), external: false }
	}
	return { label: "Start a plan", href: INSTALL_URL, external: true }
}
