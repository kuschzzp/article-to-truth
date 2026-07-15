---
name: article-to-truth
description: 中文文章与文案的真实感创作、AI 味评测、自然化改写和综合审稿技能。用户要求写、创作、生成或起草中文文章、散文、散文诗、小说、故事、公众号、营销文案、小红书、SEO、产品介绍、短视频脚本、邮件或报告时必须使用；用户提供已有中文文本并要求 AI 味检测、真实感评分、自然度评测、模板感分析、问题定位、去 AI 味、改得自然、保留事实改写、先评后改、改写后复评、按样稿或作家风格创作、校准风格，或制定写作规则、SOP、验收标准时也必须使用。文学原创命中后必须实际读取本技能；有子代理能力时必须完成一个独立编辑代理的两回合审稿（先审计、后终改），不得只声明使用。用户明确点名 article-to-truth 时同样使用。仅做翻译、摘要、信息提取、事实查询、排版、代码、图像或文件转换，且不要求中文创作、评测或改写时不要使用。
---

# Article To Truth

Article To Truth 的目标是把文章带回人类表达的真实与自然。使用本技能时，把 AI 初稿视为素材和结构草稿，而不是可直接发布的成品。

## Intent Modes

按用户最终目标选择模式；请求包含多个目标时合并执行，不要求用户记忆模式名或额外命令。

- **Generation**：从零创作；散文、随笔、散文诗、小说、故事、情感写作和作家风格参照进入 **Literary Generation**。
- **Evaluation**：只评测已有文本，默认不改写。
- **Rewrite**：只改写已有文本，默认不展开完整评分。
- **Evaluation And Rewrite**：先评原文，再改写，最后复评终稿。
- **Voice Calibration**：从用户样稿提取稳定声音，再创作或改写。
- **Rules And Review**：制定规则、SOP、验收标准，或执行综合审稿。

## Core Contract

- 保留事实、范围、否定关系、责任边界和作者意图；不编造数据、来源、采访、案例、反馈或亲身经历。
- 虚构创作可以创造人物和情节；非虚构内容不能把合理想象冒充事实。
- 目标是提高真实度、具体性、可信度和可读性，不以规避检测器为目标。
- 保留文体差异，不把技术文、报告、营销稿和个人随笔统一改成“松弛口语”。
- 评测只使用 `真实感评分`，分数越高越自然；AI 味只给风险等级，不输出方向相反的分数或概率。
- pattern 编号与定义以 `references/patterns.md` 为准。评测展示关键证据；改写按需说明；原创默认不展示自审过程。

## Load References

先读取任务对应的最小必要资料；同时命中多行时合并读取。

| 任务类型 | 必读资料 | 按需追加 |
|---|---|---|
| 评测、打分、质检 | `references/patterns.md`, `references/rubric.md` | `references/examples.md` |
| 改写、审稿、去 AI 味 | `references/patterns.md`, `references/process.md` | `references/examples.md` |
| 评测 + 改写 | `references/patterns.md`, `references/rubric.md`, `references/process.md` | `references/examples.md` |
| 公众号、营销、产品、脚本、邮件、报告等实用写作 | `references/generation.md` | 要解释 pattern 时读 `references/patterns.md`；要评分时读 `references/rubric.md` |
| 散文、随笔、散文诗、小说、故事、情感写作、作家风格参照 | `references/literary-generation.md`, `references/literary-reviewer.md` | 有样稿时读 `references/voice-calibration.md`；要展示诊断或评分时读 `references/patterns.md`, `references/rubric.md` |
| 按样稿校准 | `references/voice-calibration.md`, `references/patterns.md`, `references/process.md` | 文学原创同时读 `references/literary-generation.md`, `references/literary-reviewer.md` |
| 规则、SOP、验收标准 | `references/patterns.md`, `references/process.md`, `references/rubric.md` | `references/examples.md` |

## Execution Contract

- **Evaluation**：按 `rubric.md` 评分并给出证据和优先级；短文本可少列 pattern，只评测时不输出终稿。
- **Rewrite**：按 `process.md` 完成事实锁定、识别、初改、复审和终改；只改写时不扩展为评分。
- **Evaluation And Rewrite**：分别评测原文和终稿，中间只交付一份终稿；使用 `process.md` 的顺序与格式。
- **Practical Generation**：按 `generation.md` 建立受众、素材、声音和边界，生成后快速复审。
- **Literary Generation**：第一遍只能作为内部草稿，完整执行 `literary-generation.md`。有子代理能力时，必须按 `literary-reviewer.md` 只启动一个全新编辑代理，第一回合只审计，第二回合一次性终改；失败或不可用时执行删法终审回退。主代理交付前仍须执行该文件规定的机械连续性检查，不得只声明“已检查”。
- **Voice Calibration / Rules And Review**：按加载表组合对应资料，不省略事实边界和最终复核。

## Delivery

- 评测格式以 `rubric.md` 为准；改写和复合模式格式以 `process.md` 为准。
- 用户说“只输出终稿”或“只要正文”时，不附评分、pattern、改动说明或内部过程。
- 原创默认只交付成稿，不展示草稿、审计、状态账本或代理过程。
- 用户明确要求诊断、过程或创作说明时，才展示对应内容；仍不泄露无关内部推理。

## Hard Stops

遇到以下情况，先说明风险，再继续做安全部分：

- 用户要求伪造真人经历、用户反馈、实验结果、采访或来源。
- 用户要求以欺骗学校、雇主、平台或检测系统为主要目的。
- 文本涉及医疗、法律、金融等高风险建议，但缺少来源和限定条件。
- 改写会改变事实、承诺范围、责任边界或利益相关方。

在这些情况下，把任务改成“提升清晰度、真实性和合规表达”。
