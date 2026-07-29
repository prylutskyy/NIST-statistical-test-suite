'use strict';

importScripts(
  'math.js',
  'math/fft.js',
  'math/dft.js',
  'tests/test-01-frequency.js',
  'tests/test-02-block-frequency.js',
  'tests/test-03-runs.js',
  'tests/test-04-longest-run.js',
  'tests/test-05-matrix-rank.js',
  'tests/test-06-discrete-fourier-transform.js',
  'tests/test-07-non-overlapping.js',
  'tests/test-08-overlapping.js',
  'tests/test-09-maurer.js',
  'tests/test-10-linear-complexity.js',
  'tests/test-11-serial.js',
  'tests/test-12-approx-entropy.js',
  'tests/test-13-cusum.js',
  'tests/test-14-random-excursions.js',
  'tests/test-15-random-excursions-variant.js'
);

var TESTS_WORKER = [
  { run: testFrequency,                extraArgs: null },
  { run: testBlockFrequency,           extraArgs: function(p){ return [p.M]; } },
  { run: testRuns,                     extraArgs: null },
  { run: testLongestRun,               extraArgs: null },
  { run: testMatrixRank,               extraArgs: null },
  { run: testDiscreteFourierTransform, extraArgs: null },
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
  var total = TESTS_WORKER.length;

  for (var i = 0; i < total; i++) {
    var t = TESTS_WORKER[i];
    var args = [bits].concat(t.extraArgs ? t.extraArgs(params) : []);
    
    // Повідомляємо UI про старт тесту
    self.postMessage({ type: 'progress', testIndex: i, total: total });
    
    try {
      var r = t.run.apply(null, args);
      results.push(r);
    } catch (err) {
      console.error('Test ' + (i+1) + ' failed', err);
      results.push(null);
    }
  }

  self.postMessage({ type: 'done', results: results, params: params, bitsLength: bits.length });
};
