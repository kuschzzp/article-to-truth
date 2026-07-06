---
name: truth-rewrite
description: 通用去 AI 味改写的快捷入口。用户明确输入 truth-rewrite、$truth-rewrite，或在支持技能斜杠调用的工具中输入 /truth-rewrite，或要求把中文文章、公众号、产品介绍、营销文案、小红书笔记、短视频脚本、邮件、报告改得更自然、更像人写、降低模板感、去 AI 味时使用。必须基于 article-to-truth 的 pattern 和改写流程，保留事实、范围、责任边界和作者意图；不得编造案例、数据、用户反馈、采访、来源或个人经历。
---

# Truth Rewrite

Truth Rewrite 是 Article To Truth 的轻量改写入口。它负责把已有中文文本改得更真实、具体、可信、自然，不维护独立规则。

## Load References

读取以下资料：

- `../article-to-truth/SKILL.md`
- `../article-to-truth/references/patterns.md`
- `../article-to-truth/references/process.md`

按需追加：

- 用户要求最终评分时，读取 `../article-to-truth/references/rubric.md`
- 用户提供作者样稿或要求“像我写的”时，读取 `../article-to-truth/references/voice-calibration.md`
- 用户要求示例或前后对比时，读取 `../article-to-truth/references/examples.md`

## Workflow

1. 锁定事实：人名、机构名、产品名、数字、时间、来源、承诺范围和作者立场。
2. 判断改写强度：能轻改就轻改；原文模板密度高时再中改或重写。
3. 识别最关键的 pattern。短文本列 1-3 个，长文本列 3-8 个。
4. 改写时优先处理事实风险、空泛价值、结构模板，再处理语言润色。
5. 对散文、随笔、故事、作文和情感类文本，避免把文章改成过度完整、过度顺滑、过度中性、精修无毛边、像满分作文的版本。
6. 复审终稿是否仍然空泛、过度工整、过度口语化、标准温情化、句式可预测，或误删了作者真实痕迹。
7. 保留原文已有的有效毛边：局部视角、旁枝细节、普通词、必要重复、方言口气和轻微不均匀；不要为了人工感故意加错字或伪造亲历。
8. 用 pattern 编号说明主要改动。

## Output

默认使用这个结构：

```text
主要命中 pattern：
- [C02] ...
- [L02] ...
- [S03] ...

终稿：
...

主要改动：
1. [C02] ...
2. [L02] ...
3. [S03] ...
```

用户要求“严谨一点”“展示过程”“先评测再改写”时，再输出初改、复审和终稿评分。

## Boundaries

- 不为了“人味”加入不存在的亲身经历。
- 不补无来源数据、案例、采访、用户反馈或权威背书。
- 不把正式文本强行改成松弛口语。
- 不用路灯、外套、港湾、雨伞、一碗面等通用温情隐喻替代真实细节。
- 不把旁枝、普通词、必要重复和局部视角全部润掉。
- 不删除原文的核心信息、CTA、立场和责任边界。
