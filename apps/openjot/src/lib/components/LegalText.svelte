<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";

  let { markdown }: { markdown: string } = $props();

  type Span =
    | { kind: "text"; text: string }
    | { kind: "bold"; text: string }
    | { kind: "link"; text: string; href: string };

  type Block =
    | { type: "h1" | "h2" | "h3"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] };

  function inline(source: string): Span[] {
    const spans: Span[] = [];
    const pattern =
      /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|<((?:https?:\/\/)[^>\s]+)>|(https?:\/\/[^\s<]+)/g;
    let cursor = 0;
    for (const match of source.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) spans.push({ kind: "text", text: source.slice(cursor, index) });
      if (match[1]) spans.push({ kind: "bold", text: match[1] });
      else if (match[2] && match[3]) spans.push({ kind: "link", text: match[2], href: match[3] });
      else if (match[4]) spans.push({ kind: "text", text: match[4] });
      else if (match[5] || match[6]) {
        const href = match[5] ?? match[6];
        spans.push({ kind: "link", text: href, href });
      }
      cursor = index + match[0].length;
    }
    if (cursor < source.length) spans.push({ kind: "text", text: source.slice(cursor) });
    return spans;
  }

  function cells(line: string): string[] {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  function isRule(line: string): boolean {
    return cells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  function blocks(source: string): Block[] {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const out: Block[] = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }
      if (line.startsWith("### ")) {
        out.push({ type: "h3", text: line.slice(4).trim() });
        index += 1;
        continue;
      }
      if (line.startsWith("## ")) {
        out.push({ type: "h2", text: line.slice(3).trim() });
        index += 1;
        continue;
      }
      if (line.startsWith("# ")) {
        out.push({ type: "h1", text: line.slice(2).trim() });
        index += 1;
        continue;
      }
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        while (index < lines.length && lines[index].startsWith("|")) {
          tableLines.push(lines[index]);
          index += 1;
        }
        const parsed = tableLines.filter((row) => !isRule(row)).map(cells);
        if (parsed.length > 0) {
          out.push({ type: "table", headers: parsed[0], rows: parsed.slice(1) });
        }
        continue;
      }
      if (line.startsWith("- ")) {
        const items: string[] = [];
        while (index < lines.length && lines[index].startsWith("- ")) {
          items.push(lines[index].slice(2).trim());
          index += 1;
        }
        out.push({ type: "ul", items });
        continue;
      }
      const paragraph: string[] = [];
      while (
        index < lines.length &&
        lines[index].trim() &&
        !lines[index].startsWith("#") &&
        !lines[index].startsWith("|") &&
        !lines[index].startsWith("- ")
      ) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      out.push({ type: "p", text: paragraph.join(" ") });
    }
    return out;
  }

  const parsed = $derived(blocks(markdown));

  async function openLink(event: MouseEvent, href: string) {
    event.preventDefault();
    try {
      await openUrl(href);
    } catch {
      window.open(href, "_blank", "noopener");
    }
  }
</script>

{#snippet spans(text: string)}
  {#each inline(text) as span}
    {#if span.kind === "bold"}
      <strong class="font-bold text-[var(--text-primary)]">{span.text}</strong>
    {:else if span.kind === "link"}
      <a
        href={span.href}
        class="font-semibold text-[var(--brand-text)] underline underline-offset-2"
        onclick={(event) => openLink(event, span.href)}
      >{span.text}</a>
    {:else}
      {span.text}
    {/if}
  {/each}
{/snippet}

<div class="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
  {#each parsed as block}
    {#if block.type === "h1"}
      <h3 class="text-lg font-extrabold tracking-tight text-[var(--text-primary)]">{block.text}</h3>
    {:else if block.type === "h2"}
      <h4 class="pt-2 text-sm font-extrabold text-[var(--text-primary)]">{block.text}</h4>
    {:else if block.type === "h3"}
      <h5 class="pt-1 text-sm font-bold text-[var(--text-primary)]">{block.text}</h5>
    {:else if block.type === "p"}
      <p>{@render spans(block.text)}</p>
    {:else if block.type === "ul"}
      <ul class="list-disc space-y-1.5 pl-5">
        {#each block.items as item}
          <li>{@render spans(item)}</li>
        {/each}
      </ul>
    {:else if block.type === "table"}
      <div class="space-y-2">
        {#each block.rows as row}
          <div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 space-y-2">
            {#each block.headers as header, index}
              <div>
                <div class="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {header}
                </div>
                <div class="text-xs text-[var(--text-primary)]">{row[index] ?? ""}</div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  {/each}
</div>
