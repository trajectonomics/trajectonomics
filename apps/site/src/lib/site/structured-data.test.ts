import { describe, expect, it } from "bun:test"
import { ABSOLUTE_CLEAN_URL, dictionaryFor } from "../language/languages"
import {
	APPLE_TOUCH_ICON_URL,
	CLI_NAME,
	GITHUB_CLI_URL,
	GITHUB_ORG_URL,
	GITHUB_SKILLS_URL,
	SITE_BRAND_NAME,
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

/** The FAQPage node, the questions the home page's FAQ shows. */
function faq(language: string) {
	const node = structuredData(language)["@graph"][3]
	if (node === undefined) throw new Error("the block names no FAQPage")
	return node
}

/** The SoftwareApplication node, traj itself. */
function traj(language: string) {
	const node = structuredData(language)["@graph"][2]
	if (node === undefined) throw new Error("the block names no SoftwareApplication")
	return node
}

describe("the Structured data a Language home carries", () => {
	it("names the WebSite, the Organization, traj and the FAQ in one graph", () => {
		const block = structuredData("en")
		expect(block["@context"]).toBe("https://schema.org")
		expect(block["@graph"].map((node) => node["@type"])).toEqual([
			"WebSite",
			"Organization",
			"SoftwareApplication",
			"FAQPage",
		])
	})

	it("states the FAQ's questions and answers as the Dictionary gives them, in each Language", () => {
		for (const language of ["en", "th"] as const) {
			const dictionary = dictionaryFor(language)
			const page = faq(language)
			expect(page["@type"]).toBe("FAQPage")
			expect(page.inLanguage).toBe(language)
			expect(page.mainEntity.map((question) => question.name)).toEqual([...dictionary.faqQuestions])
			expect(page.mainEntity.map((question) => question.acceptedAnswer.text)).toEqual([
				...dictionary.faqAnswers,
			])
			for (const question of page.mainEntity) {
				expect(question["@type"]).toBe("Question")
				expect(question.acceptedAnswer["@type"]).toBe("Answer")
			}
		}
	})

	it("states no markup in any FAQ text, because the page would show the tags as text", () => {
		for (const language of ["en", "th"] as const) {
			const dictionary = dictionaryFor(language)
			for (const text of [...dictionary.faqQuestions, ...dictionary.faqAnswers]) {
				expect(text).not.toMatch(/[<>]/)
			}
		}
	})

	it("places the WebSite at the Site's one address, in its Language", () => {
		expect(website("th").url).toBe(ABSOLUTE_CLEAN_URL)
		expect(website("th")["@id"]).toBe(`${ABSOLUTE_CLEAN_URL}#website`)
		expect(website("th").inLanguage).toBe("th")
		expect(website("en").url).toBe(ABSOLUTE_CLEAN_URL)
	})

	it("gives the page the brand's name, traj as its alternate name, and the Dictionary's summary", () => {
		expect(website("en").name).toBe(SITE_BRAND_NAME)
		expect(website("en").alternateName).toBe(CLI_NAME)
		expect(website("th").description).toBe(dictionaryFor("th").description)
	})

	it("points the WebSite's publisher at the Organization's own id", () => {
		expect(website("th").publisher).toEqual({ "@id": organization("th")["@id"] })
		expect(organization("th").url).toBe(SITE_ORIGIN)
		expect(organization("th").name).toBe(SITE_BRAND_NAME)
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
		expect(traj("th").url).toBe(ABSOLUTE_CLEAN_URL)
		expect(traj("th").inLanguage).toBe("th")
		expect(traj("th").description).toBe(dictionaryFor("th").description)
		expect(traj("en").codeRepository).toBe(GITHUB_CLI_URL)
		expect(traj("en").license).toBe(SKILLS_LICENCE_URL)
		expect(traj("en").publisher).toEqual({ "@id": organization("en")["@id"] })
	})

	it("states no claim the page cannot support, such as a rating or a search action", () => {
		const written = structuredDataJson("en")
		for (const claim of ["aggregateRating", "review", "SearchAction"]) {
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
				faq("en"),
			],
		}
		const written = serializeStructuredData(hostile)
		expect(written).not.toContain("</script>")
		expect(JSON.parse(written)["@graph"][0].description).toBe("a </script> inside a description")
	})
})
