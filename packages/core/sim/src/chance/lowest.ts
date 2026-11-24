import type { MinorUnits } from "../types"

/** The least value of a path's roll-up net worths and the first roll-up index that holds it. */
export function lowestOf(netWorth: readonly MinorUnits[]): { value: MinorUnits; at: number } {
	let at = 0
	for (let index = 1; index < netWorth.length; index++) {
		if (netWorth[index]! < netWorth[at]!) at = index
	}
	return { value: netWorth[at]!, at }
}
