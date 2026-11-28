<script lang="ts">
import { FEEDBACK_CHOICES, feedbackIssueUrl } from "./feedback"

let { pathname }: { pathname: string } = $props()
</script>

<div role="group" aria-label="Feedback on this demo" class="flex items-center gap-1">
	<span class="text-xs text-muted-foreground">Feedback</span>
	{#each FEEDBACK_CHOICES as choice (choice.id)}
		<a
			href={feedbackIssueUrl(choice.label, pathname)}
			target="_blank"
			rel="noopener"
			aria-label="Feedback: {choice.label}"
			title={choice.label}
			class="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="8" cy="8" r="6.25" />
				<path d="M6 6.25h.01M10 6.25h.01" />
				{#if choice.id === "good"}
					<path d="M5.4 9.6c.6 1 1.5 1.5 2.6 1.5s2-.5 2.6-1.5" />
				{:else if choice.id === "okay"}
					<path d="M5.4 10.4h5.2" />
				{:else}
					<path d="M5.4 11.2c.6-1 1.5-1.5 2.6-1.5s2 .5 2.6 1.5" />
				{/if}
			</svg>
		</a>
	{/each}
</div>
