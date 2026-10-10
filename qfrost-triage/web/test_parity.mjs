#!/usr/bin/env node
/**
 * web/test_parity.mjs
 * Validates exact parity between JavaScript scanner twin and Python golden findings.
 * Zero dependencies, pure Node.js vm module.
 */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scannerDataPath = path.join(__dirname, "scanner_data.js");
const scannerPath = path.join(__dirname, "scanner.js");
const parityPath = path.join(__dirname, "parity.json");

const scannerDataCode = fs.readFileSync(scannerDataPath, "utf-8");
const scannerCode = fs.readFileSync(scannerPath, "utf-8");
const parityJson = JSON.parse(fs.readFileSync(parityPath, "utf-8"));

// Create VM context
const sandbox = {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

vm.runInContext(scannerDataCode, sandbox);
vm.runInContext(scannerCode, sandbox);

const scanner = sandbox.QFrostScanner;
if (!scanner || typeof scanner.runScan !== "function") {
  console.error("FAIL: QFrostScanner.runScan not found in sandbox");
  process.exit(1);
}

let failed = false;
let fixturesTested = 0;

for (const entry of parityJson) {
  const { name, py_parse_ok, findings: pyFindings } = entry;
  fixturesTested++;

  // Find sample text
  const sample = sandbox.QFROST_DATA.samples.find(s => s.name === name);
  if (!sample) {
    console.error(`FAIL: sample not found in QFROST_DATA: ${name}`);
    failed = true;
    continue;
  }

  // Handle malformed fixture (py_parse_ok: false)
  if (!py_parse_ok) {
    try {
      const res = scanner.runScan(sample.text, name);
      // Twin must survive without throwing
      if (!res || !Array.isArray(res.findings)) {
        console.error(`FAIL [${name}]: runScan did not return valid result object`);
        failed = true;
      }
    } catch (err) {
      console.error(`FAIL [${name}]: twin threw exception on malformed input:`, err);
      failed = true;
    }
    continue;
  }

  // Normal fixture
  let jsResult;
  try {
    jsResult = scanner.runScan(sample.text, name);
  } catch (err) {
    console.error(`FAIL [${name}]: runScan threw exception:`, err);
    failed = true;
    continue;
  }

  // Filter out QWE-002 on both sides (heuristic in JS)
  const pyList = pyFindings.filter(f => f.id !== "QWE-002");
  const jsList = jsResult.findings.filter(f => f.id !== "QWE-002");

  const pyMap = new Map(pyList.map(f => [f.id, f]));
  const jsMap = new Map(jsList.map(f => [f.id, f]));

  // Check ID-set equality
  const pyIds = Array.from(pyMap.keys()).sort();
  const jsIds = Array.from(jsMap.keys()).sort();

  if (pyIds.join(",") !== jsIds.join(",")) {
    console.error(`FAIL [${name}]: ID set mismatch. Py=[${pyIds}] vs JS=[${jsIds}]`);
    failed = true;
    continue;
  }

  // Check severity and score equality per finding
  for (const id of pyIds) {
    const pyF = pyMap.get(id);
    const jsF = jsMap.get(id);

    if (id === "QWE-001") {
      // Special law for QWE-001: js k <= py k; equal k => equal score & severity
      const pyK = pyF.evidence.k_cut_gates;
      const jsK = jsF.evidence.k_cut_gates;
      if (jsK > pyK) {
        console.error(`FAIL [${name}] QWE-001: js k_cut (${jsK}) > py k_cut (${pyK})`);
        failed = true;
      }
      if (jsK === pyK) {
        if (jsF.score !== pyF.score || jsF.severity !== pyF.severity) {
          console.error(`FAIL [${name}] QWE-001: equal k (${jsK}) but score/sev mismatch: py=(${pyF.score},${pyF.severity}) js=(${jsF.score},${jsF.severity})`);
          failed = true;
        }
      }
    } else {
      if (jsF.score !== pyF.score || jsF.severity !== pyF.severity) {
        console.error(`FAIL [${name}] ${id}: score/severity mismatch. Py=(${pyF.score}, ${pyF.severity}) vs JS=(${jsF.score}, ${jsF.severity})`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error("FAIL: Parity test failed.");
  process.exit(1);
} else {
  console.log(`PARITY OK (${fixturesTested} fixtures)`);
  process.exit(0);
}
