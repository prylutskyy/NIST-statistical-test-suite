// test-06-discrete-fourier-transform.js

if (typeof require !== 'undefined') {
  var { erfc } = require('../math.js');
  var computeDFTMagnitude = require('../math/dft.js');
}

/**
 * 6. Discrete Fourier Transform (Spectral) Test
 * @param {Uint8Array} bits - The input sequence (0s and 1s)
 * @returns {Object} { pValue, status, stats }
 */
function testDiscreteFourierTransform(bits) {
  const n = bits.length;
  if (n < 1000) {
    return { pValue: null, status: 'N/A', stats: { 'Min bits required': 1000, 'Bits provided': n } };
  }

  // 1. Convert to -1 and +1
  const X = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    X[i] = bits[i] === 1 ? 1 : -1;
  }

  // 2. Compute DFT magnitude of the first half
  const m = computeDFTMagnitude(X, n);

  // 3. Compute the peak height threshold
  const T = Math.sqrt(Math.log(1 / 0.05) * n);

  // 4. Compute expected number of peaks
  const N0 = 0.95 * n / 2;

  // 5. Count actual number of peaks less than T
  let N1 = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] < T) {
      N1++;
    }
  }

  // 6. Compute d and p-value
  const d = (N1 - N0) / Math.sqrt((n * 0.95 * 0.05) / 4);
  const pValue = erfc(Math.abs(d) / Math.SQRT2);

  return {
    pValue: pValue,
    status: pValue >= 0.01 ? 'PASS' : 'FAIL',
    stats: {
      'Expected peaks < T': N0.toFixed(2),
      'Actual peaks < T': N1,
      'Threshold (T)': T.toFixed(4),
      'Statistic (d)': d.toFixed(4)
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = testDiscreteFourierTransform;
}
