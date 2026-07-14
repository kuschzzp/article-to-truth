#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--check");

if (unknownArguments.length > 0) {
  console.error(`Unknown argument: ${unknownArguments.join(" ")}`);
  process.exit(2);
}

const mappings = [
  {
    source: "skills/article-to-truth/references/patterns.md",
    targets: [
      "skills/truth-score/references/patterns.md",
      "skills/truth-rewrite/references/patterns.md",
    ],
  },
  {
    source: "skills/article-to-truth/references/rubric.md",
    targets: ["skills/truth-score/references/rubric.md"],
  },
  {
    source: "skills/article-to-truth/references/process.md",
    targets: ["skills/truth-rewrite/references/process.md"],
  },
  {
    source: "skills/article-to-truth/references/examples.md",
    targets: [
      "skills/truth-score/references/examples.md",
      "skills/truth-rewrite/references/examples.md",
    ],
  },
];

let hasDrift = false;

for (const mapping of mappings) {
  const sourcePath = resolve(repositoryRoot, mapping.source);
  const sourceContent = await readFile(sourcePath);

  for (const target of mapping.targets) {
    const targetPath = resolve(repositoryRoot, target);
    let targetContent;

    try {
      targetContent = await readFile(targetPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (targetContent?.equals(sourceContent)) continue;

    if (checkOnly) {
      console.error(`OUT_OF_SYNC ${target}`);
      hasDrift = true;
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, sourceContent);
    console.log(`SYNCED ${target}`);
  }
}

if (hasDrift) {
  process.exitCode = 1;
} else if (checkOnly) {
  console.log("Skill references are in sync.");
}
