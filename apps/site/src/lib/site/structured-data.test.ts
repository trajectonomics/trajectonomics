import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl, dictionaryFor } from "../language/languages"
import {
	APPLE_TOUCH_ICON_URL,
	CLI_NAME,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	SITE_NAME,
	SITE_ORIGIN,
	SKILLS_LICENCE_URL,
} from "../site"
import {
	type StructuredData,
	serializeStructuredData,
	structuredData,
	structuredDataJson,
} from "./structured-data"

/** The WebSite node of one Language's home, for a test that names a property. */
function website(language: string) {
	const node = structuredData(language)["@graph"][0]
	if (node === undefined) throw new Error("the block names no WebSite")
	return node
}

/** The Organization node, the publisher the WebSite and traj point at. */
function organization(language: string) {
	const node = structuredData(language)["@graph"][1]
	if (node === undefined) throw new Error("the block names no Organization")
	return node
}

/** The SoftwareApplication node, traj itself. */
function traj(language: string) {
	const node = structuredData(language)["@graph"][2]
	if (node === undefined) throw new Error("the block names no SoftwareApplication")
	return node
}

describe("the Structured data a Language home carries", () => {
	it("names the WebSite, the Organization and traj in one graph", () => {
		const block = structuredData("en")
		expect(block["@context"]).toBe("https://schema.org")
		expect(block["@graph"].map((node) => node["@type"])).toEqual([
			"WebSite",
			"Organization",
			"SoftwareApplication",
		])
	})

	it("places the WebSite at the home's own absolute Locale URL, in its Language", () => {
		expect(website("th").url).toBe(absoluteLocaleUrl("th"))
		expect(website("th")["@id"]).toBe(`${absoluteLocaleUrl("th")}#website`)
		expect(website("th").inLanguage).toBe("th")
	})

	it("gives the page the Site's name and the summary the Dictionary states", () => {
		expect(website("en").name).toBe(SITE_NAME)
		expect(website("th").description).toBe(dictionaryFor("th").description)
	})

	it("points the WebSite's publisher at the Organization's own id", () => {
		expect(website("th").publisher).toEqual({ "@id": organization("th")["@id"] })
		expect(organization("th").url).toBe(SITE_ORIGIN)
		expect(organization("th").name).toBe(SITE_NAME)
	})

	it("names the Organization's mark and the three places it publishes", () => {
		expect(organization("en").logo).toBe(APPLE_TOUCH_ICON_URL)
		expect(organization("en").logo.startsWith(SITE_ORIGIN)).toBe(true)
		expect(organization("en").sameAs).toEqual([GITHUB_ORG_URL, GITHUB_CLI_URL, GITHUB_SKILLS_URL])
	})

	it("describes traj as a free application for personal money that runs on all three platforms", () => {
		const node = traj("en")
		expect(node.name).toBe(CLI_NAME)
		expect(node.applicationCategory).toBe("FinanceApplication")
		expect(node.operatingSystem).toBe("macOS, Linux, Windows")
		expect(node.isAccessibleForFree).toBe(true)
		expect(node.offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: "USD" })
	})

	it("gives traj the page's own URL, Language and summary, and the repository it is built in", () => {
		expect(traj("th").url).toBe(absoluteLocaleUrl("th"))
		expect(traj("th").inLanguage).toBe("th")
		expect(traj("th").description).toBe(dictionaryFor("th").description)
		expect(traj("en").codeRepository).toBe(GITHUB_CLI_URL)
		expect(traj("en").license).toBe(SKILLS_LICENCE_URL)
		expect(traj("en").publisher).toEqual({ "@id": organization("en")["@id"] })
	})

	it("states no claim the page cannot support, such as a rating, a search action or an FAQ", () => {
		const written = structuredDataJson("en")
		for (const claim of ["aggregateRating", "review", "SearchAction", "FAQPage"]) {
			expect(written).not.toContain(claim)
		}
	})

	it("hands the block out frozen, so a caller cannot edit what the page states", () => {
		const block = structuredData("en")
		expect(Object.isFrozen(block)).toBe(true)
		expect(Object.isFrozen(block["@graph"])).toBe(true)
		for (const node of block["@graph"]) expect(Object.isFrozen(node)).toBe(true)
		expect(Object.isFrozen(organization("en").sameAs)).toBe(true)
		expect(Object.isFrozen(traj("en").offers)).toBe(true)
	})

	it("serializes to text a JSON parser reads back as the same block", () => {
		expect(JSON.parse(structuredDataJson("th"))).toEqual(structuredData("th"))
	})

	it("escapes every `<`, so no text a page carries can close the script element", () => {
		const hostile: StructuredData = {
			"@context": "https://schema.org",
			"@graph": [
				{ ...website("en"), description: "a </script> inside a description" },
				organization("en"),
				traj("en"),
			],
		}
		const written = serializeStructuredData(hostile)
		expect(written).not.toContain("</script>")
		expect(JSON.parse(written)["@graph"][0].description).toBe("a </script> inside a description")
	})
})
