import { describe, expect, it } from "bun:test"
import {
	HOLDER,
	HOUSEHOLD,
	PARTNER,
	seedBase,
	setHousehold,
	shown,
} from "./scenario-household-support"
import { errorOf, scenarioHome } from "./scenario-test-support"

/** The household a refused Owner is stated in (cli ADR-0076), with the holder and the partner as Owners. */
const OWNED = {
	...HOUSEHOLD,
	schemaVersion: 2,
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.bonus", person: "partner" },
	],
}

/** The partner is named shared, and the bonus's anchor follows them. */
const SHARED_PARTNER_V2 = {
	...OWNED,
	people: [HOLDER, { ...PARTNER, id: "shared" }],
	anchors: [HOUSEHOLD.anchors[0], { ...HOUSEHOLD.anchors[1], person: "shared" }],
	owners: [{ path: "flows.salary", person: "me" }],
}

describe("scenario household, refused owners", () => {
	const refused: [string, unknown, string, string][] = [
		["a person named shared", SHARED_PARTNER_V2, "document.people.1.id", "reserved"],
		[
			"an unknown person",
			{ ...OWNED, owners: [{ path: "flows.salary", person: "nobody" }] },
			"document.owners.0.person",
			"nobody",
		],
		[
			"a dependent",
			{
				...OWNED,
				people: [
					HOLDER,
					PARTNER,
					{ id: "kid", role: "dependent", relation: "child", born: "2020-01", lifeExpectancy: 90 },
				],
				owners: [{ path: "flows.salary", person: "kid" }],
			},
			"document.owners.0.person",
			"dependent",
		],
		[
			"a path that names no list",
			{ ...OWNED, owners: [{ path: "levies.th", person: "me" }] },
			"document.owners.0.path",
			"levies.th",
		],
		[
			"a path with a field",
			{ ...OWNED, owners: [{ path: "flows.salary.end", person: "me" }] },
			"document.owners.0.path",
			"flows.salary.end",
		],
		[
			"a Flow the Scenario does not hold",
			{ ...OWNED, owners: [{ path: "flows.ghost", person: "me" }] },
			"document.owners.0.path",
			"flows.ghost",
		],
		[
			"an Account the Scenario does not hold",
			{ ...OWNED, owners: [{ path: "accounts.ghost", person: "me" }] },
			"document.owners.0.path",
			"accounts.ghost",
		],
		[
			"a path with two Owners",
			{
				...OWNED,
				owners: [
					{ path: "flows.salary", person: "me" },
					{ path: "flows.salary", person: "partner" },
				],
			},
			"document.owners.1.path",
			"two Owners",
		],
		[
			"owners in a version 1 household",
			{ ...HOUSEHOLD, owners: [] },
			"document.owners",
			"version 1",
		],
		[
			"a version 2 household without owners",
			{ ...HOUSEHOLD, schemaVersion: 2 },
			"document.owners",
			"version 2",
		],
	]
	for (const [name, household, path, word] of refused) {
		it(`refuses ${name} at ${path}, and writes nothing`, async () => {
			const home = scenarioHome()
			await seedBase(home)
			const res = await setHousehold(home, household)
			expect(res.code).toBe(2)
			const error = errorOf(res)
			expect(error.code).toBe("invalid_input")
			expect(error.path).toBe(path)
			expect(error.message).toContain(word)
			expect((await shown(home)).household).toBeNull()
		})
	}

	it("keeps reading a version 1 household whose person is named shared", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const version1 = { ...SHARED_PARTNER_V2, schemaVersion: 1, owners: undefined }
		expect((await setHousehold(home, version1)).code).toBe(0)
	})

	it("does not refuse a person id that cannot be a Filer id", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const odd = {
			...OWNED,
			people: [{ ...HOLDER, id: "Me Myself" }, PARTNER],
			anchors: [],
			owners: [{ path: "flows.salary", person: "Me Myself" }],
		}
		expect((await setHousehold(home, odd)).code).toBe(0)
	})

	it("refuses a version 3 household", async () => {
		const home = scenarioHome()
		await seedBase(home)
		const res = await setHousehold(home, { ...OWNED, schemaVersion: 3 })
		expect(res.code).toBe(2)
		expect(errorOf(res).path).toBe("document.schemaVersion")
	})
})
