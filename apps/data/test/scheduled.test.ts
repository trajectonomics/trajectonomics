import { describe, expect, spyOn, test } from "bun:test"
import worker from "../src/worker"
import { harness } from "./support/http"

describe("the hourly cron tick", () => {
	test("warns when no ingest ever arrived", async () => {
		const context = harness()
		const warn = spyOn(console, "warn").mockImplementation(() => {})
		await worker.scheduled({ cron: "17 * * * *" }, context.env)
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	test("stays quiet after a recent ingest", async () => {
		const context = harness()
		context.database
			.prepare(
				"INSERT INTO ingest_log (contributor_id, received_at, rows, status) VALUES (?, ?, ?, ?)",
			)
			.run("trajectonomics", new Date().toISOString(), 1, "accepted")
		const warn = spyOn(console, "warn").mockImplementation(() => {})
		await worker.scheduled({ cron: "17 * * * *" }, context.env)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})
