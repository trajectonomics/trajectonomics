/** Every Product a Post can be about, in the order the front page's filter lists them. */
export const PRODUCTS = Object.freeze(["traj", "openjot"] as const)

/** One Product. */
export type Product = (typeof PRODUCTS)[number]

/** Each Product's name, which is the same in every Language because it is a name. */
const PRODUCT_NAMES: Readonly<Record<Product, string>> = Object.freeze({
	traj: "traj",
	openjot: "OpenJot",
})

/** A Product's name as a reader sees it. */
export function productName(product: Product): string {
	return PRODUCT_NAMES[product]
}

/** A list of Products in the blog's order, each once. */
export function inProductOrder(products: Iterable<Product>): readonly Product[] {
	const set = new Set(products)
	return Object.freeze(PRODUCTS.filter((product) => set.has(product)))
}
