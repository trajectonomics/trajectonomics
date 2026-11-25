<script lang="ts">
  import type { Snippet } from "svelte";
  import { snapSheetOffset } from "$lib/sheetSnap";

  let {
    title,
    labelId,
    closeLabel,
    onClose,
    close,
    children,
    actions,
    footer,
    hero,
  }: {
    title: string;
    labelId: string;
    closeLabel: string;
    onClose: () => void;
    close?: { current: (() => void) | null };
    children: Snippet;
    actions?: Snippet;
    footer?: Snippet;
    /** Shown between the handle and the title, e.g. the mascot on "What's new". */
    hero?: Snippet;
  } = $props();

  let sheetEl = $state<HTMLDivElement | null>(null);
  let offset = $state(1200);
  let dragging = $state(false);
  let motion = $state(false);
  let sheetHeight = 1200;
  let closing = false;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  function setOffset(next: number) {
    offset = next;
  }

  function requestClose() {
    if (closing) return;
    closing = true;
    dragging = false;
    motion = true;
    const measured = sheetEl?.offsetHeight ?? 0;
    if (measured > 0) sheetHeight = measured;
    setOffset(sheetHeight);
    dismissTimer = setTimeout(() => onClose(), 270);
  }

  $effect(() => {
    if (close) close.current = requestClose;
  });

  $effect(() => {
    const el = sheetEl;
    if (!el) return;

    const measure = () => {
      const next = el.offsetHeight;
      if (next > 0) sheetHeight = next;
    };
    let cancelled = false;
    measure();
    setOffset(sheetHeight);
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      measure();
      setOffset(sheetHeight);
      requestAnimationFrame(() => {
        if (cancelled) return;
        motion = true;
        requestAnimationFrame(() => {
          if (!cancelled) setOffset(0);
        });
      });
    });

    let startY = 0;
    let startOffset = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let active = false;
    let mode: "undecided" | "sheet" | "scroll" = "undecided";
    let suppressClick = false;

    const onStart = (event: TouchEvent) => {
      if (closing || event.touches.length !== 1) return;
      measure();
      const y = event.touches[0].clientY;
      startY = y;
      lastY = y;
      lastT = event.timeStamp;
      startOffset = offset;
      velocity = 0;
      active = true;
      suppressClick = false;
      const target = event.target;
      const onHandle = target instanceof Element && !!target.closest("[data-sheet-handle]");
      mode = onHandle ? "sheet" : "undecided";
      dragging = mode === "sheet";
    };

    const onMove = (event: TouchEvent) => {
      if (!active || closing || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      const dy = y - startY;
      const dt = Math.max(1, event.timeStamp - lastT);
      velocity = (y - lastY) / dt;
      lastY = y;
      lastT = event.timeStamp;
      const target = event.target;
      const scroller =
        target instanceof Element
          ? (target.closest("[data-sheet-scroll]") as HTMLElement | null)
          : null;
      if (mode === "undecided") {
        if (Math.abs(dy) < 8) return;
        const atTop = !scroller || scroller.scrollTop <= 0;
        mode = startOffset > 6 || !scroller || (atTop && dy > 0) ? "sheet" : "scroll";
        dragging = mode === "sheet";
      }
      if (mode !== "sheet") return;
      if (Math.abs(dy) > 8) suppressClick = true;
      setOffset(Math.max(0, Math.min(sheetHeight, startOffset + dy)));
      if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (!active || closing) return;
      active = false;
      dragging = false;
      if (mode !== "sheet") return;
      measure();
      const dest = snapSheetOffset(offset, velocity, sheetHeight);
      if (dest >= sheetHeight - 1) requestClose();
      else setOffset(dest);
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("click", onClick, true);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("click", onClick, true);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  });

  const backdrop = $derived(Math.max(0, 1 - offset / Math.max(sheetHeight, 1)));
</script>

<button
  type="button"
  class="fixed inset-0 z-50 bg-black"
  style="opacity: {backdrop * 0.5}; transition: {dragging ? 'none' : 'opacity 260ms linear'};"
  aria-label={closeLabel}
  onclick={requestClose}
></button>
<div
  bind:this={sheetEl}
  role="dialog"
  tabindex="-1"
  aria-labelledby={labelId}
  class="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-3xl bg-[var(--bg-card)] shadow-xl"
  style="transform: translateY({offset}px); transition: {motion && !dragging
    ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
    : 'none'}; padding-bottom: max(env(safe-area-inset-bottom), 12px);"
>
  <div data-sheet-handle class="shrink-0 cursor-grab px-5 pt-3 touch-none">
    <div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border-strong)]"></div>
    {#if hero}
      {@render hero()}
    {/if}
    <div class="flex items-center justify-between gap-3">
      <h2 id={labelId} class="text-base font-extrabold text-[var(--text-primary)]">{title}</h2>
      {#if actions}
        {@render actions()}
      {/if}
    </div>
  </div>
  <div data-sheet-scroll class="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
    {@render children()}
  </div>
  {#if footer}
    <div class="shrink-0 border-t border-[var(--border-subtle)] px-5 pt-3">
      {@render footer()}
    </div>
  {/if}
</div>
