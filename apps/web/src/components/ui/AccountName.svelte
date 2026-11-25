<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { isNamed, nameOf } from "../../lib/view/account-names"

interface Props {
	/** The Account's id in the plan, which the ledger may name. */
	id: string
	/** The name the result that holds the id gives it, which shows when the ledger lookup has none. */
	name?: string | undefined
}

let { id, name }: Props = $props()
const names = $derived(currentAccountNames())
</script>

<!-- An Account by the name the ledger gives it. An id the ledger does not name (a home the plan buys) shows as the id, in code. -->
{#if isNamed(names, id)}<span data-account={id}>{nameOf(names, id)}</span>{:else if name !== undefined}<span data-account={id}>{name}</span>{:else}<code class="font-mono text-[0.9em]" data-account={id} data-unnamed>{id}</code>{/if}
