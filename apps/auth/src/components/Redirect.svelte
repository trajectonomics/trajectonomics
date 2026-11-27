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
	try {
		const session = (await readSession()).session
		window.location.replace(session === null ? signIn : account)
	} catch {
		window.location.replace(signIn)
	}
})
</script>

<p class="redirect"><a href={account}>{words.redirectContinue}</a></p>
