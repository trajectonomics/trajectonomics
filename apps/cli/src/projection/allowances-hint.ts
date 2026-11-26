/** Why a suggestion has no target Account, and what the caller does about it (cli ADR-0061). */
export function noTargetHint(label: string, withdrawn: readonly string[]): string {
	if (withdrawn.length > 0) {
		return `The contribution of this plan that carries ${label} pays into ${withdrawn.join(", ")}, which the plan draws from (cashflow.withdraw), and the engine refuses a lump sum into it. Take the Account out of cashflow.withdraw, or add another asset Account for the purchase, then add this Flow with that Account as its target.`
	}
	return `No contribution of this plan carries ${label}. Pick the asset Account that will hold it, adding one to the Scenario if none fits, then add this Flow with that Account as its target.`
}
