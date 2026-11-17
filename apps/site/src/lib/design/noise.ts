/** The lattices the noise is summed from, and each one's weight. Wrapped, so the tile has no seam. */
const OCTAVES: readonly { readonly lattice: number; readonly weight: number }[] = Object.freeze([
	{ lattice: 4, weight: 1 },
	{ lattice: 8, weight: 0.5 },
	{ lattice: 16, weight: 0.25 },
])

/** A lattice coordinate wrapped into the tile, so the right edge continues the left one. */
function wrapped(value: number, lattice: number): number {
	return ((value % lattice) + lattice) % lattice
}

/** The deterministic value at one lattice point: the shader's `hash11`, without a GPU. */
function latticeValue(x: number, y: number, lattice: number, seed: number): number {
	const noise =
		Math.sin(wrapped(x, lattice) * 127.1 + wrapped(y, lattice) * 311.7 + seed * 74.7) * 43758.5453
	return noise - Math.floor(noise)
}

/** The smoothstep a value noise eases its lattice with. */
function ease(t: number): number {
	return t * t * (3 - 2 * t)
}

/** Value noise at `u`, `v` in 0–1, on a lattice that wraps at the tile's edge. */
function valueNoise(u: number, v: number, lattice: number, seed: number): number {
	const x = u * lattice
	const y = v * lattice
	const x0 = Math.floor(x)
	const y0 = Math.floor(y)
	const fx = ease(x - x0)
	const fy = ease(y - y0)
	const top =
		latticeValue(x0, y0, lattice, seed) +
		(latticeValue(x0 + 1, y0, lattice, seed) - latticeValue(x0, y0, lattice, seed)) * fx
	const bottom =
		latticeValue(x0, y0 + 1, lattice, seed) +
		(latticeValue(x0 + 1, y0 + 1, lattice, seed) - latticeValue(x0, y0 + 1, lattice, seed)) * fx
	return top + (bottom - top) * fy
}

/**
 * The fractal noise a field is shaped from: three wrapped octaves, so a tile of it repeats
 * seamlessly. `u` and `v` run 0–1 across one tile, and the same seed prints the same noise.
 */
export function tileableNoise(u: number, v: number, seed: number): number {
	let sum = 0
	let weights = 0
	for (const { lattice, weight } of OCTAVES) {
		sum += valueNoise(u, v, lattice, seed) * weight
		weights += weight
	}
	return sum / weights
}
