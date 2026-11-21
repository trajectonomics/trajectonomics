import { NAMED_AGENTS, ROBOTS_FILE } from "../crawl/robots"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { allowsRoot, groupOf } from "./robots-directives"
import type { ParsedRobots } from "./robots-parse"

/**
 * Every named agent has a group of its own that allows `/`. The wildcard group already allows it, so
 * the rule holds the file to stating the intent rather than inheriting it.
 */
export function namedAgentFailures(parsed: ParsedRobots): readonly BuildFailure[] {
	return NAMED_AGENTS.flatMap((agent) => {
		const group = groupOf(parsed, agent)
		if (group === undefined) {
			return [
				buildFailure(
					"ROBOTS_NAMED_AGENT_MISSING",
					ROBOTS_FILE,
					`names no \`User-agent: ${agent}\` group, so the file inherits \`*\` without saying it means it.`,
				),
			]
		}
		if (allowsRoot(group)) return []
		return [
			buildFailure(
				"ROBOTS_NAMED_ALLOW_MISSING",
				ROBOTS_FILE,
				`names \`${agent}\` and allows it no \`/\`, so it addresses the agent and opens no page.`,
			),
		]
	})
}
