/**
 * The Better Auth plugin behind the marketing consent record.
 *
 * Two session-scoped endpoints: GET returns the latest record, POST appends one. The history is
 * never updated except to stamp `withdrawnAt` on the row a withdrawal closes. The rules live in
 * `src/core/consent.ts`; this module only speaks to the adapter.
 */
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api"
import {
	CONSENT_WORDING_VERSION,
	consentView,
	currentConsent,
	parseConsentAnswer,
	type StoredConsent,
	withdrawalTarget,
} from "./core/consent"
import { marketingConsentSchema } from "./marketing-consent-schema"

/** A value the adapter stores as `date`; ISO text is what D1 keeps. */
function nowIso(): string {
	return new Date().toISOString()
}

/** The adapter fields this module calls, so a caller can pass Better Auth's own adapter. */
type ConsentAdapter = {
	findMany: (input: {
		model: string
		where: { field: string; value: string }[]
		sortBy: { field: string; direction: "asc" | "desc" }
	}) => Promise<unknown>
}

/** The person's consent history, oldest first, so the last row is the current state. */
async function consentHistory(ctx: { context: { adapter: ConsentAdapter } }, userId: string) {
	const rows = await ctx.context.adapter.findMany({
		model: "marketingConsent",
		where: [{ field: "userId", value: userId }],
		sortBy: { field: "givenAt", direction: "asc" },
	})
	return Array.isArray(rows) ? (rows as StoredConsent[]) : []
}

export function marketingConsent() {
	return {
		id: "marketing-consent",
		schema: marketingConsentSchema(),
		endpoints: {
			getMarketingConsent: createAuthEndpoint(
				"/marketing-consent",
				{ method: "GET", use: [sessionMiddleware] },
				async (ctx) => {
					const history = await consentHistory(ctx, ctx.context.session.user.id)
					return ctx.json({ consent: consentView(currentConsent(history)) })
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
					const userId = ctx.context.session.user.id
					const history = await consentHistory(ctx, userId)
					const latest = currentConsent(history)
					const givenAt = nowIso()
					const close = withdrawalTarget(latest, parsed.answer.optedIn)
					if (close !== null) {
						await ctx.context.adapter.update({
							model: "marketingConsent",
							where: [{ field: "id", value: close }],
							update: { withdrawnAt: givenAt },
						})
					}
					const created = (await ctx.context.adapter.create({
						model: "marketingConsent",
						data: {
							userId,
							optedIn: parsed.answer.optedIn,
							wordingVersion: CONSENT_WORDING_VERSION,
							source: parsed.answer.source,
							givenAt,
							withdrawnAt: null,
						},
					})) as StoredConsent
					return ctx.json({ consent: consentView(created) })
				},
			),
		},
	}
}
