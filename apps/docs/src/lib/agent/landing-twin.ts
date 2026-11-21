import { PORTAL_NAME, PORTAL_PURPOSE } from "../portal"
import { TABS, tabUrl } from "../tabs"
import { indexReference } from "./index-reference"
import { twinUrl } from "./twin-url"

/** The Markdown twin of the Landing Page, from the constants the page renders. */
export function buildLandingTwin(origin: string): string {
	const entries = TABS.flatMap((tab) => [
		`## ${tab.entry}`,
		"",
		`- [${tab.title}](${twinUrl(origin, tabUrl(tab))}): ${tab.description}`,
		"",
	])
	return [
		`# ${PORTAL_NAME}`,
		"",
		`> ${PORTAL_PURPOSE}`,
		"",
		...entries,
		indexReference(origin),
		"",
	].join("\n")
}
