/** A subscription plan the collector recognises. Ids are stable and never renamed. */
export type PlanId =
	| "claude"
	| "opencode-go"
	| "opencode-free"
	| "command-code"
	| "antigravity"
	| "cursor"
	| "meta"
	| "mistral"
	| "unknown"

/** The hand-kept plan table. Prices intentionally do not belong to this slice. */
export type PlanDefinition = {
	id: PlanId
	name: string
	activeFrom: string | null
	activeTo: string | null
	providerIds: readonly string[]
	modelPrefixes: readonly string[]
}

export const plans: readonly PlanDefinition[] = [
	{
		id: "claude",
		name: "Claude",
		activeFrom: null,
		activeTo: null,
		providerIds: ["anthropic", "claude", "claudeagent"],
		modelPrefixes: ["claude-"],
	},
	{
		id: "opencode-go",
		name: "OpenCode Go",
		activeFrom: null,
		activeTo: null,
		providerIds: ["opencode-go"],
		modelPrefixes: [],
	},
	{
		id: "opencode-free",
		name: "OpenCode (free)",
		activeFrom: null,
		activeTo: null,
		providerIds: ["opencode"],
		modelPrefixes: [],
	},
	{
		id: "command-code",
		name: "Command Code",
		activeFrom: null,
		activeTo: null,
		providerIds: ["commandcode", "command-code"],
		modelPrefixes: [],
	},
	{
		id: "antigravity",
		name: "Antigravity",
		activeFrom: null,
		activeTo: null,
		providerIds: ["antigravity", "gemini"],
		modelPrefixes: ["gemini-"],
	},
	{
		id: "cursor",
		name: "Cursor",
		activeFrom: null,
		activeTo: null,
		providerIds: ["cursor"],
		modelPrefixes: ["composer-", "grok-"],
	},
	{
		id: "meta",
		name: "Meta (Muse)",
		activeFrom: null,
		activeTo: null,
		providerIds: ["muse", "meta"],
		modelPrefixes: ["muse-"],
	},
	{
		id: "mistral",
		name: "Mistral",
		activeFrom: null,
		activeTo: null,
		providerIds: ["mistral"],
		modelPrefixes: ["mistral-", "codestral-", "zai-"],
	},
]

/** Resolves the plan a provider id and model belong to, preferring the provider id. */
export function matchPlan(providerId: string | null | undefined, model: string): PlanId {
	const provider = providerId?.toLowerCase() ?? ""
	if (provider.length > 0) {
		for (const plan of plans) {
			if (plan.providerIds.includes(provider)) return plan.id
		}
	}
	const modelId = model.toLowerCase()
	for (const plan of plans) {
		if (plan.modelPrefixes.some((prefix) => modelId.startsWith(prefix))) return plan.id
	}
	return "unknown"
}
