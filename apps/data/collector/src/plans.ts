import { type PlanTier, TIERS } from "./tiers"

// The dated tier history lives in its own module: the plan table plus that history is over the
// file-length cap. `./plans` still exports everything a reader of the plan table needs.
export type { PlanTier } from "./tiers"
export { TIERS, tierOn, tierRangeOn } from "./tiers"

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
	/** The plan's dated tier history; empty when we do not know its tier. */
	tiers: readonly PlanTier[]
}

/** The fields that differ between plans; the rest are filled by `seed`. */
type PlanSeed = Pick<PlanDefinition, "id" | "name" | "providerIds" | "modelPrefixes">

/** Fills the fields every plan shares today, and reads its tier history from the table. */
function seed(plan: PlanSeed): PlanDefinition {
	return { ...plan, activeFrom: null, activeTo: null, tiers: TIERS[plan.id] }
}

const seeds: readonly PlanSeed[] = [
	{
		id: "claude",
		name: "Claude",
		providerIds: ["anthropic", "claude", "claudeagent"],
		modelPrefixes: ["claude-"],
	},
	{
		id: "opencode-go",
		name: "OpenCode Go",
		providerIds: ["opencode-go"],
		modelPrefixes: [],
	},
	{
		id: "opencode-free",
		name: "OpenCode (free)",
		providerIds: ["opencode"],
		modelPrefixes: [],
	},
	{
		id: "command-code",
		name: "Command Code",
		providerIds: ["commandcode", "command-code"],
		modelPrefixes: [],
	},
	{
		id: "antigravity",
		name: "Antigravity",
		providerIds: ["antigravity", "gemini"],
		modelPrefixes: ["gemini-"],
	},
	{
		id: "cursor",
		name: "Cursor",
		providerIds: ["cursor"],
		modelPrefixes: ["composer-", "grok-"],
	},
	{
		id: "meta",
		name: "Meta (Muse)",
		providerIds: ["muse", "meta"],
		modelPrefixes: ["muse-"],
	},
	{
		id: "mistral",
		name: "Mistral",
		providerIds: ["mistral"],
		modelPrefixes: ["mistral-", "codestral-", "zai-"],
	},
]

export const plans: readonly PlanDefinition[] = seeds.map(seed)

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
