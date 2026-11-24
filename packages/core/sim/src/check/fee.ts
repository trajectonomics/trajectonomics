import { ROUNDINGS } from "../vocab"
import type { Check } from "./codes"
import { boundedInt, oneOf } from "./scalars"
import { checkShape, type Field, isRecord, opt, req } from "./shape"

/** The `fee` field of an asset Account: a yearly share of value, and how a monthly charge rounds (ADR 0028). */
const SHAPE = {
	bps: req(boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")),
	rounding: req(oneOf(ROUNDINGS, "INVALID_ROUNDING")),
}

const fee: Check = (value, path, emit) => void checkShape(value, path, SHAPE, emit)

export const feeField: Field = opt(fee)

/** The id of an Account that charges a fee: one with a fee above 0 bps (a fee of 0 bps is none, ADR 0028). */
export function chargingAccountId(account: unknown): string | undefined {
	if (!isRecord(account) || typeof account["id"] !== "string") return undefined
	const fee = account["fee"]
	return isRecord(fee) && typeof fee["bps"] === "number" && fee["bps"] > 0
		? account["id"]
		: undefined
}
