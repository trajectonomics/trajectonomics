import { describe, expect, test } from "bun:test"

import { doctor } from "./doctor"

const payload = {
	ok: true,
	cliVersion: "0.8.0",
	directory: { path: "/home/you/.traj", exists: true, writable: true },
	database: {
		path: "/home/you/.traj/traj.db",
		exists: true,
		bytes: 4096,
		schemaVersion: 3,
		head: 3,
		preMigrationCopies: [
			{ path: "/home/you/.traj/traj.db.pre-v2.bak", schemaVersion: 2, bytes: 3072 },
		],
		unfinishedCopies: [],
	},
	rows: { entity: 1, account: 0, tx: 0, posting: 0, scenario: 0 },
	checks: [{ name: "database", status: "pass", detail: "opens" }],
}

describe("the doctor contract", () => {
	test("parses a result that lists the copies written before an upgrade", () => {
		expect(doctor.parse(payload).database.preMigrationCopies).toEqual([
			{ path: "/home/you/.traj/traj.db.pre-v2.bak", schemaVersion: 2, bytes: 3072 },
		])
	})

	test("still parses a result from a traj that did not report them", () => {
		const {
			preMigrationCopies: _copies,
			unfinishedCopies: _unfinished,
			...older
		} = payload.database
		expect(doctor.safeParse({ ...payload, database: older }).success).toBe(true)
	})
})
