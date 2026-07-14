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
evals/output/16.txt
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

真实回归默认选取 8 个锚点 case，每个 case 对当前候选版和 `fe14b7f` 已发布版各运行 2 次，并执行 3 轮批量路由探测：

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
- `candidate/diagnosis/`：隐式调用失败后的 `$article-to-truth` 显式复跑。
- `summary.json` 与 `summary.md`：候选版、发布版、评分波动和质量门槛汇总。

临时 Skill 工作区位于系统临时目录，脚本在成功、失败或中断后都会清理。持久化报告只写入已忽略的 `evals/output/`，不需要 GitHub Actions。
