#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const sourceStaticDir = path.join(root, ".next", "static");
const targetStaticDir = path.join(standaloneNextDir, "static");
const sourcePublicDir = path.join(root, "public");
const targetPublicDir = path.join(standaloneDir, "public");
const requiredBrandAsset = path.join(sourcePublicDir, "brand", "c2", "c2-logo-accounting.png");

function resetDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(source, target) {
  resetDir(target);
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error(`Standalone output is missing at ${standaloneDir}`);
}

if (!fs.existsSync(standaloneNextDir)) {
  throw new Error(`Standalone .next directory is missing at ${standaloneNextDir}`);
}

if (!fs.existsSync(sourceStaticDir)) {
  throw new Error(`Build static assets are missing at ${sourceStaticDir}`);
}

if (!fs.existsSync(sourcePublicDir)) {
  throw new Error(`Public assets directory is missing at ${sourcePublicDir}`);
}

if (!fs.existsSync(requiredBrandAsset)) {
  throw new Error(`Required PAT brand asset is missing at ${requiredBrandAsset}`);
}

copyDir(sourceStaticDir, targetStaticDir);
copyDir(sourcePublicDir, targetPublicDir);

const result = {
  ok: true,
  standaloneDir,
  copied: {
    static: {
      from: sourceStaticDir,
      to: targetStaticDir,
    },
    public: {
      from: sourcePublicDir,
      to: targetPublicDir,
    },
  },
  requiredBrandAsset: path.relative(root, requiredBrandAsset),
};

console.log(JSON.stringify(result, null, 2));
