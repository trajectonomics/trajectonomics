import { describe, expect, test } from "bun:test"
import { BRAND_ASSETS, brandFile } from "./copy-brand-assets"

describe("the brand files the blog serves", () => {
	test.each(BRAND_ASSETS)("the brand package ships %s/%s", async (folder, file) => {
		expect(await Bun.file(brandFile(folder, file)).exists()).toBe(true)
	})
})
