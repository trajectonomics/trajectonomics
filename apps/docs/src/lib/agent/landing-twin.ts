import {
	AGENT_ROUTES_HEADING,
	AGENT_START_HEADING,
	AGENT_START_LEAD,
	agentPrompt,
	agentRoutes,
} from "../agent-start"
import { PORTAL_NAME, PORTAL_PURPOSE } from "../portal"
import { TABS, tabUrl } from "../tabs"
import { indexReference } from "./index-reference"
import { twinUrl } from "./twin-url"

/**
 * The Markdown twin of the Landing Page, from the constants the page renders and the release line it
 * shows: the prompt a reader hands their Agent comes first, because an Agent reading this twin is the
 * one the prompt is for.
 */
export function buildLandingTwin(origin: string, releaseLine?: string): string {
	const entries = TABS.flatMap((tab) => [
		`## ${tab.entry}`,
		"",
		`- [${tab.title}](${twinUrl(origin, tabUrl(tab))}): ${tab.description}`,
		"",
	])
	const routes = agentRoutes(origin).map(
		(route) => `- ${route.title}: ${route.description} \`${route.snippet}\``,
	)
	return [
		`# ${PORTAL_NAME}`,
		"",
		`> ${PORTAL_PURPOSE}`,
		"",
		...(releaseLine === undefined ? [] : [releaseLine, ""]),
		`## ${AGENT_START_HEADING}`,
		"",
		AGENT_START_LEAD,
		"",
		"```text",
		agentPrompt(origin),
		"```",
		"",
		...entries,
		`## ${AGENT_ROUTES_HEADING}`,
		"",
		...routes,
		"",
		indexReference(origin),
		"",
	].join("\n")
}
