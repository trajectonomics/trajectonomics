import { describe, expect, test } from "bun:test"
import { type BlogPostingInput, blogPosting, serializeJsonLd, website } from "./structured-data"

const POST: BlogPostingInput = {
	headline: "A guide to traj",
	description: "How traj works, with every number from a test.",
	datePublished: "2026-11-20",
	image: "https://trajectonomics.com/blog/posts/a/cover.webp",
	inLanguage: "en",
	url: "https://trajectonomics.com/blog/guides/a/",
}

describe("the BlogPosting a Post page states", () => {
	test("names the Post's headline, description, date, language and canonical URL", () => {
		const node = blogPosting(POST)
		expect(node["@type"]).toBe("BlogPosting")
		expect(node.headline).toBe("A guide to traj")
		expect(node.description).toBe(POST.description)
		expect(node.datePublished).toBe("2026-11-20")
		expect(node.inLanguage).toBe("en")
		expect(node.url).toBe(POST.url)
		expect(node.mainEntityOfPage).toBe(POST.url)
	})

	test("names the cover as the image, and the Organization as author and publisher", () => {
		const node = blogPosting(POST)
		expect(node.image).toBe(POST.image)
		const organization = {
			"@type": "Organization" as const,
			name: "Trajectonomics",
			url: "https://trajectonomics.com/",
		}
		expect(node.author).toEqual(organization)
		expect(node.publisher).toEqual(organization)
	})

	test("leaves out the image when the Post names no cover", () => {
		const node = blogPosting({ ...POST, image: undefined })
		expect("image" in node).toBe(false)
	})

	test("is frozen, so a caller cannot change what the page states", () => {
		expect(Object.isFrozen(blogPosting(POST))).toBe(true)
	})

	test("escapes every `<` in the serialized text, so no field can close the script element", () => {
		const written = serializeJsonLd(blogPosting({ ...POST, headline: "a </script> headline" }))
		expect(written).not.toContain("</script>")
		expect(written).toContain("\\u003c/script>")
		expect(JSON.parse(written).headline).toBe("a </script> headline")
	})
})

describe("the WebSite the front page states", () => {
	test("names the blog as a site at the page's own URL, in its language, published by the Organization", () => {
		const node = website({
			description: "Comparisons, guides and news about traj.",
			inLanguage: "th",
			url: "https://trajectonomics.com/blog/th/",
		})
		expect(node["@type"]).toBe("WebSite")
		expect(node.name).toBe("Trajectonomics")
		expect(node.inLanguage).toBe("th")
		expect(node.url).toBe("https://trajectonomics.com/blog/th/")
		expect(node.publisher).toEqual({
			"@type": "Organization" as const,
			name: "Trajectonomics",
			url: "https://trajectonomics.com/",
		})
	})
})
