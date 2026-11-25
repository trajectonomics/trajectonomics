/**
 * The worked example `traj schema scenario household` prints (cli ADR-0048). It is documentation of
 * the shape, never a default: no person's age or life expectancy is assumed for a household.
 */
export const HOUSEHOLD_EXAMPLE: Record<string, unknown> = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90, joins: "2028-01" },
		{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
	],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.school.start", person: "mali", age: 6 },
		{ path: "flows.pension.end", person: "me", at: "lifeEnd" },
		{ path: "flows.partner-salary.start", person: "partner", at: "joins" },
	],
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.partner-salary", person: "partner" },
		{ path: "accounts.joint-savings", person: "shared" },
	],
}
