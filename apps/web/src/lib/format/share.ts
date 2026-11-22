/**
 * A share in basis points as a percentage with two places, with integer string work only: 8730 becomes
 * "87.30%" and 10000 becomes "100.00%". The CLI states the basis points; the Dashboard only writes them.
 */
export function formatShare(basisPoints: number): string {
	const whole = Math.floor(basisPoints / 100)
	const hundredths = basisPoints % 100
	return `${whole}.${String(hundredths).padStart(2, "0")}%`
}
