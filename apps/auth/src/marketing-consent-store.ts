/**
 * The one D1 read the OAuth login page needs before it can decide whether a person still has to
 * answer the marketing question. The plugin's endpoints use the adapter; this read happens inside
 * the OAuth provider's `postLogin.shouldRedirect`, which has no request context.
 */
import type { D1Database } from "@cloudflare/workers-types"

/**
 * Whether the person has ever answered. A deployment without the binding (schema generation, a
 * test that never reaches the page) reports an answered person, so the flow never loops.
 */
export async function hasMarketingConsent(
	db: D1Database | undefined,
	userId: string,
): Promise<boolean> {
	if (db === undefined) return true
	const row = await db
		.prepare('select 1 as present from "marketingConsent" where "userId" = ? limit 1')
		.bind(userId)
		.first()
	return row !== null
}
