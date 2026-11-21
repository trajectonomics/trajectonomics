/** One `<meta name=… content=…>` a search engine's site verification reads. */
export interface VerificationMeta {
	readonly name: string
	readonly content: string
}

/** The `name` Google Search Console's verification meta carries. */
const GOOGLE_NAME = "google-site-verification"

/** The `name` Bing Webmaster Tools' verification meta carries. */
const BING_NAME = "msvalidate.01"

/** The tokens the owner supplies, one per search engine, and absent until the owner supplies one. */
export interface VerificationTokens {
	readonly google?: string | undefined
	readonly bing?: string | undefined
}

/** One token's meta, or nothing for a token the owner did not supply: an empty token proves nothing. */
function metaOf(name: string, token: string | undefined): readonly VerificationMeta[] {
	const content = token?.trim() ?? ""
	return content === "" ? [] : [Object.freeze({ name, content })]
}

/** The verification metas an indexed page carries: one per token supplied, and none for the rest. */
export function verificationMetas(tokens: VerificationTokens): readonly VerificationMeta[] {
	return Object.freeze([...metaOf(GOOGLE_NAME, tokens.google), ...metaOf(BING_NAME, tokens.bing)])
}
