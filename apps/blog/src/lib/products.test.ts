import { describe, expect, test } from "bun:test"
import { inProductOrder, PRODUCTS, productName } from "./products"

describe("Products", () => {
	test("every Product has a non-blank reader-facing name", () => {
		for (const product of PRODUCTS) {
			expect(productName(product).trim().length).toBeGreaterThan(0)
		}
	})

	test("orders Products in the blog's order and deduplicates them", () => {
		expect(inProductOrder(["openjot", "traj", "openjot"])).toEqual(["traj", "openjot"])
		expect(inProductOrder([])).toEqual([])
	})
})
