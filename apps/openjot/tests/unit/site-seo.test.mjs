import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (name) => readFileSync(new URL(`../../site/public/${name}`, import.meta.url), "utf8")
const ORIGIN = "https://openjot.trajectonomics.com/"
const html = read("index.html")
const visible = html
	.replace(/<script[\s\S]*?<\/script>/g, "")
	.replace(/<wbr>/g, "")
	.replace(/<[^>]+>/g, "")
	.replace(/\s+/g, "")
const squash = (text) => text.replace(/\s+/g, "")

const graph = () => {
	const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
	assert.ok(match, "the landing page carries a JSON-LD block")
	return JSON.parse(match[1])["@graph"]
}

test("the JSON-LD names the app, its publisher and the site at the canonical address", () => {
	const types = graph().map((node) => [node["@type"]].flat())
	for (const type of ["WebSite", "Organization", "MobileApplication", "FAQPage"]) {
		assert.ok(types.some((t) => t.includes(type)), `${type} is stated`)
	}
	assert.match(html, new RegExp(`<link rel="canonical" href="${ORIGIN}">`))
})

test("the app is free and says only what the page says", () => {
	const app = graph().find((node) => [node["@type"]].flat().includes("MobileApplication"))
	assert.equal(app.offers.price, "0")
	assert.equal(app.isAccessibleForFree, true)
	const written = JSON.stringify(graph())
	for (const claim of ["aggregateRating", "review", "softwareVersion"]) {
		assert.ok(!written.includes(claim), `${claim} is not stated`)
	}
})

test("every FAQ question and answer in the JSON-LD is on the page in the same words", () => {
	const faq = graph().find((node) => node["@type"] === "FAQPage")
	assert.equal(faq.mainEntity.length, 14)
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

test("the sitemap lists both pages, and llms.txt links them", () => {
	for (const page of [ORIGIN, `${ORIGIN}meowjot-alternative`]) {
		assert.match(read("sitemap.xml"), new RegExp(`<loc>${page}</loc>`))
		assert.ok(read("llms.txt").includes(`(${page})`))
	}
})

test("the IndexNow key file holds its own name and nothing else", () => {
	const key = "4bc4ff77c0b12a6d0f261b2c61f7ac41"
	assert.equal(read(`${key}.txt`).trim(), key)
})
