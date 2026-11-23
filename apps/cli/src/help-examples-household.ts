/*
 * The household the `scenario household` help example reads (cli ADR-0048), kept apart from the
 * setups so `help-examples-setup.ts` states only what each leaf needs.
 */

/**
 * The household the base fixture takes: the holder's age pins the salary's end, and their life's end
 * the investment's, so each anchor names a Flow the fixture holds (cli ADR-0048).
 */
export const BASE_HOUSEHOLD: Record<string, unknown> = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90, joins: "2028-01" },
	],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.invest.end", person: "me", at: "lifeEnd" },
	],
}
