<script lang="ts">
  import { Bell, BellRing, Lock, Mail, Smartphone, Sparkles } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { WhatsNewAction, WhatsNewIcon, WhatsNewItem, WhatsNewRelease } from "$lib/whatsNew";

  // The list of "What's new" items (#104), shared by the sheet on Home and the My Moo page.
  // Without `onAction` it is a plain read-only list.
  let {
    releases,
    lang,
    showVersions = false,
    onAction,
    appLockAvailable = false,
    reminderAvailable = false,
  }: {
    releases: WhatsNewRelease[];
    lang: "en" | "th";
    /** Print each release's version and date above its items. */
    showVersions?: boolean;
    /** Called for "Turn on" (app-lock, reminder) and "Send" (feedback). "How to add" is handled here. */
    onAction?: (action: Exclude<WhatsNewAction, "widget-help">) => void;
    /** The app lock and the reminder only exist in the Android app; their buttons hide elsewhere. */
    appLockAvailable?: boolean;
    reminderAvailable?: boolean;
  } = $props();

  const icons = { lock: Lock, "bell-ring": BellRing, smartphone: Smartphone, mail: Mail, bell: Bell, sparkles: Sparkles } satisfies Record<
    WhatsNewIcon,
    typeof Lock
  >;

  let widgetHelpOpen = $state(false);

  function buttonLabel(action: WhatsNewAction): string {
    if (action === "feedback") return t(lang, "whatsNewSend");
    if (action === "widget-help") return t(lang, "whatsNewHowToAdd");
    return t(lang, "whatsNewTurnOn");
  }

  function hasButton(item: WhatsNewItem): boolean {
    if (!onAction || !item.action) return false;
    if (item.action === "app-lock") return appLockAvailable;
    if (item.action === "reminder") return reminderAvailable;
    return true;
  }

  function press(action: WhatsNewAction) {
    if (action === "widget-help") widgetHelpOpen = !widgetHelpOpen;
    else onAction?.(action);
  }

  function formatDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  }
</script>

<div class="space-y-5">
  {#each releases as release (release.version)}
    <section>
      {#if showVersions}
        <h3 class="mb-2 flex items-baseline gap-2 text-sm font-extrabold text-[var(--text-primary)]">
          <span>{release.version}</span>
          <span class="text-xs font-semibold text-[var(--text-muted)]">{formatDate(release.date)}</span>
        </h3>
      {/if}
      <ul class="space-y-3">
        {#each release.items as item (item.id)}
          {@const Icon = icons[item.icon]}
          <li class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Icon class="size-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold text-[var(--text-primary)]">{item.title[lang]}</div>
              <p class="text-xs leading-snug text-[var(--text-muted)]">{item.body[lang]}</p>
              {#if item.action && hasButton(item)}
                <button
                  type="button"
                  onclick={() => press(item.action!)}
                  aria-expanded={item.action === "widget-help" ? widgetHelpOpen : undefined}
                  class="mt-1.5 rounded-full border border-[var(--brand)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--brand-text)] active:bg-[var(--brand-soft)]"
                >
                  {buttonLabel(item.action)}
                </button>
                {#if item.action === "widget-help" && widgetHelpOpen}
                  <p class="mt-1.5 text-xs font-semibold leading-snug text-[var(--text-secondary)]">
                    {t(lang, "whatsNewWidgetSteps")}
                  </p>
                {/if}
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>
