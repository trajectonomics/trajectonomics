---
title: 7 สิ่งที่ควรรู้ ก่อนเริ่มทำ Software Factory
description: "ขยายความจากคลิป: คอขวดย้ายจากการเขียนโค้ดไปที่การรีวิว, ทำไม Ticket ต้องเล็ก, ทำไม validation คือหัวใจ, งานแบบไหนที่ยังต้องใช้รสนิยมของคน, ทำไมห้ามให้โมเดลรีวิวงานตัวเอง และทำไมตอนนี้ยังเป็นช่วงที่เริ่มได้เปรียบ"
type: guide
publishedOn: 2026-11-23
cover:
  src: /posts/software-factory-7-things/cover.webp
  alt: หุ่นยนต์สีครีมตาสีส้มยืนอยู่บนสันเนินทรายลายไม้ มองออกไปในความมืด มีแสงสีส้มอ่อน ๆ อยู่ที่ขอบฟ้า
  width: 1024
  height: 1024
---

ในคลิปผมพูดสั้น ๆ ไว้ 7 ข้อ ว่าถ้าจะเริ่มทำ Software Factory ควรรู้อะไรบ้าง โพสต์นี้ขยายแต่ละข้อ พร้อมลิงก์ไปที่ที่มาทุกข้อ ตัวอย่างทั้งหมดมาจาก Factory ที่ผมใช้กับโปรเจกต์ Trajectonomics ซึ่งเปิดเป็น open source อยู่ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory)

ถ้ายังไม่รู้ว่า Factory ตัวนี้ทำงานยังไง อ่าน [Software Factory ที่ผมใช้ merge 700+ PR ใน 23 วัน](/guides/software-factory/) ก่อนได้ โพสต์นั้นเล่าระบบทั้งตัว ส่วนโพสต์นี้คือบทเรียน

## 1. คอขวดย้ายจากการเขียนโค้ด ไปที่การรีวิว แล้วกำลังย้ายไปที่ attention

เมื่อ agent เขียนโค้ดได้เร็วกว่าคน งานที่ช้าที่สุดก็ไม่ใช่การเขียนอีกต่อไป แต่เป็นการอ่านและตัดสินว่าจะยอมให้อะไรผ่าน

ข้อมูลก็บอกแบบเดียวกัน [รายงาน benchmark ปี 2026 ของ LinearB](https://linearb.io/blog/engineering-benchmarks-report) ที่ดู PR กว่า 8.1 ล้านอันจาก 4,800 ทีม พบว่า PR ของ AI รอให้มีคนหยิบไปรีวิวนานกว่า PR ปกติ 4.6 เท่า ("AI PRs wait 4.6x longer before review") แต่พอมีคนหยิบแล้ว กลับรีวิวเสร็จเร็วกว่า 2 เท่า ปัญหาจึงไม่ใช่ว่ารีวิวยาก แต่คือไม่มีใครว่างพอจะเริ่มรีวิว

ขั้นต่อไปที่ผมเห็นคือ **attention** ของคน เมื่อรีวิวก็ให้ AI ช่วยได้ สิ่งที่เหลือคือเวลาที่คุณมีให้ตัดสินใจว่าจะสร้างอะไร ใน Factory ของผม ระบบจะเรียกผมผ่าน [Owner call](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) คือข้อความเดียวที่ถามเฉพาะเรื่องที่มีแต่ผมตัดสินได้ ตอนร่าง Spec มันจะถามผม (เรียกว่า Owner question) ก็ต่อเมื่อเรื่องนั้นเปลี่ยนวิธีทำงานหรือย้อนกลับยาก และโมเดลที่ปรึกษาสองตัวเห็นไม่ตรงกับมันหรือไม่ตรงกันเอง เรื่องอื่นมันตัดสินใจเองแล้วจดไว้ ทั้งหมดนี้เพื่อประหยัด attention ของผม

## 2. ทำ Ticket ให้เล็กที่สุดเท่าที่จะเป็นไปได้

งานชิ้นใหญ่ที่คลุมเครือคือที่ที่ agent หลงทาง ใน Factory งานใหญ่หนึ่งชิ้นคือ Spec และ Spec แตกเป็น Ticket ซึ่ง [glossary](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) นิยามไว้ว่าเป็นงาน "sized for one fresh context window" คือเล็กพอให้ agent ตัวเดียวทำจบใน context ใหม่หนึ่งรอบ โดยไม่ต้องจำอะไรจากรอบก่อน

จากที่ผมเจอ ถ้า Ticket ใหญ่เกินไป agent จะเริ่มลืมสิ่งที่อ่านไว้ต้นทาง ตัดสินใจเองในเรื่องที่ควรถาม หรือทำเกินขอบเขต Ticket ที่เล็กยังรีวิวง่ายด้วย ซึ่งช่วยข้อ 1 โดยตรง

## 3. Validation คือหัวใจของ Software Factory

เราจะเชื่องานของ AI ได้ก็ต่อเมื่อมีวิธีตรวจที่แข็งแรง ใน Factory ทุก PR ต้องผ่าน [Gate](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) ก่อนเปิดเป็น PR ที่พร้อม merge:

1. `bun run check` ต้องผ่าน ใน repo ของ Factory เองคำสั่งนี้รวม lint, typecheck, test และ build ([package.json](https://github.com/trajectonomics/factory/blob/main/package.json))
2. **Conformance Review:** โค้ดทำตรงตามที่ Ticket บอกไหม
3. **Standards Review:** โค้ดถูกตาม `CODING_STANDARDS.md` ของ repo ไหม

งานที่คนมองเห็นมีรีวิวดีไซน์เพิ่มอีกด่าน (ดูข้อ 5)

ถ้าไม่มีคำสั่ง check ที่รันได้ทุกครั้ง ก็ไม่มีอะไรให้ automation ยืนอยู่ ถ้าจะเริ่มทำ Factory ให้เริ่มจากข้อนี้

ทำไมต้องตรวจขนาดนี้: [รายงานของ CodeRabbit](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report) (ธ.ค. 2568) ที่ดู PR ใน open source 470 อัน พบว่าปัญหาด้าน logic และความถูกต้องเจอใน PR ที่มี AI ร่วมเขียนมากกว่า PR ของคน 75% ("Logic and correctness issues were 75% more common in AI PRs") แม้รายงานเองจะบอกว่ายืนยันไม่ได้ 100% ว่า PR ไหนคนเขียนล้วน

## 4. เปลี่ยน mindset จากคนทำ software เป็นคนทำ factory

งานของเราเปลี่ยนจากการเขียนโค้ดเอง เป็นการสร้างระบบที่ผลิตโค้ด ย่อหน้าแรกของ [README ของ Factory](https://github.com/trajectonomics/factory#readme) สรุปไว้: Dispatcher ที่รันทุก 6 ชั่วโมงจะหางานที่พร้อมทำ แล้วเปิด Run ที่เปลี่ยน Spec กับ Ticket ที่อนุมัติแล้วให้เป็น PR ที่รีวิวแล้ว

ผมเป็นคนตัดสินใจว่าจะสร้างอะไร agent เป็นคนสร้าง งานของผมคือเขียนโจทย์กับอนุมัติ ไม่ใช่เขียนโค้ด และเมื่อ Factory พลาด ผมแก้ที่ตัว Factory ไม่ใช่แก้โค้ดชิ้นนั้นเอง ทุกครั้งที่ผมตัดสินใจเรื่องวิธีทำงาน ผมจดเป็น ADR ให้ agent ทุกตัวทำตามกฎชุดเดียวกัน ตอนนี้ [มี 28 ข้อ](https://github.com/trajectonomics/factory/tree/main/docs/adr) การแก้ factory หนึ่งครั้งได้ผลกับทุกงานหลังจากนั้น ต่างจากการแก้โค้ดหนึ่งไฟล์

## 5. รสนิยมของคนยังสำคัญ โดยเฉพาะงาน UI

โค้ดตรวจได้ด้วย test แต่ "หน้าตาดีไหม" ยังตรวจด้วย test ไม่ได้ ผมเรียนรู้เรื่องนี้ตอนที่หน้าแรกของเว็บไซต์ถูก merge ไปโดยไม่มีใครดูดีไซน์เลย ([ADR 0017](https://github.com/trajectonomics/factory/blob/main/docs/adr/0017-surface-design-gate.md))

หลังจากนั้นงานที่คนมองเห็น (Factory เรียกว่า Surface ticket) มีกฎเพิ่ม: PR ต้องแนบภาพหน้าจอทั้งจอกว้าง จอมือถือ ธีมสว่างและธีมมืด ต้องผ่านรีวิวดีไซน์เทียบกับ reference และจะ merge ได้ก็ต่อเมื่อผมอนุมัติเท่านั้น งานอื่นทั้งหมดยัง merge เองได้

การมีคนอยู่ในวงยังเห็นผลเป็นตัวเลขด้วย ทีม .NET ของ Microsoft [เล่าประสบการณ์ 10 เดือน](https://devblogs.microsoft.com/dotnet/ten-months-with-cca-in-dotnet-runtime/) กับ Copilot coding agent ใน repo dotnet/runtime (มี.ค. 2569): PR ที่มีคนเข้าไป commit ร่วมด้วยสำเร็จ 86% ส่วน PR ที่ agent ทำเองล้วน ๆ สำเร็จ 55% (นับจาก PR ที่ปิดแล้ว และทีมเองก็เตือนว่าสองกลุ่มนี้เลือกกันเอง คนเลือกเข้าไปช่วยเฉพาะบางงาน และ PR ที่ agent ทำล้วนแล้วถูกปิดหลายอันเป็นงานทดลอง จึงเทียบกันตรง ๆ ไม่ได้)

## 6. อย่าให้โมเดลตัวเดียวกันรีวิวงานของตัวเอง

โมเดลที่เขียนโค้ดมักมองไม่เห็นจุดบอดของตัวเอง ใน Factory กฎนี้เขียนไว้ตรง ๆ ใน [ADR 0028](https://github.com/trajectonomics/factory/blob/main/docs/adr/0028-reviews-run-on-hydrogen-and-grok.md): "the model that wrote the code never marks its own work" คนเขียนคือ DeepSeek ส่วนสองรีวิวใช้ Grok 4.7 (Conformance) กับ Gemini 4 Hydrogen (Standards) ซึ่งอยู่คนละเจ้ากัน

อย่างน้อยให้ใช้โมเดลอีกตัวที่เก่งพอ ๆ กันหรือเก่งกว่ามารีวิว และถ้าเป็นไปได้ให้อยู่คนละบริษัท เพื่อไม่ให้มีจุดบอดชุดเดียวกัน

## 7. ตอนนี้ยัง early มาก

ยังไม่มีใครรู้ว่าหน้าตาสุดท้ายของ Software Factory จะเป็นยังไง ทุกคนกำลังทดลองแบบของตัวเอง แม้แต่ Factory ของผมเองก็เปลี่ยนกฎตลอด ADR ข้อแรกถูก commit วันที่ 8 พ.ย. 2569 และข้อที่ 28 วันที่ 21 พ.ย. 2569 คือ 28 การตัดสินใจในสองสัปดาห์ ([ดูประวัติ commit](https://github.com/trajectonomics/factory/commits/main/docs/adr)) หลายข้อแก้หรือยกเลิกข้อก่อนหน้า เช่น ผมเคยตั้งด่านก่อน merge ไว้เยอะ แล้วยกเลิกเกือบหมดใน [ADR 0015](https://github.com/trajectonomics/factory/blob/main/docs/adr/0015-no-merge-gate.md) เพราะมันทำให้งานไม่เดิน

บริษัทใหญ่เริ่มกันแล้ว แต่แต่ละที่ทำคนละแบบ:

- **Stripe:** PR ที่ agent ของตัวเอง (เรียกว่า Minions) เขียนทั้งหมด แล้วคนรีวิวก่อน merge [กว่า 1,300 อันต่อสัปดาห์](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2) (ก.พ. 2569)
- **Uber:** [PR มากกว่า 70%](https://www.uber.com/blog/efficient-software-factory/) ถูกระบุว่ามาจาก agent (บนเครื่องหรือบน cloud) (ส.ค. 2569)
- **Spotify:** agent สร้าง PR ที่ merge เข้า production [กว่า 650 อันต่อเดือน](https://claude.com/customers/spotify) ตาม case study ของ Anthropic

แต่ข้อมูลสาธารณะยังมีน้อย บทความของ [Firecrawl](https://www.firecrawl.dev/blog/ai-software-factory) ที่รวบรวมเรื่องนี้ก็เขียนไว้ตรง ๆ ว่า "The public data is limited, and some of it cuts against the idea." ยังไม่มีสูตรที่ทุกคนยอมรับ

นี่คือโอกาสที่จะเป็นผู้บุกเบิก ถ้าคุณเริ่มทำ Software Factory ตอนนี้ได้ อนาคตอาจมีชื่อคุณอยู่ในประวัติศาสตร์ของวิธีทำซอฟต์แวร์แบบใหม่นี้

## เริ่มตรงไหนดี

ไม่ต้องสร้างทั้งระบบในวันแรก ลำดับที่ผมแนะนำอยู่ในหัวข้อ "ถ้าจะเริ่มจากศูนย์" ของ [โพสต์ก่อนหน้า](/guides/software-factory/) สั้น ๆ คือ: agent ตัวเดียวใน repo เดียว, issue ที่เขียนเหมือน spec, คำสั่ง check หนึ่งคำสั่ง, แล้วค่อยเพิ่มโมเดลอื่นมารีวิว

อ่านโค้ดและเอกสารทั้งหมดได้ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory) ส่วนงานที่มันสร้างอยู่ที่ [trajectonomics/trajectonomics](https://github.com/trajectonomics/trajectonomics) ถ้ามีประโยชน์ ฝากกดดาวให้ทั้งสอง repo ด้วยนะครับ
