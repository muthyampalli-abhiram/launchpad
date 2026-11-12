import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateOverallKpi,
  classifyPerformance,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  KPI_PILLARS,
  STAGE_EVALUATION_RUBRICS,
} from '../src/constants/launchpad.ts';

test('KPI pillar weights sum to 1.00 (100%)', () => {
  const sum = KPI_PILLARS.reduce((acc, p) => acc + p.weight, 0);
  assert.equal(Math.round(sum * 100), 100);
});

test('Official Overall KPI formula calculates exact weighted score', () => {
  // (80 * 0.25) + (90 * 0.45) + (70 * 0.15) + (60 * 0.15) = 20 + 40.5 + 10.5 + 9 = 80
  assert.equal(calculateOverallKpi(80, 90, 70, 60), 80);
  assert.equal(calculateOverallKpi(100, 100, 100, 100), 100);
  assert.equal(calculateOverallKpi(0, 0, 0, 0), 0);
});

test('All four LAUNCHPAD stage evaluation rubrics sum to exactly 100', () => {
  for (const stage of [1, 2, 3, 4] as const) {
    const rubric = STAGE_EVALUATION_RUBRICS[stage];
    const totalWeight = rubric.metrics.reduce((sum, m) => sum + m.weight, 0);
    assert.equal(totalWeight, 100, `Stage ${stage} rubric must sum to 100`);
  }
});

test('L1/L2/L3 classification bands map scores and preserve approval status', () => {
  assert.equal(classifyPerformance(59.5, DEFAULT_CLASSIFICATION_THRESHOLDS, 'PENDING_APPROVAL').label, 'Development Required');
  assert.equal(classifyPerformance(60, DEFAULT_CLASSIFICATION_THRESHOLDS, 'PENDING_APPROVAL').label, 'L1');
  assert.equal(classifyPerformance(70, DEFAULT_CLASSIFICATION_THRESHOLDS, 'PENDING_APPROVAL').label, 'L2');
  assert.equal(classifyPerformance(85, DEFAULT_CLASSIFICATION_THRESHOLDS, 'APPROVED').label, 'L3');
  assert.equal(classifyPerformance(85, DEFAULT_CLASSIFICATION_THRESHOLDS, 'PENDING_APPROVAL').approvalStatus, 'PENDING_APPROVAL');
});

