import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

const read = (name) => readFileSync(new URL(`../../site/public/${name}`, import.meta.url), "utf8")
const ORIGIN = "https://openjot.trajectonomics.com/"
const LANDING = "https://trajectonomics.com/openjot/"
const html = read("meowjot-alternative.html")
const visible = html
	.replace(/<script[\s\S]*?<\/script>/g, "")
	.replace(/<wbr>/g, "")
	.replace(/<[^>]+>/g, "")
	.replace(/\s+/g, "")
const squash = (text) => text.replace(/\s+/g, "")

const graph = () => {
	const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
	assert.ok(match, "the comparison page carries a JSON-LD block")
	return JSON.parse(match[1])["@graph"]
}

test("the landing page is no longer served on this host", () => {
	assert.equal(existsSync(new URL("../../site/public/index.html", import.meta.url)), false)
})

test("the JSON-LD names the comparison page, its breadcrumb and its FAQ", () => {
	const types = graph().map((node) => [node["@type"]].flat())
	for (const type of ["WebPage", "BreadcrumbList", "FAQPage"]) {
		assert.ok(types.some((t) => t.includes(type)), `${type} is stated`)
	}
	assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN}meowjot-alternative">`))
	const breadcrumb = graph().find((node) => node["@type"] === "BreadcrumbList")
	assert.equal(breadcrumb.itemListElement[0].item, LANDING)
})

test("the page is free, and states no claim it cannot support", () => {
	const written = JSON.stringify(graph())
	for (const claim of ["aggregateRating", "review", "reviewRating", "softwareVersion"]) {
		assert.ok(!written.includes(claim), `${claim} is not stated`)
	}
})

test("every FAQ question and answer in the JSON-LD is on the page in the same words", () => {
	const faq = graph().find((node) => node["@type"] === "FAQPage")
	assert.equal(faq.mainEntity.length, 6)
	for (const question of faq.mainEntity) {
		assert.ok(visible.includes(squash(question.name)), `question on the page: ${question.name}`)
		for (const sentence of question.acceptedAnswer.text.split(". ")) {
			assert.ok(visible.includes(squash(sentence.replace(/\.$/, ""))), `answer on the page: ${sentence}`)
		}
	}
})

test("robots.txt names the sitemap and keeps the worker's redirects out of the index", () => {
	const robots = read("robots.txt")
	assert.match(robots, /^Sitemap: https:\/\/openjot\.trajectonomics\.com\/sitemap\.xml$/m)
	for (const path of ["/download", "/go", "/api/", "/ingest/"]) {
		assert.match(robots, new RegExp(`^Disallow: ${path}$`, "m"))
	}
	assert.doesNotMatch(robots, /^Disallow: \/\s*$/m)
})

test("the sitemap lists the comparison page, and llms.txt names the Site's landing page", () => {
	assert.match(read("sitemap.xml"), new RegExp(`<loc>${ORIGIN}meowjot-alternative</loc>`))
	const llms = read("llms.txt")
	assert.ok(llms.includes(`(${LANDING})`), "llms.txt links the landing page on the Site")
	assert.ok(llms.includes(`(${ORIGIN}meowjot-alternative)`), "llms.txt links the comparison page")
	assert.ok(llms.includes(`(${ORIGIN}download)`), "llms.txt links the download short link")
})

test("the comparison page's home and install links point at the Site's OpenJot page", () => {
	assert.match(html, new RegExp(`class="brand" href="${LANDING}"`))
	assert.match(html, new RegExp(`href="${LANDING}#install"`))
	assert.match(html, /href="\/download"/)
})

test("the IndexNow key file holds its own name and nothing else", () => {
	const key = "4bc4ff77c0b12a6d0f261b2c61f7ac41"
	assert.equal(read(`${key}.txt`).trim(), key)
})
