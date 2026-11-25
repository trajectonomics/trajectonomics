/**
 * A share in basis points as a percentage with two places: 8730 becomes "87.30%", 10000 "100.00%" and
 * 5 "0.05%". The input is the CLI's integer, so the floor and remainder are exact. It is a share, not
 * money (ADR 0002); the CLI states the basis points and the Dashboard only writes them.
 */
export function formatShare(basisPoints: number): string {
	const whole = Math.floor(basisPoints / 100)
	const hundredths = basisPoints % 100
	return `${whole}.${String(hundredths).padStart(2, "0")}%`
}
