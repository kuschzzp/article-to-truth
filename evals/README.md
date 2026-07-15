# Evaluation Guide

本目录包含两类评测：

- `evals.json`：检查 `article-to-truth` 各内部模式的输出行为。
- `trigger-routing.json`：检查相关请求是否触发唯一 Skill、无关请求是否保持不触发。

`scripts/eval-runner.mjs` 不调用模型或绑定具体客户端。它验证评测定义，并对 Codex、Claude Code、OpenCode 或其他客户端产生的已保存结果执行同一套确定性断言。`scripts/model-regression.mjs` 则专门调用本地已登录的 Codex CLI，执行隔离、重复、可比较的真实模型回归。

## Validate Definitions

```bash
node scripts/eval-runner.mjs --check
```

该命令检查：

- Skill 名称和 case id 是否有效且唯一。
- 每条行为用例是否包含至少一个 assertion。
- 正则表达式、长度限制和事实保留字段是否合法。
- 路由目标与排除项是否自洽。

## Evaluate Behavior Outputs

把每条 prompt 交给对应客户端执行，将纯文本输出保存为：

```text
evals/output/1.txt
evals/output/2.txt
...
evals/output/18.txt
```

运行全部行为断言：

```bash
node scripts/eval-runner.mjs --outputs evals/output
```

只运行一条：

```bash
node scripts/eval-runner.mjs --outputs evals/output --case 1
```

支持的 assertion 类型：

| 类型 | 用途 |
|---|---|
| `contains`, `not_contains` | 检查必需或禁止文本 |
| `contains_any`, `not_contains_any` | 检查一组候选词 |
| `regex`, `not_regex` | 检查 pattern 编号等结构 |
| `ordered_contains` | 检查复合流程的输出顺序 |
| `preserves_terms` | 检查产品名、数字、对象等事实词 |
| `preserves_claims` | 在指定输出区段检查主体、谓词、否定和限制关系 |
| `same_number_set` | 检查终稿数字集合与原文完全一致 |
| `same_date_set` | 检查终稿日期集合与原文完全一致 |
| `no_new_numbers` | 检查终稿没有引入原文之外的数字 |
| `score_range` | 用人工锚点校准真实感分数区间 |
| `min_length`, `max_length` | 检查基本内容量或输出克制程度 |

断言可设置 `"critical": true`，把事实、日期、数字、否定和责任边界标为质量门槛。区段标记可以是一项或多项；改写允许省略“终稿”标题时，使用 `allow_missing_start`，但仍会在改动说明前停止：

```json
{
  "scope": {
    "start": ["终稿：", "改写稿："],
    "end": ["主要改动：", "改动说明：", "简短改动说明："],
    "allow_missing_start": true
  }
}
```

`preserves_claims` 默认要求 `terms` 全部出现；允许等价短语时用 `term_groups`，每组至少出现一项。例如 `[["单文件", "单个文件"], ["20 MB"]]` 既接受合理语序变化，也不会放松容量数字。

确定性断言只能发现结构、事实词和明显越界问题。文体质量、作者声音和细节可信度仍需人工或独立模型评审。

文学生成用例还可以同时声明 `quality_rubric` 和 `followup_prompt`。量表包含 2-8 个评分维度，每个维度使用 1-5 分、权重和最低分；程序按权重换算百分制总分。`minimum_total_score` 是首次稿与后续稿都要达到的门槛，`maximum_followup_gap` 限制后续“去 AI 味”稿相对首次稿最多能提高多少分，`maximum_dimension_improvement` 进一步限制任一评分维度最多能提高几级；后续稿变差不会反过来判首次稿失败。`required_independent_reviewer_passes` 要求候选首次生成启用 multi-agent，并至少观察到相应数量的独立编辑等待；没有 reviewer 证据时，即使正文得分达标也不通过：

```json
{
  "quality_rubric": {
    "minimum_total_score": 80,
    "maximum_followup_gap": 12,
    "maximum_dimension_improvement": 1,
    "required_independent_reviewer_passes": 2,
    "dimensions": [
      {
        "id": "naturalness",
        "criterion": "语言自然，不靠模板式金句推进",
        "weight": 2,
        "minimum_score": 3
      },
      {
        "id": "continuity",
        "criterion": "人物、物件和时间状态前后一致",
        "weight": 2,
        "minimum_score": 4
      }
    ]
  },
  "followup_prompt": "去一下 AI 味，只输出修订后的正文。"
}
```

这两个字段必须一起出现。确定性运行器只验证配置；真实模型回归会生成后续稿，并在同一次匿名裁判中给首次稿与后续稿按维度评分，避免相减两个独立裁判产生标尺漂移。

## Evaluate Routing Results

客户端执行 `trigger-routing.json` 中的 query 后，将实际选择结果保存为 JSON：

```json
{
  "results": [
    {
      "id": "generate-novel",
      "selected_skills": ["article-to-truth", "article-to-truth", "article-to-truth"]
    },
    {
      "id": "score-only",
      "selected_skills": ["article-to-truth", "article-to-truth", "article-to-truth"]
    },
    {
      "id": "unrelated-code-debugging",
      "selected_skills": ["none", "none", "none"]
    }
  ]
}
```

每条 query 按 `runs_per_case` 重复执行，当前为 3 次。未触发任何 Skill 时，在对应位置写 `"none"`。结果文件必须覆盖被评测的全部 case；总命中率达到 `minimum_pass_rate`（当前为 95%）才通过。

运行路由评测：

```bash
node scripts/eval-runner.mjs --routing-results evals/output/routing-results.json
```

只检查一条路由：

```bash
node scripts/eval-runner.mjs --routing-results evals/output/routing-results.json --case generate-novel
```

`evals/output/` 已加入 `.gitignore`，真实输出和本地路由结果不会进入仓库。

## Run Real Model Regression

真实回归默认选取 10 个锚点 case，其中包含小说和指定作家风格散文。每个 case 对当前候选版和 `fe14b7f` 已发布版各运行 2 次，并执行 3 轮批量路由探测：

```bash
node scripts/model-regression.mjs --smoke --model gpt-5.6-sol --reasoning-effort medium
```

脚本也可以从 `CODEX_MODEL` 或 `$CODEX_HOME/config.toml` 读取模型，但建议在正式基准中显式传入 `--model` 和 `--reasoning-effort`。两项设置都会记录在 manifest，并原样传给 `codex exec`。

完整参数：

```bash
node scripts/model-regression.mjs --help
```

每次运行会生成：

- `manifest.json`：模型、CLI 版本、候选 commit、基线引用、运行次数和门槛。
- `<profile>/routing/`：结构化路由选择、JSONL 事件和 token 用量。
- `<profile>/behavior/`：原始终稿、确定性断言和评分提取结果。
- `candidate/followups/`：文学首次稿对应的“去 AI 味”后续稿、确定性断言和 Skill 激活证据。
- `quality/`：首次稿与后续稿的匿名分维度评分、加权总分和质量差。
- `candidate/diagnosis/`：隐式调用失败后的 `$article-to-truth` 显式复跑。
- `summary.json` 与 `summary.md`：候选版、发布版、评分波动和质量门槛汇总。

临时 Skill 工作区位于系统临时目录，脚本在成功、失败或中断后都会清理。持久化报告只写入已忽略的 `evals/output/`，不需要 GitHub Actions。

只运行文学质量回归：

```bash
node scripts/model-regression.mjs --cases 13,17,18 --runs 3 --skip-routing --compare --model gpt-5.6-sol --reasoning-effort medium --baseline-ref <published-ref>
```

文学质量门槛要求首次稿、后续稿、后续稿确定性断言、自动 Skill 激活和独立 reviewer 激活全部通过，并且后续稿相对首次稿的正向提升不超过各用例的 `maximum_followup_gap`，任一维度的提升也不超过 `maximum_dimension_improvement`。总分门槛允许多个已达标维度从 4 精修到 5，单维度门槛仍会拦住连续性等关键项从明显失败跃升到优秀。这个方向性门槛专门识别“第一次明显不够好、用户再说一次去 AI 味才改善”的问题；首次稿本来更好时不误报。运行器只为声明了 reviewer 要求的候选文学用例启用 multi-agent；旧版基线、路由、后续追问和裁判仍保持关闭。独立模型评分是稳定的回归信号，不代表客观文学定论；正式判断仍应结合匿名输出人工阅读。
