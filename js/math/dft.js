/* 
 * Discrete Fourier Transform (DFT) utility using fft.js
 * Implements Bluestein's FFT algorithm for arbitrary sizes.
 */
var globalObj = typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this);

function computeDFTMagnitude(X, n) {
  // If n is a power of 2, we can use Radix-2 directly.
  if ((n & (n - 1)) === 0) {
    const fft = new globalObj.FFT(n);
    const cX = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      cX[i * 2] = X[i];
    }
    const out = new Float64Array(n * 2);
    fft.transform(out, cX);
    
    const mag = new Float64Array(Math.floor(n / 2));
    for (let i = 0; i < mag.length; i++) {
      mag[i] = Math.sqrt(out[i * 2] * out[i * 2] + out[i * 2 + 1] * out[i * 2 + 1]);
    }
    return mag;
  }
  
  // Bluestein's algorithm for arbitrary n
  let m = 1;
  while (m < 2 * n - 1) m *= 2;
  
  const fft = new globalObj.FFT(m);
  const a = new Float64Array(m * 2);
  const b = new Float64Array(m * 2);
  
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI * i * i / n;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    a[i * 2] = X[i] * c;
    a[i * 2 + 1] = X[i] * s;
  }
  
  for (let i = 0; i < n; i++) {
    const angle = Math.PI * i * i / n;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    b[i * 2] = c;
    b[i * 2 + 1] = s;
  }
  for (let i = 1; i < n; i++) {
    const angle = Math.PI * i * i / n;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    b[(m - i) * 2] = c;
    b[(m - i) * 2 + 1] = s;
  }
  
  const A = new Float64Array(m * 2);
  const B = new Float64Array(m * 2);
  fft.transform(A, a);
  fft.transform(B, b);
  
  const C = new Float64Array(m * 2);
  for (let i = 0; i < m; i++) {
    const ar = A[i * 2], ai = A[i * 2 + 1];
    const br = B[i * 2], bi = B[i * 2 + 1];
    C[i * 2] = ar * br - ai * bi;
    C[i * 2 + 1] = ar * bi + ai * br;
  }
  
  const cOut = new Float64Array(m * 2);
  fft.inverseTransform(cOut, C);
  
  const mag = new Float64Array(Math.floor(n / 2));
  for (let i = 0; i < mag.length; i++) {
    // cOut must be normalized by m because fft.js inverse doesn't divide by m
    const outR = cOut[i * 2] / m;
    const outI = cOut[i * 2 + 1] / m;
    
    const angle = -Math.PI * i * i / n;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    
    const finalR = outR * cosA - outI * sinA;
    const finalI = outR * sinA + outI * cosA;
    
    mag[i] = Math.sqrt(finalR * finalR + finalI * finalI);
  }
  
  return mag;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = computeDFTMagnitude;
} else {
  globalObj.computeDFTMagnitude = computeDFTMagnitude;
}
