/** The week's tokens for every dollar of the weekly subscription price. */
export function tokensPerDollar(tokens: number | null, weekly: number | null): number | null {
	if (tokens === null || weekly === null || tokens <= 0 || weekly <= 0) return null
	return tokens / weekly
}

/**
 * The week's tokens at API list prices for every dollar of the weekly price: the plan's own mix
 * priced per token, times the week's tokens, over the subscription. Null when any part is unknown.
 */
export function apiValuePerDollar(
	tokens: number | null,
	costPerToken: number | null,
	weekly: number | null,
): number | null {
	if (tokens === null || costPerToken === null || weekly === null) return null
	if (tokens <= 0 || costPerToken <= 0 || weekly <= 0) return null
	return (tokens * costPerToken) / weekly
}
