<script lang="ts">
  import type { Snippet } from "svelte";
  import { Trash2 } from "@lucide/svelte";

  const REVEAL_PX = 92;
  const COMMIT_PX = 168;

  let {
    open,
    deleteLabel,
    onOpen,
    onClose,
    onDelete,
    onActivate,
    children,
  }: {
    open: boolean;
    deleteLabel: string;
    onOpen: () => void;
    onClose: () => void;
    onDelete: () => void;
    onActivate: () => void;
    children: Snippet;
  } = $props();

  let offset = $state(0);
  let dragging = $state(false);
  let horizontal = false;
  let startX = 0;
  let startY = 0;
  let origin = 0;

  $effect(() => {
    if (!open && !dragging) offset = 0;
  });

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    origin = open ? -REVEAL_PX : 0;
    dragging = true;
    horizontal = false;
  }

  function onTouchMove(event: TouchEvent) {
    if (!dragging || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (!horizontal) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragging = false;
        return;
      }
      horizontal = true;
    }
    offset = Math.min(0, Math.max(-COMMIT_PX, origin + dx));
  }

  function onTouchEnd() {
    if (!dragging && !horizontal) return;
    dragging = false;
    if (!horizontal) return;
    horizontal = false;
    if (offset <= -(COMMIT_PX - 24)) {
      offset = 0;
      onClose();
      onDelete();
      return;
    }
    if (offset <= -REVEAL_PX / 2) {
      offset = -REVEAL_PX;
      onOpen();
      return;
    }
    offset = 0;
    onClose();
  }

  function activate() {
    if (offset !== 0) {
      offset = 0;
      onClose();
      return;
    }
    onActivate();
  }
</script>

<div
  class="relative overflow-hidden"
  style="touch-action: pan-y;"
  role="group"
  data-swipe-row
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  ontouchcancel={onTouchEnd}
>
  <button
    type="button"
    class="absolute inset-y-0 right-0 flex w-[92px] flex-col items-center justify-center gap-1 bg-rose-600 text-white"
    aria-label={deleteLabel}
    onclick={(event) => {
      event.stopPropagation();
      onDelete();
    }}
  >
    <Trash2 class="size-4" />
    <span class="text-[11px] font-bold">{deleteLabel}</span>
  </button>

  <div
    class="relative bg-[var(--bg-card)]"
    style="transform: translateX({offset}px); transition: {dragging ? 'none' : 'transform 180ms ease'};"
  >
    <button
      type="button"
      class="relative flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:opacity-80"
      onclick={activate}
    >
      {@render children()}
    </button>
  </div>
</div>
