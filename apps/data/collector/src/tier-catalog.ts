import type { PlanId } from "./plans"
import { antigravity } from "./tier-catalog/antigravity"
import { claude } from "./tier-catalog/claude"
import { cursor } from "./tier-catalog/cursor"
import { opencodeGo } from "./tier-catalog/opencode-go"
import type { PlanCatalog } from "./tier-catalog/types"

export type {
	CatalogTier,
	PlanCatalog,
	TierMultiplier,
	TierSource,
} from "./tier-catalog/types"
export { READ } from "./tier-catalog/types"

/**
 * The hand-kept tier catalogue: every plan whose vendor states a usage multiplier, and the
 * sentence that states it. A plan absent here has no picker; a tier whose multiplier is null has
 * no stated figure for that window.
 */
export const TIER_CATALOG: Partial<Record<PlanId, PlanCatalog>> = Object.freeze({
	claude,
	cursor,
	"opencode-go": opencodeGo,
	antigravity,
})
