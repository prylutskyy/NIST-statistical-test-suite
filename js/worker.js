'use strict';

importScripts(
  'math.js',
  'tests/test-01-frequency.js',
  'tests/test-02-block-frequency.js',
  'tests/test-03-runs.js',
  'tests/test-04-longest-run.js',
  'tests/test-05-matrix-rank.js',
  'tests/test-06-non-overlapping.js',
  'tests/test-07-overlapping.js',
  'tests/test-08-maurer.js',
  'tests/test-09-linear-complexity.js',
  'tests/test-10-serial.js',
  'tests/test-11-approx-entropy.js',
  'tests/test-12-cusum.js',
  'tests/test-13-random-excursions.js',
  'tests/test-14-random-excursions-variant.js'
);

var TESTS_WORKER = [
  { run: testFrequency,                extraArgs: null },
  { run: testBlockFrequency,           extraArgs: function(p){ return [p.M]; } },
  { run: testRuns,                     extraArgs: null },
  { run: testLongestRun,               extraArgs: null },
  { run: testMatrixRank,               extraArgs: null },
  { run: testNonOverlapping,           extraArgs: function(p){ return [p.m]; } },
  { run: testOverlapping,              extraArgs: function(p){ return [p.m]; } },
  { run: testMaurer,                   extraArgs: null },
  { run: testLinearComplexity,         extraArgs: function(p){ return [p.lcM]; } },
  { run: testSerial,                   extraArgs: null },
  { run: testApproxEntropy,            extraArgs: null },
  { run: testCusum,                    extraArgs: null },
  { run: testRandomExcursions,         extraArgs: null },
  { run: testRandomExcursionsVariant,  extraArgs: null }
];

self.onmessage = function(e) {
  var bits = e.data.bits;
  var params = e.data.params;
  var results = [];

  for (var i = 0; i < TESTS_WORKER.length; i++) {
    var t = TESTS_WORKER[i];
    var args = [bits].concat(t.extraArgs ? t.extraArgs(params) : []);
    try {
      var r = t.run.apply(null, args);
      results.push(r);
    } catch (err) {
      console.error('Test ' + (i+1) + ' failed', err);
      results.push(null);
    }
  }

  self.postMessage({ results: results, params: params, bitsLength: bits.length });
};
