import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { extractOpenCode } from "../src/extract/opencode"
import { readOpenCodeRows } from "../src/stores/opencode"

const context = { contributor: "trajectonomics", machine: "test-machine" } as const
const timestamp = Date.parse("2026-11-24T10:30:00.000Z")

function messageDb(id: string, data: object): Database {
	const db = new Database(":memory:")
	db.run(
		"CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, time_created INTEGER NOT NULL, data TEXT NOT NULL)",
	)
	db.run("INSERT INTO message VALUES (?, ?, ?, ?)", [
		id,
		"ses-test",
		timestamp,
		JSON.stringify(data),
	])
	return db
}

function sessionDb(id: string, data: object): Database {
	const db = new Database(":memory:")
	db.run(
		"CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL, time_created INTEGER NOT NULL, data TEXT NOT NULL)",
	)
	db.run("INSERT INTO session_message VALUES (?, ?, ?, ?, ?)", [
		id,
		"ses-test",
		"assistant",
		timestamp,
		JSON.stringify(data),
	])
	return db
}

const messageData = {
	role: "assistant",
	providerID: "opencode-go",
	modelID: "deepseek-v4.1-flash",
	tokens: { input: 100, output: 20, reasoning: 5, cache: { read: 10, write: 2 } },
	time: { created: timestamp },
}

const sessionData = {
	model: { id: "deepseek-v4.1-flash", providerID: "opencode-go" },
	tokens: { input: 50, output: 10, reasoning: 3, cache: { read: 4, write: 1 } },
	time: { created: timestamp },
}

describe("extractOpenCode", () => {
	test("reads the message schema and counts reasoning into tokensOut", () => {
		const db = messageDb("msg-synthetic-1", messageData)
		const rows = extractOpenCode(readOpenCodeRows(db, null), context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.plan).toBe("opencode-go")
		expect(rows[0]?.tokensIn).toBe(100)
		expect(rows[0]?.tokensOut).toBe(25)
		expect(rows[0]?.tokensTotal).toBe(137)
	})

	test("reads the newer session_message schema", () => {
		const db = sessionDb("msg-synthetic-2", sessionData)
		const rows = extractOpenCode(readOpenCodeRows(db, null), context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.model).toBe("deepseek-v4.1-flash")
		expect(rows[0]?.tokensOut).toBe(13)
		expect(rows[0]?.tokensTotal).toBe(68)
	})

	test("counts a message id seen in both schemas once", () => {
		const db = messageDb("msg-synthetic-shared", messageData)
		db.run(
			"CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL, time_created INTEGER NOT NULL, data TEXT NOT NULL)",
		)
		db.run("INSERT INTO session_message VALUES (?, ?, ?, ?, ?)", [
			"msg-synthetic-shared",
			"ses-test",
			"assistant",
			timestamp,
			JSON.stringify(sessionData),
		])
		db.run("INSERT INTO message VALUES (?, ?, ?, ?)", [
			"msg-synthetic-old",
			"ses-test",
			timestamp,
			JSON.stringify(messageData),
		])
		const rows = extractOpenCode(readOpenCodeRows(db, null), context)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.tokensIn).toBe(150)
		expect(rows[0]?.requests).toBe(2)
	})

	test("filters by time_created", () => {
		const db = messageDb("msg-synthetic-3", messageData)
		expect(readOpenCodeRows(db, timestamp + 1)).toHaveLength(0)
		expect(readOpenCodeRows(db, timestamp)).toHaveLength(1)
	})

	test("filters non-assistant rows in SQL", () => {
		const db = messageDb("msg-synthetic-user", { ...messageData, role: "user" })
		expect(readOpenCodeRows(db, null)).toHaveLength(0)
	})

	test("splits messages across an hour boundary", () => {
		const db = messageDb("msg-synthetic-4", messageData)
		const later = { ...messageData, time: { created: timestamp + 3_600_000 } }
		db.run("INSERT INTO message VALUES (?, ?, ?, ?)", [
			"msg-synthetic-5",
			"ses-test",
			timestamp + 3_600_000,
			JSON.stringify(later),
		])
		const rows = extractOpenCode(readOpenCodeRows(db, null), context)
		expect(rows.map((row) => row.hourUtc)).toEqual([
			"2026-11-24T10:00:00.000Z",
			"2026-11-24T11:00:00.000Z",
		])
	})
})
