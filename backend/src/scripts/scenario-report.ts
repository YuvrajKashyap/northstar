import { readFile } from 'node:fs/promises';
import type { DemoSeed } from '@calmvest/shared';
import { runCalmVestTool } from '../agents/calmvest-tools.js';

const seed = JSON.parse(
  await readFile(new URL('../data/demo-seed.json', import.meta.url), 'utf-8'),
) as DemoSeed;

const scenario = runCalmVestTool('parse_scenario', {
  marketShockPct: -20,
  withdrawalPct: 20,
  horizonMonths: 12,
}, seed).result;
const stress = runCalmVestTool('run_stress_test', scenario, seed).result;
const tax = runCalmVestTool('estimate_tax_impact', stress, seed).result;
const paths = runCalmVestTool('compare_plan_paths', { stress, tax }, seed).result;
const receipt = runCalmVestTool('create_trust_receipt', { scenario, stress, tax, paths }, seed).result;

console.log(JSON.stringify({
  provenance: seed.provenance,
  scenario,
  stress,
  tax,
  paths,
  receipt,
}, null, 2));
