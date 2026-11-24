import { FUNDINGS } from "./terms"

/** A Contribution into an asset: a target spends Available cashflow, an obligation is paid in full (sim ADR 0021). */
export const fundingShape: Record<string, unknown> = {
	enum: [...FUNDINGS],
	description:
		"Contribution into an asset only: `target` (the default when absent) is capped by that day's Available cashflow, as `target` describes; `obligation` is a purchase, paid in full whatever the day's cash: it is subtracted before Available cashflow, drawn from `cashflow.withdraw` when the day's cash is short, a Shortfall when that is short too, and the asset need not be in `cashflow.contribute`. A same-date withdrawal from a liability brings borrowed cash in first. `employer` is the employer's own share paid into the Account (a provident fund match, say): it lands on its date in full, outside the household's cash, so it is never capped, never a Shortfall and not in income or spending, and it stops with earned income. It takes an `amount` or a `derive` (usually a share of a salary Flow's gross, which `traj` does not choose), is refused into a liability or an illiquid asset, and carries no member's retirement allowance label, because only the member's own money is deductible. Refused on a liability, where a debt payment is already an obligation.",
}
