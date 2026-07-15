import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGate,
  calculateScoreStability,
  calculateWeightedQuality,
  compareQualityPair,
  evaluateQualityPairDocument,
  extractTruthScores,
  normalizeRoutingSelection,
  parseCodexEvents,
  parseModelRegressionArguments,
  qualityPairSchema,
  summarizeBehaviorResults,
  summarizeQualityResults,
} from "./model-regression.mjs";

test("parseCodexEvents records skill use, usage, and completed collaboration calls", () => {
  const metadata = parseCodexEvents([
    JSON.stringify({
      type: "item.completed",
      item: { type: "command_execution", command: "cat .agents/skills/article-to-truth/SKILL.md" },
    }),
    JSON.stringify({ type: "item.completed", item: { type: "collab_tool_call", tool: "spawn_agent" } }),
    JSON.stringify({ type: "item.completed", item: { type: "collab_tool_call", tool: "wait" } }),
    JSON.stringify({ type: "item.completed", item: { type: "collab_tool_call", tool: "send_input" } }),
    JSON.stringify({ type: "item.completed", item: { type: "collab_tool_call", tool: "wait" } }),
    JSON.stringify({ type: "item.completed", item: { type: "collab_tool_call", tool: "close_agent" } }),
    JSON.stringify({
      type: "turn.completed",
      usage: { input_tokens: 120, cached_input_tokens: 40, output_tokens: 30 },
    }),
  ].join("\n"));

  assert.deepEqual(metadata.skillEvidence, ["article-to-truth"]);
  assert.deepEqual(metadata.usage, { inputTokens: 120, cachedInputTokens: 40, outputTokens: 30 });
  assert.deepEqual(metadata.collaborationCalls, {
    spawn_agent: 1,
    wait: 2,
    send_input: 1,
    close_agent: 1,
  });
});

test("parseModelRegressionArguments uses bounded local defaults", () => {
  const smoke = parseModelRegressionArguments([]);
  assert.equal(smoke.mode, "smoke");
  assert.equal(smoke.runs, 2);
  assert.equal(smoke.routingRuns, 3);
  assert.equal(smoke.concurrency, 2);

  const full = parseModelRegressionArguments([
    "--full",
    "--model",
    "gpt-test",
    "--reasoning-effort",
    "high",
    "--runs",
    "4",
    "--cases",
    "1,15",
    "--compare",
  ]);
  assert.equal(full.mode, "full");
  assert.equal(full.model, "gpt-test");
  assert.equal(full.reasoningEffort, "high");
  assert.equal(full.runs, 4);
  assert.deepEqual(full.caseIds, ["1", "15"]);
  assert.equal(full.compare, true);

  assert.throws(
    () => parseModelRegressionArguments(["--skip-routing", "--skip-behavior"]),
    /cannot be used together/,
  );
});

test("normalizeRoutingSelection compares old split skills as one capability", () => {
  assert.equal(normalizeRoutingSelection("article-to-truth", "candidate"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("truth-score", "released"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("truth-rewrite", "released"), "article-to-truth");
  assert.equal(normalizeRoutingSelection("none", "candidate"), "none");
  assert.throws(
    () => normalizeRoutingSelection("truth-score", "candidate"),
    /unexpected routing selection/,
  );
});

test("score extraction and stability track each score label independently", () => {
  assert.deepEqual(
    extractTruthScores("原文真实感评分：62/100\n终稿真实感评分：88 / 100"),
    { 原文真实感评分: 62, 终稿真实感评分: 88 },
  );

  const stability = calculateScoreStability([
    { caseId: "3", scores: { 原文真实感评分: 62, 终稿真实感评分: 88 } },
    { caseId: "3", scores: { 原文真实感评分: 68, 终稿真实感评分: 90 } },
  ]);
  assert.deepEqual(stability, [
    {
      caseId: "3",
      label: "原文真实感评分",
      scores: [62, 68],
      spread: 6,
      passed: true,
    },
    {
      caseId: "3",
      label: "终稿真实感评分",
      scores: [88, 90],
      spread: 2,
      passed: true,
    },
  ]);
});

test("summarizeBehaviorResults separates critical assertions and score variance", () => {
  const records = [
    {
      caseId: "15",
      scores: { 真实感评分: 70 },
      evaluation: {
        passed: true,
        outcomes: [
          { passed: true, critical: true },
          { passed: true, critical: false },
        ],
      },
    },
    {
      caseId: "15",
      scores: { 真实感评分: 80 },
      evaluation: {
        passed: false,
        outcomes: [
          { passed: false, critical: true },
          { passed: true, critical: false },
        ],
      },
    },
  ];

  const summary = summarizeBehaviorResults(records, 8);
  assert.equal(summary.casePassRate, 0.5);
  assert.equal(summary.criticalAssertionPassRate, 0.5);
  assert.equal(summary.otherAssertionPassRate, 1);
  assert.equal(summary.stableScores, false);
  assert.equal(summary.stability[0].spread, 10);
});

const literaryRubric = {
  minimum_total_score: 80,
  maximum_followup_gap: 12,
  maximum_dimension_improvement: 1,
  required_independent_reviewer_passes: 2,
  dimensions: [
    { id: "naturalness", criterion: "语言自然", weight: 2, minimum_score: 3 },
    { id: "continuity", criterion: "状态连续", weight: 1, minimum_score: 4 },
  ],
};

test("calculateWeightedQuality applies weighted totals, dimension floors, and hard failures", () => {
  const passed = calculateWeightedQuality(literaryRubric, {
    scores: { naturalness: 4, continuity: 4 },
    hard_failures: [],
    reason: "自然且连续",
  });
  assert.equal(passed.totalScore, 80);
  assert.equal(passed.passed, true);

  const failed = calculateWeightedQuality(literaryRubric, {
    scores: { naturalness: 5, continuity: 3 },
    hard_failures: ["物件状态矛盾"],
    reason: "局部问题",
  });
  assert.equal(failed.totalScore, 87);
  assert.equal(failed.dimensionPasses.continuity, false);
  assert.equal(failed.passed, false);
});

test("compareQualityPair limits follow-up gains without penalizing a stronger first draft", () => {
  const tied = compareQualityPair({
    rubric: literaryRubric,
    firstRating: { scores: { naturalness: 4, continuity: 4 }, hard_failures: [], reason: "first" },
    followupRating: { scores: { naturalness: 4, continuity: 4 }, hard_failures: [], reason: "followup" },
  });
  assert.equal(tied.delta, 0);
  assert.equal(tied.outcome, "tie");
  assert.equal(tied.maximumDimensionGain, 0);
  assert.equal(tied.dimensionGapPassed, true);
  assert.equal(tied.passed, true);

  const improved = compareQualityPair({
    rubric: literaryRubric,
    firstRating: { scores: { naturalness: 3, continuity: 4 }, hard_failures: [], reason: "first" },
    followupRating: { scores: { naturalness: 5, continuity: 5 }, hard_failures: [], reason: "followup" },
  });
  assert.equal(improved.delta, 33);
  assert.equal(improved.outcome, "improved");
  assert.equal(improved.gapPassed, false);
  assert.equal(improved.maximumDimensionGain, 2);
  assert.equal(improved.dimensionGapPassed, false);
  assert.equal(improved.passed, false);

  const regressed = compareQualityPair({
    rubric: literaryRubric,
    firstRating: { scores: { naturalness: 5, continuity: 5 }, hard_failures: [], reason: "first" },
    followupRating: { scores: { naturalness: 4, continuity: 4 }, hard_failures: [], reason: "followup" },
  });
  assert.equal(regressed.outcome, "regressed");
  assert.equal(regressed.delta, -20);
  assert.equal(regressed.gapPassed, true);
  assert.equal(regressed.dimensionGapPassed, true);
  assert.equal(regressed.passed, true);
});

test("quality pair schema and evaluation keep A/B position anonymous", () => {
  const schema = qualityPairSchema(literaryRubric);
  assert.deepEqual(schema.properties.version_a.properties.scores.required, ["naturalness", "continuity"]);

  const firstRating = {
    scores: { naturalness: 4, continuity: 4 },
    hard_failures: [],
    reason: "first",
  };
  const followupRating = {
    scores: { naturalness: 5, continuity: 4 },
    hard_failures: [],
    reason: "followup",
  };
  const firstAsA = evaluateQualityPairDocument({
    rubric: literaryRubric,
    firstIsA: true,
    document: {
      version_a: firstRating,
      version_b: followupRating,
      comparative_reason: "B 稍自然",
    },
  });
  const firstAsB = evaluateQualityPairDocument({
    rubric: literaryRubric,
    firstIsA: false,
    document: {
      version_a: followupRating,
      version_b: firstRating,
      comparative_reason: "A 稍自然",
    },
  });
  assert.equal(firstAsA.delta, firstAsB.delta);
  assert.equal(firstAsA.first.totalScore, firstAsB.first.totalScore);

  assert.throws(
    () => evaluateQualityPairDocument({
      rubric: literaryRubric,
      firstIsA: true,
      document: {
        version_a: { ...firstRating, scores: { naturalness: 4 } },
        version_b: followupRating,
        comparative_reason: "缺少维度",
      },
    }),
    /scores mismatch/,
  );
});

test("summarizeQualityResults and buildGate preserve old behavior while enforcing literary checks", () => {
  const pair = compareQualityPair({
    rubric: literaryRubric,
    firstRating: { scores: { naturalness: 4, continuity: 4 }, hard_failures: [], reason: "first" },
    followupRating: { scores: { naturalness: 4, continuity: 4 }, hard_failures: [], reason: "followup" },
  });
  const quality = summarizeQualityResults([
    { ...pair, deterministicPassed: true, reviewerActivationPassed: true },
    { ...pair, deterministicPassed: false, reviewerActivationPassed: false },
  ]);
  assert.equal(quality.totalRuns, 2);
  assert.equal(quality.initialQualityPassRate, 1);
  assert.equal(quality.followupQualityPassRate, 1);
  assert.equal(quality.followupAssertionPassRate, 0.5);
  assert.equal(quality.reviewerActivationPassRate, 0.5);
  assert.equal(quality.gapPassRate, 1);
  assert.equal(quality.dimensionGapPassRate, 1);
  assert.equal(quality.maximumFollowupGain, 0);
  assert.equal(quality.maximumDimensionGain, 0);

  const legacyGate = buildGate({
    candidateRouting: null,
    candidateBehavior: null,
    comparisons: [],
    quality: null,
    thresholds: {},
  });
  assert.deepEqual(legacyGate, { passed: true, checks: [] });

  const qualityGate = buildGate({
    candidateRouting: null,
    candidateBehavior: null,
    comparisons: [],
    quality,
    thresholds: {},
  });
  assert.equal(qualityGate.passed, false);
  assert.equal(qualityGate.checks.some((check) => check.name === "follow-up assertions"), true);
  assert.equal(
    qualityGate.checks.some((check) => check.name === "independent reviewer activation"),
    true,
  );
  assert.equal(
    qualityGate.checks.some((check) => check.name === "per-dimension follow-up gain"),
    true,
  );
});
