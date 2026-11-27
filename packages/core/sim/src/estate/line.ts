import { grownAmount } from "../engine/amount"
import { minBigInt } from "../engine/min"
import { scaleValue } from "../levy/scale"
import type { Inflation } from "../money/inflation"
import type { AccountId, BasisPoints, DateString, EstateCost, EstateGift, Rounding } from "../types"

/** What a row's Accounts are worth, in minor units. */
export interface Worth {
	readonly gross: bigint
	readonly debts: bigint
	readonly byAccount: ReadonlyMap<AccountId, bigint>
}

/** Where a line sits: its row's date, whole years since `Timeline.start`, and the run's inflation. */
export interface Footing {
	readonly date: DateString
	readonly years: number
	readonly inflation: Inflation
}

/** `base * bps / 10000` rounded once; a base below zero counts as zero, so a share is never negative. */
export function shareOf(base: bigint, bps: BasisPoints, rounding: Rounding): bigint {
	return scaleValue(base < 0n ? 0n : base, BigInt(bps), 10_000n, rounding)
}

function base(of: "gross" | { readonly accounts: readonly AccountId[] }, worth: Worth): bigint {
	if (of === "gross") return worth.gross
	return of.accounts.reduce((sum, id) => sum + (worth.byAccount.get(id) ?? 0n), 0n)
}

/** One cost's amount on a row: a share of the gross estate or of named Accounts, or a grown fixed amount. */
export function costAmount(cost: EstateCost, worth: Worth, footing: Footing): bigint {
	if ("amount" in cost) {
		return grownAmount(cost.amount, cost.growth, footing.years, footing.inflation, footing.date)
	}
	return shareOf(base(cost.of, worth), cost.bps, cost.rounding)
}

/** A gift's wish: a share of the net estate (zero when net is not above zero) or a grown fixed amount. */
function wish(gift: EstateGift, net: bigint, footing: Footing): bigint {
	if ("amount" in gift)
		return grownAmount(gift.amount, gift.growth, footing.years, footing.inflation, footing.date)
	return shareOf(net, gift.bps, gift.rounding)
}

/** Each gift in order, taking at most what the earlier ones left of `max(0, net)`. */
export function giftAmounts(
	gifts: readonly EstateGift[],
	net: bigint,
	footing: Footing,
): readonly bigint[] {
	let left = net < 0n ? 0n : net
	return gifts.map((gift) => {
		const wanted = wish(gift, net, footing)
		const taken = minBigInt(wanted, left)
		left -= taken
		return taken
	})
}
