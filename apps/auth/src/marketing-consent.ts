/**
 * The Better Auth plugin behind the marketing consent record.
 *
 * Two session-scoped endpoints: GET returns the latest record, POST appends one. The history is
 * never updated except to stamp `withdrawnAt` on the rows a withdrawal closes. The rules live in
 * `src/core/marketing-consent-rules.ts`; this module speaks to the adapter for the read and to D1 for the write,
 * because the withdrawal and the new answer must land in one batch.
 */
import type { D1Database } from "@cloudflare/workers-types"
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api"
import {
	CONSENT_WORDING_VERSION,
	consentView,
	parseConsentAnswer,
	type StoredConsent,
} from "./core/marketing-consent-rules"
import { marketingConsentSchema } from "./marketing-consent-schema"

/** The adapter fields this module calls, so a caller can pass Better Auth's own adapter. */
type ConsentAdapter = {
	findMany: (input: {
		model: string
		where: { field: string; value: string }[]
		sortBy: { field: string; direction: "asc" | "desc" }
		limit: number
	}) => Promise<unknown>
}

/**
 * The person's latest answer. The query asks for one row, newest first: the adapter's default read
 * page is 100 rows, so reading the history and taking the last row would ignore every answer after
 * the hundredth.
 */
async function latestConsent(
	ctx: { context: { adapter: ConsentAdapter } },
	userId: string,
): Promise<StoredConsent | null> {
	const rows = await ctx.context.adapter.findMany({
		model: "marketingConsent",
		where: [{ field: "userId", value: userId }],
		sortBy: { field: "givenAt", direction: "desc" },
		limit: 1,
	})
	const latest = Array.isArray(rows) ? (rows[0] as StoredConsent | undefined) : undefined
	return latest ?? null
}

export function marketingConsent(input: { db: D1Database | undefined }) {
	return {
		id: "marketing-consent",
		schema: marketingConsentSchema(),
		endpoints: {
			getMarketingConsent: createAuthEndpoint(
				"/marketing-consent",
				{ method: "GET", use: [sessionMiddleware] },
				async (ctx) => {
					const latest = await latestConsent(ctx, ctx.context.session.user.id)
					return ctx.json({ consent: consentView(latest) })
				},
			),
			postMarketingConsent: createAuthEndpoint(
				"/marketing-consent",
				{ method: "POST", use: [sessionMiddleware] },
				async (ctx) => {
					const parsed = parseConsentAnswer(ctx.body)
					if ("error" in parsed) {
						throw new APIError("BAD_REQUEST", { error: parsed.error })
					}
					const db = input.db
					if (db === undefined) throw new APIError("INTERNAL_SERVER_ERROR")
					const answer = parsed.answer
					const userId = ctx.context.session.user.id
					const givenAt = new Date().toISOString()
					// One batch is one transaction in D1: the withdrawal cannot land without the answer
					// that explains it, and every open opt-in is closed in the same write.
					const closing = answer.optedIn
						? []
						: [
								db
									.prepare(
										'update "marketingConsent" set "withdrawnAt" = ? where "userId" = ? and "optedIn" = 1 and "withdrawnAt" is null',
									)
									.bind(givenAt, userId),
							]
					await db.batch([
						...closing,
						db
							.prepare(
								'insert into "marketingConsent" ("id", "userId", "optedIn", "wordingVersion", "source", "language", "givenAt", "withdrawnAt") values (?, ?, ?, ?, ?, ?, ?, null)',
							)
							.bind(
								crypto.randomUUID(),
								userId,
								answer.optedIn ? 1 : 0,
								CONSENT_WORDING_VERSION,
								answer.source,
								answer.language,
								givenAt,
							),
					])
					return ctx.json({
						consent: consentView({
							id: "",
							optedIn: answer.optedIn,
							wordingVersion: CONSENT_WORDING_VERSION,
							source: answer.source,
							language: answer.language,
							givenAt,
							withdrawnAt: null,
						}),
					})
				},
			),
		},
	}
}
