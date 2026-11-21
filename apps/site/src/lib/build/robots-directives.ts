import type { ParsedRobots, RobotsGroup } from "./robots-parse"

/** Whether a group states `field: value`, with `value` compared as written. */
export function states(
	directives: RobotsGroup["directives"],
	field: string,
	value: string,
): boolean {
	return directives.some((directive) => directive.field === field && directive.value === value)
}

/** The one group that addresses an agent, named on its own or beside another. */
export function groupOf(parsed: ParsedRobots, agent: string): RobotsGroup | undefined {
	return parsed.groups.find((group) => group.agents.includes(agent))
}

/** Whether a group lets the agents it addresses read the whole Site. */
export function allowsRoot(group: RobotsGroup): boolean {
	return states(group.directives, "allow", "/")
}
