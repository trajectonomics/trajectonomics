import { describe, expect, it } from "bun:test"
import { absoluteLocaleUrl, dictionaryFor } from "../language/languages"
import { SITE_NAME, SITE_ORIGIN } from "../site"
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

/** The Organization node, the publisher the WebSite points at. */
function organization(language: string) {
	const node = structuredData(language)["@graph"][1]
	if (node === undefined) throw new Error("the block names no Organization")
	return node
}

describe("the Structured data a Language home carries", () => {
	it("names the WebSite and the Organization in one graph", () => {
		const block = structuredData("en")
		expect(block["@context"]).toBe("https://schema.org")
		expect(block["@graph"].map((node) => node["@type"])).toEqual(["WebSite", "Organization"])
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

	it("hands the block out frozen, so a caller cannot edit what the page states", () => {
		const block = structuredData("en")
		expect(Object.isFrozen(block)).toBe(true)
		expect(Object.isFrozen(block["@graph"])).toBe(true)
		expect(Object.isFrozen(block["@graph"][0])).toBe(true)
		expect(Object.isFrozen(block["@graph"][1])).toBe(true)
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
			],
		}
		const written = serializeStructuredData(hostile)
		expect(written).not.toContain("</script>")
		expect(JSON.parse(written)["@graph"][0].description).toBe("a </script> inside a description")
	})
})
