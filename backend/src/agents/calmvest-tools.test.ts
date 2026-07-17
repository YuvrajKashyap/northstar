import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { DemoSeed } from '@calmvest/shared';
import { runCalmVestTool } from './calmvest-tools.js';

const seed = JSON.parse(
  await readFile(new URL('../data/demo-seed.json', import.meta.url), 'utf-8'),
) as DemoSeed;

test('stress calculation is deterministic and responds to shock severity', () => {
  const mild = runCalmVestTool('run_stress_test', { marketShockPct: -10, withdrawalPct: 20 }, seed).result;
  const mildAgain = runCalmVestTool('run_stress_test', { marketShockPct: -10, withdrawalPct: 20 }, seed).result;
  const severe = runCalmVestTool('run_stress_test', { marketShockPct: -30, withdrawalPct: 20 }, seed).result;

  assert.deepEqual(mild, mildAgain);
  assert.ok(Number(severe.stressLossPct) < Number(mild.stressLossPct));
  assert.equal(mild.methodology, 'asset-class shock sensitivity v1');
});

test('scenario paths are derived from the fixture and keep actions approval-gated', () => {
  const stress = runCalmVestTool('run_stress_test', { marketShockPct: -20, withdrawalPct: 20 }, seed).result;
  const tax = runCalmVestTool('estimate_tax_impact', stress, seed).result;
  const paths = runCalmVestTool('compare_plan_paths', { stress, tax }, seed).result;
  const receipt = runCalmVestTool('create_trust_receipt', { stress, tax, paths }, seed).result;

  assert.equal(paths.recommendation, 'Balanced protection');
  assert.equal(receipt.humanControl, 'approval_required');
  assert.equal(receipt.taxLiability, undefined);
  assert.match(String(receipt.limitation), /Synthetic scenario output/);
});
