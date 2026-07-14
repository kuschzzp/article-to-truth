#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsCliVersion = process.env.SKILLS_CLI_VERSION ?? "1.5.17";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const skillNames = ["article-to-truth"];
const requiredFiles = {
  "article-to-truth": [
    "SKILL.md",
    "references/examples.md",
    "references/generation.md",
    "references/patterns.md",
    "references/process.md",
    "references/rubric.md",
    "references/voice-calibration.md",
  ],
};

function installSkills(projectRoot, selectedSkill, npmCacheRoot) {
  const args = [
    "--yes",
    `skills@${skillsCliVersion}`,
    "add",
    repositoryRoot,
    "-a",
    "codex",
  ];
  if (selectedSkill) args.push("--skill", selectedSkill, "-y");

  const result = spawnSync(npxCommand, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      NO_COLOR: "1",
      npm_config_cache: npmCacheRoot,
      npm_config_update_notifier: "false",
    },
    timeout: 120_000,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `skills install failed for ${selectedSkill ?? "default"}\n${result.stdout}\n${result.stderr}`,
    );
  }
}

async function listInstalledSkills(projectRoot) {
  const entries = await readdir(join(projectRoot, ".agents/skills"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();
}

async function verifySkillFiles(projectRoot, skillName) {
  const installedRoot = join(projectRoot, ".agents/skills", skillName);
  for (const relativePath of requiredFiles[skillName]) {
    await access(join(installedRoot, relativePath));
  }

  const skillDefinition = await readFile(join(installedRoot, "SKILL.md"), "utf8");
  if (skillDefinition.includes("../article-to-truth")) {
    throw new Error(`${skillName} still references a sibling Skill`);
  }
}

function assertInstalledSet(actual, expected, label) {
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) {
    throw new Error(`${label}: expected ${expectedSorted.join(", ")}, got ${actual.join(", ")}`);
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "article-to-truth-install-"));
const npmCacheRoot = join(temporaryRoot, "npm-cache");

try {
  for (const skillName of skillNames) {
    const projectRoot = join(temporaryRoot, skillName);
    await mkdir(projectRoot, { recursive: true });
    installSkills(projectRoot, skillName, npmCacheRoot);
    const installed = await listInstalledSkills(projectRoot);
    assertInstalledSet(installed, [skillName], `explicit install ${skillName}`);
    await verifySkillFiles(projectRoot, skillName);
    console.log(`PASS explicit install: ${skillName}`);
  }

  const defaultProjectRoot = join(temporaryRoot, "default");
  await mkdir(defaultProjectRoot, { recursive: true });
  installSkills(defaultProjectRoot, null, npmCacheRoot);
  const installed = await listInstalledSkills(defaultProjectRoot);
  assertInstalledSet(installed, skillNames, "default install");
  for (const skillName of skillNames) await verifySkillFiles(defaultProjectRoot, skillName);
  console.log(`PASS default install: ${installed.join(", ")}`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
