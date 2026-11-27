import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { clientsSql } from "../../scripts/clients-sql"

describe("0003_oauth_clients.sql", () => {
	it("matches what `bun run clients:sql` generates from the manifest", () => {
		const committed = readFileSync(
			new URL("../../migrations/0003_oauth_clients.sql", import.meta.url),
			"utf8",
		)
		expect(committed).toBe(clientsSql())
	})
})
