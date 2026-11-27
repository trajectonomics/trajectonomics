/**
 * `afterDelete` runs after Better Auth has removed the user row, so a database failure there must
 * never reach the response: the page would say "not deleted" for an account that is gone.
 */

import { describe, expect, it } from "bun:test"
import type { D1Database } from "@cloudflare/workers-types"
import { finishAccountDeletion } from "./account-deletion"

/** A D1 stand-in whose every statement fails, as a D1 outage would. */
function failingDatabase(): D1Database {
	const fail = async (): Promise<never> => {
		throw new Error("D1_ERROR: unavailable")
	}
	const statement = {
		bind: () => statement,
		all: fail,
		first: fail,
		run: fail,
		raw: fail,
	}
	return {
		prepare: () => statement,
		batch: fail,
		exec: fail,
	} as unknown as D1Database
}

describe("finishAccountDeletion", () => {
	it("settles without throwing when the database fails after the user is gone", async () => {
		await expect(
			finishAccountDeletion({ db: failingDatabase(), data: undefined, authUserId: "user-1" }),
		).resolves.toBeUndefined()
	})
})
