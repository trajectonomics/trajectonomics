import type { ReturnModel } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "../ledger-fixture"

/**
 * ILLUSTRATIVE, not a market history. Four equally weighted monthly market months over the fixture
 * Ledger's bank and investment Accounts, so the tests have a model to draw from. The CLI ships no
 * Return model: which history a plan is tested against is the owner's decision (cli issue #194).
 * Weights sum to 2^32, as the engine requires.
 */
export const ILLUSTRATIVE_RETURN_MODEL: ReturnModel = {
	id: "illustrative-four-months",
	accounts: [FIXTURE_ACCOUNTS.bank, FIXTURE_ACCOUNTS.investment],
	buckets: [
		{ returnsBps: [8, 120], weight: 1073741824 },
		{ returnsBps: [8, 40], weight: 1073741824 },
		{ returnsBps: [8, -150], weight: 1073741824 },
		{ returnsBps: [8, -400], weight: 1073741824 },
	],
}

/** The seed the examples and the golden use: sixteen lower-case hex digits. */
export const ILLUSTRATIVE_SEED = "0123456789abcdef"
