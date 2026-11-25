<script lang="ts">
  import { Lock } from "@lucide/svelte";
  import MooMascot from "./MooMascot.svelte";
  import { t } from "$lib/i18n";

  // The opt-in app lock's cover (#79). It hides everything under it; the page decides when it
  // shows and runs the unlock prompt.
  let {
    lang,
    busy = false,
    message = null,
    onUnlock,
  }: {
    lang: "en" | "th";
    /** The unlock prompt is open. */
    busy?: boolean;
    /** Why the last try didn't unlock, if it says anything useful. */
    message?: string | null;
    onUnlock: () => void;
  } = $props();
</script>

<div
  class="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[var(--bg-canvas)] px-8 text-center"
  role="dialog"
  aria-modal="true"
  aria-labelledby="lock-title"
>
  <MooMascot mood="idle" size="lg" interactive={false} alt="MooJot" />
  <div class="space-y-1.5">
    <h1 id="lock-title" class="flex items-center justify-center gap-2 text-xl font-extrabold text-[var(--text-primary)]">
      <Lock class="size-5 text-[var(--brand)]" />
      {t(lang, "appLockLocked")}
    </h1>
    <p class="text-sm text-[var(--text-muted)]">{t(lang, "appLockLockedHint")}</p>
  </div>
  <button
    type="button"
    onclick={onUnlock}
    disabled={busy}
    class="w-full max-w-xs rounded-full bg-[var(--brand)] py-3 text-sm font-bold text-white shadow-sm active:bg-[var(--brand-deep)] disabled:opacity-60"
  >
    {t(lang, "appLockUnlock")}
  </button>
  {#if message}
    <p class="max-w-xs text-xs text-[var(--text-muted)]" role="status">{message}</p>
  {/if}
</div>
