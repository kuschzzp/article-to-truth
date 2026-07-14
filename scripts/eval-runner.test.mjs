import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateOutput,
  evaluateRoutingResults,
  validateEvalSuite,
  validateRoutingSuite,
} from "./eval-runner.mjs";

test("evaluateOutput supports deterministic assertion types", () => {
  const evalCase = {
    id: 1,
    target_skill: "article-to-truth",
    prompt: "评测这段文字",
    expected_output: "输出结构化评测",
    files: [],
    assertions: [
      { type: "contains", value: "真实感评分：", description: "包含评分" },
      { type: "not_contains", value: "终稿：", description: "不输出改写" },
      { type: "contains_any", values: ["AI 味风险：低", "AI 味风险：中"], description: "包含风险" },
      { type: "not_contains_any", values: ["行业领先", "全新升级"], description: "没有宣传词" },
      { type: "regex", pattern: "\\[(?:C|L|S)\\d{2}\\]", min_matches: 2, description: "至少两个 pattern" },
      { type: "not_regex", pattern: "用户反馈显示", description: "没有伪反馈" },
      { type: "ordered_contains", values: ["真实感评分：", "命中 pattern：", "优先修改："], description: "顺序正确" },
      { type: "preserves_terms", terms: ["ReviewPin", "内容团队"], description: "保留事实词" },
      { type: "score_range", min: 70, max: 80, description: "评分落在锚点范围" },
      { type: "min_length", value: 80, description: "信息足够" },
      { type: "max_length", value: 500, description: "输出克制" },
    ],
  };

  const output = `真实感评分：76/100（越高越自然）
AI 味风险：中

命中 pattern：
1. [C02] 宏大背景：证据句“在数字时代”
2. [L02] 虚浮动词：证据句“赋能内容团队”

ReviewPin 面向内容团队。

优先修改：
1. 直接说明产品功能。`;

  const result = evaluateOutput(evalCase, output);

  assert.equal(result.passed, true);
  assert.equal(result.passedAssertions, evalCase.assertions.length);
  assert.equal(result.failures.length, 0);
});

test("evaluateOutput reports actionable assertion failures", () => {
  const result = evaluateOutput(
    {
      id: 2,
      target_skill: "article-to-truth",
      prompt: "改写",
      expected_output: "终稿",
      files: [],
      assertions: [
        { type: "contains", value: "终稿：", description: "包含终稿" },
        { type: "preserves_terms", terms: ["NotePilot"], description: "保留产品名" },
      ],
    },
    "改写完成。",
  );

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.description),
    ["包含终稿", "保留产品名"],
  );
});

test("evaluateOutput protects scoped claims, dates, and numeric facts", () => {
  const evalCase = {
    id: 15,
    target_skill: "article-to-truth",
    prompt: "改写发布说明",
    expected_output: "保留全部事实边界",
    files: [],
    assertions: [
      {
        type: "preserves_claims",
        description: "保留容量与成员限制",
        critical: true,
        scope: { start: "终稿：", end: "主要改动：" },
        claims: [
          { description: "容量限制", terms: ["单文件", "最大", "20 MB"] },
          { description: "成员限制", terms: ["每个工作区", "最多", "50 名成员"] },
        ],
      },
      {
        type: "same_number_set",
        values: ["2026", "8", "1", "20", "30", "50"],
        description: "数字集合不变",
        critical: true,
        scope: { start: "终稿：", end: "主要改动：" },
      },
      {
        type: "same_date_set",
        values: ["2026 年 8 月 1 日"],
        description: "日期集合不变",
        critical: true,
        scope: { start: "终稿：", end: "主要改动：" },
      },
      {
        type: "no_new_numbers",
        values: ["2026", "8", "1", "20", "30", "50"],
        description: "不增加数字",
        critical: true,
        scope: { start: "终稿：", end: "主要改动：" },
      },
    ],
  };

  const output = `终稿：
FileGate 将于 2026 年 8 月 1 日更新。新版本支持单文件最大 20 MB，审核记录保留 30 天，每个工作区最多 50 名成员。

主要改动：
1. [L02] 删除宣传腔。`;

  const result = evaluateOutput(evalCase, output);
  assert.equal(result.passed, true);
  assert.equal(result.outcomes.every((outcome) => outcome.critical), true);

  const drifted = evaluateOutput(evalCase, output.replace("50 名成员", "60 名成员"));
  assert.equal(drifted.passed, false);
  assert.deepEqual(
    drifted.failures.map((failure) => failure.type),
    ["preserves_claims", "same_number_set", "no_new_numbers"],
  );
});

test("scoped assertions fail clearly when the final section is missing", () => {
  const result = evaluateOutput(
    {
      id: 16,
      target_skill: "article-to-truth",
      prompt: "改写",
      expected_output: "终稿",
      files: [],
      assertions: [
        {
          type: "same_number_set",
          values: ["20"],
          description: "终稿保留数字",
          scope: { start: "终稿：" },
        },
      ],
    },
    "改写完成，保留 20 MB。",
  );

  assert.equal(result.passed, false);
  assert.match(result.failures[0].message, /scope start not found/);
});

test("scoped assertions accept heading-free drafts and equivalent claim phrases", () => {
  const scope = {
    start: ["终稿：", "改写稿："],
    end: ["主要改动：", "改动说明：", "简短改动说明："],
    allow_missing_start: true,
  };
  const result = evaluateOutput(
    {
      id: 17,
      target_skill: "article-to-truth",
      prompt: "改写",
      expected_output: "保留事实并删除宣传腔",
      files: [],
      assertions: [
        {
          type: "preserves_claims",
          description: "保留容量限制",
          scope,
          claims: [
            {
              description: "单文件容量",
              term_groups: [["单文件", "单个文件"], ["20 MB"]],
            },
          ],
        },
        {
          type: "same_number_set",
          values: ["20"],
          description: "数字集合不变",
          scope,
        },
        {
          type: "not_contains",
          value: "行业领先",
          description: "终稿删除宣传词",
          scope,
        },
      ],
    },
    `新版本单个文件最大支持 20 MB。

改动说明：删除“行业领先”等宣传词。`,
  );

  assert.equal(result.passed, true);
});

test("suite validators enforce the single-skill contract", () => {
  assert.throws(
    () =>
      validateEvalSuite({
        skill_name: "article-to-truth",
        evals: [
          {
            id: 1,
            target_skill: "truth-score",
            prompt: "test",
            expected_output: "test",
            files: [],
            assertions: [{ type: "contains", value: "test", description: "valid" }],
          },
        ],
      }),
    /unknown target_skill/,
  );

  assert.doesNotThrow(() =>
    validateRoutingSuite({
      suite: "routing",
      cases: [
        {
          id: "score-only",
          query: "只评分",
          expected_skill: "article-to-truth",
          excluded_skills: [],
          reason: "评分是综合 Skill 的内部模式",
        },
        {
          id: "unrelated-code",
          query: "修复 React 报错",
          expected_skill: "none",
          excluded_skills: ["article-to-truth"],
          reason: "与中文写作无关",
        },
      ],
    }),
  );

  assert.throws(
    () => validateRoutingSuite({ suite: "routing", cases: [] }),
    /non-empty cases/,
  );
});

test("evaluateRoutingResults compares every selected skill", () => {
  const routingSuite = {
    suite: "routing",
    cases: [
      {
        id: "score-only",
        query: "只评分",
        expected_skill: "article-to-truth",
        excluded_skills: [],
        reason: "评分任务",
      },
      {
        id: "unrelated-code",
        query: "修复 React 报错",
        expected_skill: "none",
        excluded_skills: ["article-to-truth"],
        reason: "无关任务",
      },
    ],
  };

  const result = evaluateRoutingResults(routingSuite, {
    results: [
      { id: "score-only", selected_skill: "article-to-truth" },
      { id: "unrelated-code", selected_skill: "article-to-truth" },
    ],
  });

  assert.equal(result.passed, false);
  assert.equal(result.passedCases, 1);
  assert.equal(result.passedRuns, 1);
  assert.equal(result.totalRuns, 2);
  assert.deepEqual(result.failures, [
    {
      id: "unrelated-code",
      run: 1,
      expectedSkill: "none",
      selectedSkill: "article-to-truth",
      message: "run 1: expected none, got article-to-truth",
    },
  ]);
});

test("evaluateRoutingResults measures repeated-run pass rates", () => {
  const routingSuite = {
    suite: "routing",
    runs_per_case: 3,
    minimum_pass_rate: 0.8,
    cases: [
      {
        id: "score-only",
        query: "只评分",
        expected_skill: "article-to-truth",
        excluded_skills: [],
        reason: "评分任务",
      },
      {
        id: "unrelated-code",
        query: "修复 React 报错",
        expected_skill: "none",
        excluded_skills: ["article-to-truth"],
        reason: "无关任务",
      },
    ],
  };

  const result = evaluateRoutingResults(routingSuite, {
    results: [
      {
        id: "score-only",
        selected_skills: ["article-to-truth", "article-to-truth", "none"],
      },
      {
        id: "unrelated-code",
        selected_skills: ["none", "none", "none"],
      },
    ],
  });

  assert.equal(result.passed, true);
  assert.equal(result.passedRuns, 5);
  assert.equal(result.totalRuns, 6);
  assert.equal(result.passRate, 5 / 6);
  assert.equal(result.failures.length, 1);
});
