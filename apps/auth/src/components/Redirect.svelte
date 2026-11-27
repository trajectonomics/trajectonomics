<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { readSession } from "../client/auth"
import { dictionaryFor, type Language, pagePath } from "../lib/language"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
const account = $derived(pagePath(language, "account"))
const signIn = $derived(pagePath(language, "sign-in"))

onMount(async () => {
	// A failed sign-in now goes straight to the sign-in page with `?error=`. This forwarding stays
	// for an older `/?error=` link; the sign-in page turns the marker into words.
	if (new URLSearchParams(window.location.search).has("error")) {
		window.location.replace(`${signIn}?error=1`)
		return
	}
	try {
		const session = (await readSession()).session
		window.location.replace(session === null ? signIn : account)
	} catch {
		window.location.replace(signIn)
	}
})
</script>

<p class="redirect"><a href={account}>{words.redirectContinue}</a></p>
