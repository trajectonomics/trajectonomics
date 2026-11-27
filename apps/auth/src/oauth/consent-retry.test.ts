import { describe, expect, it } from "bun:test"
import { recordConsent } from "./consent-record"
import { concurrentConsent, consentSetup, EARLIER, NOW } from "./fake-consent-adapter"
import type { ConsentRow } from "./fake-consent-database"

const FAILED = { body: { error: "server_error" } }

/** Another request writes the row: new scopes, and an `updatedAt` this request has not read. */
function touch(row: ConsentRow | undefined, second: number, scopes: string[]): void {
	if (row === undefined) return
	row["scopes"] = JSON.stringify(scopes)
	row["updatedAt"] = `2026-11-27T00:00:0${second}.000Z`
}

describe("mergeRetriesWhenRowVanishes", () => {
	it("inserts afresh when the row it read was deleted before the merge", async () => {
		const { adapter, ctx, options, input } = consentSetup([concurrentConsent("other", EARLIER)])
		adapter.afterRead = (rows, read) => {
			if (read === 1) rows.splice(0)
		}
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "created", id: "consent-1", writtenAt: new Date(NOW) })
		expect(adapter.consents.rows.map((row) => row["scopes"])).toEqual([`["openid"]`])
	})

	it("merges onto the new state when the row changed before the merge", async () => {
		const { adapter, ctx, options, input } = consentSetup([concurrentConsent("other", EARLIER)])
		adapter.afterRead = (rows, read) => {
			if (read === 1) touch(rows[0], 1, ["profile"])
		}
		const write = await recordConsent(ctx, input, options)
		expect(write).toMatchObject({
			kind: "merged",
			id: "other",
			previousScopes: `["profile"]`,
			previousUpdatedAt: "2026-11-27T00:00:01.000Z",
		})
		expect(adapter.consents.rows[0]?.["scopes"]).toBe(`["profile","openid"]`)
	})

	it("fails closed after three merges that each found the row changed", async () => {
		const { adapter, ctx, options, input } = consentSetup([concurrentConsent("other", EARLIER)])
		let reads = 0
		adapter.afterRead = (rows, read) => {
			reads = read
			touch(rows[0], read, ["profile"])
		}
		await expect(recordConsent(ctx, input, options)).rejects.toMatchObject(FAILED)
		expect(reads).toBe(3)
		expect(adapter.consents.rows.map((row) => row["scopes"])).toEqual([`["profile"]`])
	})

	it("records its own insert when the row it was merging into is undone", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.afterInsert = (rows) => rows.push(concurrentConsent("other", EARLIER))
		adapter.afterRead = (rows, read) => {
			// The other approval fails and deletes its row after this request read both.
			if (read === 2)
				rows.splice(
					rows.findIndex((row) => row.id === "other"),
					1,
				)
		}
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "created", id: "consent-1", writtenAt: new Date(NOW) })
		expect(adapter.consents.rows.map((row) => row.id)).toEqual(["consent-1"])
	})

	it("inserts again when its own row is gone and nothing replaced it", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.afterInsert = (rows) => {
			if (rows[0]?.id === "consent-1") rows.splice(0)
		}
		const write = await recordConsent(ctx, input, options)
		expect(write).toMatchObject({ kind: "created", id: "consent-2" })
		expect(adapter.consents.rows.map((row) => row.id)).toEqual(["consent-2"])
	})

	it("merges again when the only row left does not carry this approval", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		// Another request merged this one's row into its own, and its undo then restored that row.
		adapter.afterInsert = (rows) => rows.splice(0, 1, concurrentConsent("other", EARLIER))
		const write = await recordConsent(ctx, input, options)
		expect(write).toMatchObject({ kind: "merged", id: "other" })
		expect(adapter.consents.rows[0]?.["scopes"]).toBe(`["data:ingest","openid"]`)
	})

	it("takes its own insert back when it fails closed", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.afterInsert = (rows) => rows.push(concurrentConsent("other", EARLIER))
		adapter.afterRead = (rows, read) => {
			touch(
				rows.find((row) => row.id === "other"),
				read,
				["profile"],
			)
		}
		await expect(recordConsent(ctx, input, options)).rejects.toMatchObject(FAILED)
		expect(adapter.consents.rows.map((row) => row.id)).toEqual(["other"])
	})
})
