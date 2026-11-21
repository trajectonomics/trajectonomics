<script lang="ts">
import type { AccountOption } from "../../lib/view/ledger/transactions"

interface Props {
	options: readonly AccountOption[]
	account: string
	memo: string
	onAccount: (value: string) => void
	onMemo: (value: string) => void
}

let { options, account, memo, onAccount, onMemo }: Props = $props()

const FIELD = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
</script>

<!-- The account choice and the memo search that narrow the loaded transactions. -->
<div class="grid gap-3 sm:grid-cols-2">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-muted-foreground">Account</span>
		<select
			name="account"
			value={account}
			onchange={(event) => onAccount(event.currentTarget.value)}
			class={FIELD}
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-muted-foreground">Memo contains</span>
		<input
			type="search"
			name="memo"
			value={memo}
			placeholder="Any memo"
			oninput={(event) => onMemo(event.currentTarget.value)}
			class={FIELD}
		/>
	</label>
</div>
