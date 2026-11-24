---
title: "Open Source ที่ developer ใช้แทนของเสียเงิน: ลิสต์ที่ผมใช้จริง (24 พ.ย. 2026)"
description: "ลิสต์ Open Source ที่ผมใช้แทน Grok Bot, Cursor, Wispr Flow, Raycast, Mac และ Windows ณ 24 พ.ย. 2026 พร้อมไลเซนส์และลิงก์ต้นทางทุกตัว แยกชัดว่าตัวไหนผมใช้เอง ตัวไหนแค่น่าสนใจ"
type: guide
publishedOn: 2026-11-25
cover:
  src: /posts/open-source-stack/cover.webp
  alt: หุ่นยนต์สีครีมตาสีส้มยืนเอามือแตะคางอยู่บนเนินทรายลายไม้ใต้ท้องฟ้าสีเข้ม
  width: 1024
  height: 1024
---

> **ลิสต์ ณ 24 พฤศจิกายน 2026** (วันที่ถ่ายคลิป) — ไลเซนส์ทุกตัวในบทความนี้อ่านจาก GitHub วันที่ 25 พ.ย. 2026 ตรวจซ้ำเองได้ด้วยคำสั่งท้ายบทความ ไลเซนส์และแพ็กเกจของแต่ละโปรเจกต์เปลี่ยนได้ เช็กหน้า repo ก่อนเอาไปใช้ในงานบริษัทเสมอ

ในคลิปสั้นผมชี้ให้ดูแค่ 3 ตัว (Grok Bot, Cursor, Wispr Flow) เพราะคลิปยาวแค่ราว 14 วินาที บทความนี้คือลิสต์เต็ม แบ่งตามงานที่มันมาแทน และแยกเป็น 2 กลุ่มให้ชัด:

- **ผมใช้เอง** คือของที่ติดตั้งและใช้อยู่จริงบนเครื่องผม
- **น่าสนใจ** คือของที่ผมหาเจอและดูดี แต่ยังไม่ได้ใช้เอง ไม่ได้รับรองว่าดีกว่า

## สรุปทั้งหมดในตารางเดียว

| แทน | ผมใช้เอง | น่าสนใจ (ยังไม่ได้ใช้) |
| --- | --- | --- |
| Mac | Omarchy | |
| Windows | Ubuntu Desktop | |
| Grok Bot | Hermes Agent, OpenMausBot, OpenBot ★ | OpenClaw |
| Cursor (agent) | T3 Code, Orca, OpenCode, Pi | Cline, Goose |
| Cursor (IDE) | Zed | |
| Wispr Flow | Vocalinux | Handy, OpenWhispr |
| Raycast | Vicinae | |
| Warp | | Ghostty |
| Postman | | Bruno |
| GitHub Desktop | | Lazygit |
| Docker Desktop | | Podman |
| Figma | | Penpot |
| TablePlus | | DBeaver Community |

โลโก้ในการ์ดแต่ละหัวข้อเป็นเครื่องหมายของเจ้าของแต่ละโปรเจกต์ ใช้เพื่อให้จำหน้าตาแอปได้เท่านั้น

★ OpenBot **ไม่ใช่ Open Source** ใช้ไลเซนส์ PolyForm Noncommercial ใช้ฟรีได้เฉพาะงานที่ไม่เชิงพาณิชย์ รายละเอียดอยู่ในหัวข้อบอทด้านล่าง

## เครื่อง: แทน Mac และ Windows

![การ์ดเทียบ: Omarchy (MIT) แทน Mac และ Ubuntu Desktop (ดาวน์โหลดฟรี) แทน Windows ทั้งสองตัวผมใช้เอง](/posts/open-source-stack/machine.webp)

- **[Omarchy](https://github.com/omacom/omarchy) ([omarchy.org](https://omarchy.org))** · MIT — Linux แบบจัดมาให้พร้อมใช้ (Beautiful, Modern & Opinionated Linux ตามคำของโปรเจกต์) ผมใช้แทน Mac
- **[Ubuntu Desktop](https://ubuntu.com/download/desktop)** · ดาวน์โหลดฟรี — เครื่องทำงานของผมคือ Ubuntu 26.04 ผมใช้แทน Windows

## บอท: แทน Grok Bot

![การ์ดเทียบ: แทน Grok Bot ด้วย Hermes Agent (MIT) และ OpenMausBot (Apache-2.0) ที่ผมใช้เอง, OpenBot (PolyForm Noncommercial ไม่เชิงพาณิชย์) และ OpenClaw (MIT น่าสนใจ)](/posts/open-source-stack/bot.webp)

- **[Hermes Agent](https://github.com/NousResearch/hermes-agent)** · MIT — Agent จาก Nous Research ("The agent that grows with you")
- **[OpenMausBot](https://github.com/milind-soni/OpenMausBot)** · Apache-2.0 — ตัวโปรเจกต์บอกเองว่าเป็น Open-source Grok Bot alternative มีเครื่องเสมือน (VM) ให้บอทใช้งาน
- **[OpenBot](https://github.com/nightly-labs/openbot) ★** · [PolyForm Noncommercial 1.0.0](https://github.com/nightly-labs/openbot/blob/main/LICENSE) — Desktop workspace แบบ local-first สำหรับรัน Codex, Claude และ Grok เป็นทีม **ไม่ใช่ Open Source** ฟรีเฉพาะงานที่ไม่เชิงพาณิชย์
- **[OpenClaw](https://github.com/openclaw/openclaw)** · _น่าสนใจ ยังไม่ได้ใช้_ · MIT — ผู้ช่วย AI ที่ลงมือทำงานให้ได้จริง รันได้หลายระบบ

## เอเจนต์เขียนโค้ด: แทน Cursor (agent)

![การ์ดเทียบ: แทน Cursor ด้วย T3 Code, Orca, OpenCode และ Pi (MIT ผมใช้เอง) กับ Cline และ Goose (Apache-2.0 น่าสนใจ)](/posts/open-source-stack/agent.webp)

- **[T3 Code](https://github.com/pingdotgg/t3code)** · MIT — คุม Claude Code, Codex และตัวอื่น ๆ จากคอมเครื่องไหนหรือมือถือก็ได้ ผมเขียนวิธีตั้งค่าไว้ใน [วิธีเขียนโค้ดจากมือถือด้วย T3 Code](/th/guides/coding-from-mobile-t3-code/)
- **[Orca](https://github.com/stablyai/orca)** · MIT — รันบอทหลายตัวพร้อมกันด้วย subscription ของเราเอง มีทั้งเดสก์ท็อป มือถือ และ remote runtime
- **[OpenCode](https://github.com/anomalyco/opencode)** · MIT — Coding agent แบบ open source
- **[Pi](https://github.com/earendil-works/pi) ([pi.dev](https://pi.dev))** · MIT — ชุดเครื่องมือสร้าง agent มี LLM API รวม, agent loop, TUI และ coding agent CLI
- **[Cline](https://github.com/cline/cline)** · _น่าสนใจ ยังไม่ได้ใช้_ · Apache-2.0 — Coding agent ใช้ได้ทั้งเป็น SDK, ส่วนเสริม IDE หรือ CLI
- **[Goose](https://github.com/aaif-goose/goose)** · _น่าสนใจ ยังไม่ได้ใช้_ · Apache-2.0 — AI agent ที่ติดตั้ง รัน แก้ และทดสอบโค้ดได้ ใช้กับ LLM ตัวไหนก็ได้

## เอดิเตอร์: แทน Cursor (IDE)

![การ์ดเทียบ: Zed (GPL-3.0-or-later) แทน Cursor ผมใช้เอง](/posts/open-source-stack/editor.webp)

- **[Zed](https://github.com/zed-industries/zed)** · GPL-3.0-or-later (ตัวเอดิเตอร์) — Code editor ความเร็วสูง ทำงานร่วมกันหลายคนได้ จากทีมที่สร้าง Atom และ Tree-sitter repo มีไลเซนส์หลายแบบ ([LICENSE-GPL](https://github.com/zed-industries/zed/blob/main/LICENSE-GPL), [LICENSE-APACHE](https://github.com/zed-industries/zed/blob/main/LICENSE-APACHE))

## พิมพ์ด้วยเสียง: แทน Wispr Flow

![การ์ดเทียบ: แทน Wispr Flow ด้วย Vocalinux (AGPL-3.0 ผมใช้เอง), Handy และ OpenWhispr (MIT น่าสนใจ)](/posts/open-source-stack/voice.webp)

- **[Vocalinux](https://github.com/VocaHQ/vocalinux)** · AGPL-3.0 — พิมพ์ด้วยเสียงบน Linux แบบออฟไลน์ 100% ใช้ whisper.cpp, Whisper หรือ VOSK ใช้ได้ทั้ง X11 และ Wayland ตัวนี้ผมใช้เอง
- **[Handy](https://github.com/cjpais/Handy)** · _น่าสนใจ ยังไม่ได้ใช้_ · MIT — แปลงเสียงเป็นข้อความ ฟรี ทำงานออฟไลน์ทั้งหมด
- **[OpenWhispr](https://github.com/OpenWhispr/openwhispr)** · _น่าสนใจ ยังไม่ได้ใช้_ · MIT — พิมพ์ด้วยเสียง เลือกได้ทั้งโมเดลในเครื่อง (Parakeet/Whisper) หรือโมเดลบน cloud ด้วย API key ของเราเอง

## ลันเชอร์: แทน Raycast

![การ์ดเทียบ: Vicinae (GPL-3.0) แทน Raycast ผมใช้เอง](/posts/open-source-stack/launcher.webp)

- **[Vicinae](https://github.com/vicinaehq/vicinae)** · GPL-3.0 — ลันเชอร์บนเดสก์ท็อป native เร็ว และต่อเติมได้

## แอปอื่นที่ developer เปิดทุกวัน (น่าสนใจ ยังไม่ได้ใช้)

![การ์ดเทียบ: Ghostty แทน Warp, Bruno แทน Postman, Lazygit แทน GitHub Desktop, Podman แทน Docker Desktop, Penpot แทน Figma, DBeaver Community แทน TablePlus ทั้งหมดน่าสนใจ ยังไม่ได้ใช้](/posts/open-source-stack/apps.webp)

- **[Ghostty](https://github.com/ghostty-org/ghostty)** แทน Warp · MIT — Terminal ที่เร็ว ใช้ UI ของระบบและ GPU
- **[Bruno](https://github.com/usebruno/bruno)** แทน Postman · MIT — IDE สำหรับลองและทดสอบ API ตัวโปรเจกต์บอกเองว่าเป็นทางเลือกเบา ๆ แทน Postman/Insomnia
- **[Lazygit](https://github.com/jesseduffield/lazygit)** แทน GitHub Desktop · MIT — หน้าจอ git ใน terminal
- **[Podman](https://github.com/podman-container-tools/podman)** แทน Docker Desktop · Apache-2.0 — จัดการ container และ pod มาตรฐาน OCI
- **[Penpot](https://github.com/penpot/penpot)** แทน Figma · MPL-2.0 — แพลตฟอร์มออกแบบแบบ open source สำหรับทีมโปรดักต์
- **[DBeaver Community](https://github.com/dbeaver/dbeaver)** แทน TablePlus · Apache-2.0 — เครื่องมือฐานข้อมูลและ SQL client ฟรี

## ตรวจไลเซนส์ซ้ำเอง

ไลเซนส์ในบทความนี้มาจาก GitHub API รันซ้ำได้ด้วย [GitHub CLI](https://cli.github.com):

```bash
gh api repos/VocaHQ/vocalinux -q .license.spdx_id
# AGPL-3.0
```

เปลี่ยน `VocaHQ/vocalinux` เป็น repo ที่อยากเช็ก บาง repo (OpenBot, Zed) ตอบ `NOASSERTION` เพราะ GitHub อ่านไลเซนส์ไม่ออก ให้เปิดไฟล์ LICENSE ใน repo ดูเอง แบบที่ผมทำในรายการด้านบน

---

ถ้าอยากเห็นว่าผมเลือก AI subscription ยังไงในแต่ละงบ อ่านต่อได้ที่ [AI Subscription ไหนดีที่สุดตามงบ](/th/guides/ai-subscription-by-budget/)
