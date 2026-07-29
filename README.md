# NIST Test Suite | SP 800-22 Statistical Tests

A complete, client-side browser implementation of the **NIST SP 800-22 Rev 1a** statistical test suite for evaluating the randomness of binary sequences. All 15 tests run entirely in your browser — no server, no data upload, no external dependencies beyond Chart.js.

---

## What Is This?

[NIST SP 800-22](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-22r1a.pdf) is the de-facto standard battery of statistical tests for evaluating random and pseudorandom number generators (RNGs and PRNGs) used in cryptographic applications. It was published by the National Institute of Standards and Technology in 2010 and defines 15 tests (this suite implements all 15 that apply to a single binary sequence).

This tool is useful for:

- **Security researchers and engineers** validating hardware TRNGs and software PRNGs before deployment
- **Students and educators** in cryptography, information theory, or statistics
- **Developers** performing acceptance testing on entropy sources
- **Anyone curious** about whether a bit sequence is statistically random

---

## Features

| Feature | Detail |
|---|---|
| **All 15 NIST tests** | Tests 1–15 per NIST SP 800-22 Rev 1a, verified against Appendix B reference vectors |
| **Apple-style UI** | Sidebar + animated carousel panel, dark/light mode |
| **File loading** | Drag-and-drop or file picker; accepts binary, Base64-encoded, or plain 0/1 text |
| **PDF Audit Reports** | Exports a formal, print-ready mathematical PDF report with headless charts |
| **Data Fingerprinting** | Computes dual SHA-256 hashes (original file & ASCII sequence) for audit integrity |
| **Base64 pipeline** | Decodes Base64 → raw bytes → bits (MSB first); Base64 chars are never analysed directly as bits |
| **Configurable parameters** | Block size (M), template length (m), LC block size — all adjustable |
| **Web Workers** | Mathematical analysis is offloaded to a background thread to keep the UI fully responsive |
| **Privacy by design** | All computation is local; your data never leaves the browser |
| **Unit tested** | 186 automated tests (127 NIST + 59 pipeline) — zero external test libraries |
| **SOLID architecture** | 23 source files across 4 dependency layers; one file per test |

---

## Supported Input Formats

The file-loading pipeline detects format automatically:

```
File dropped / selected
    │
    ├─ Known binary extension (.bin, .exe, .jpg, .pdf, .gz, …)?
    │       └─► readAsArrayBuffer → each byte → 8 bits (MSB first)
    │
    └─ Other extension → read as text, then:
            │
            ├─ Content is only '0' and '1'?
            │       └─► Plain text — use directly
            │
            ├─ Content matches Base64 charset [A-Za-z0-9+/=]?
            │       └─► atob() → Uint8Array → bytes → bits
            │              (Base64 chars are NEVER used as bits directly)
            │
            └─ Other → readAsArrayBuffer → bytes → bits
```

**Byte-to-bit convention:** MSB first — byte `0xAB` (10101011) produces `10101011`. This matches the NIST SP 800-22 convention used in all 15 tests.

---

## The 15 Tests

| # | Name | Detects | Min bits |
|---|---|---|---|
| 1 | Frequency (Monobit) | Imbalance between 0s and 1s | 100 |
| 2 | Block Frequency | Imbalance of 1s in M-bit blocks | M |
| 3 | Runs | Too many or too few bit transitions | 100 |
| 4 | Longest Run of Ones | Unusually long runs of 1s in blocks | 128 |
| 5 | Binary Matrix Rank | Linear dependence via GF(2) rank | 1 024 |
| 6 | Discrete Fourier Transform | Periodic features in the sequence | 1 000 |
| 7 | Non-Overlapping Template | Excess occurrences of aperiodic pattern | 8×m |
| 8 | Overlapping Template | Excess overlapping all-ones pattern | 1 032 |
| 9 | Maurer's Universal | Compressibility of the sequence | ~3 850 |
| 10 | Linear Complexity | LFSR length per block (Berlekamp–Massey) | LC block |
| 11 | Serial | Unequal frequency of 3-bit patterns | 100 |
| 12 | Approximate Entropy | m-bit vs (m+1)-bit pattern frequency difference | 100 |
| 13 | Cumulative Sums | Deviation of partial-sum walk from zero | 100 |
| 14 | Random Excursions | Visits to states ±1…±4 per cycle | no fixed minimum¹ |
| 15 | Random Excursions Variant | Total visits to states ±1…±9 | no fixed minimum¹ |

> ¹ Tests 14 & 15 use the condition J ≥ MAX(0.005·√n, 500), taken directly from the NIST STS C source.
> J is the number of zero crossings of the partial-sum walk and follows the arc-sine distribution.
> E[J] ≈ √(2n/π), so even n = 1 000 000 bits gives J ≥ 500 in only ~60% of random sequences.
> N/A is a valid, expected outcome per NIST design — not an implementation error.
> See [`INVESTIGATION_REPORT.md`](INVESTIGATION_REPORT.md) for the full mathematical analysis.

---

## Project Structure

```
nist/
├── index.html                    # Main entry point (navigation, layout)
├── css/
│   └── styles.css                # Apple-style dark/light theme (CSS variables)
├── js/
│   ├── math.js                   # Pure math: erfc, igamc, lgamma, norm_cdf
│   ├── runner.js                 # Orchestration: run all tests, update summary
│   ├── tests/
│   │   ├── test-01-frequency.js
│   │   ├── test-02-block-frequency.js
│   │   ├── test-03-runs.js
│   │   ├── test-04-longest-run.js
│   │   ├── test-05-matrix-rank.js
│   │   ├── test-06-discrete-fourier-transform.js
│   │   ├── test-07-non-overlapping.js
│   │   ├── test-08-overlapping.js
│   │   ├── test-09-maurer.js
│   │   ├── test-10-linear-complexity.js
│   │   ├── test-11-serial.js
│   │   ├── test-12-approx-entropy.js
│   │   ├── test-13-cusum.js
│   │   ├── test-14-random-excursions.js
│   │   └── test-15-random-excursions-variant.js
│   └── ui/
│       ├── carousel.js           # Apple-style sidebar + animated panels
│       ├── card.js               # Card factory (legacy, used by old renderers)
│       ├── charts.js             # Chart.js configuration helpers
│       ├── controller.js         # Input validation, file loading pipeline
│       └── renderers.js          # Per-test stat renderers
└── tests/
    ├── framework.js              # Zero-dependency TAP-compatible test runner
    ├── loader.js                 # VM-based module loader for Node.js testing
    ├── nist.test.js              # 127 unit tests: all 15 NIST tests + math utils
    └── pipeline.test.js          # 59 unit tests: file loading pipeline (binary/Base64)
```

### Dependency layers

```
math.js          ← Layer 1: pure numerical utilities (no dependencies)
tests/test-*.js  ← Layer 2: one file per NIST test, depends on math.js
ui/charts.js     ← Layer 3a: Chart.js abstraction
ui/card.js       ← Layer 3b: card DOM factory
ui/renderers.js  ← Layer 3c: per-test renderers
runner.js        ← Layer 4: orchestration (depends on all tests + carousel)
ui/controller.js ← Layer 4: event handling, file pipeline
ui/carousel.js   ← Layer 4: Apple-style sidebar + panel carousel
```

---

## Running Tests

Requires Node.js v14+. No `npm install` needed — zero external dependencies.

```bash
# NIST statistical tests (127 tests)
node tests/nist.test.js

# File loading pipeline (59 tests)
node tests/pipeline.test.js
```

Expected output for each:
```
─────────────────────────────────────────────────
 NIST SP 800-22  Unit Test Results
─────────────────────────────────────────────────

  Frequency (Monobit)
  ✓ NIST Appendix B reference p-value
  ✓ ...

─────────────────────────────────────────────────
  N passed  (N total)
─────────────────────────────────────────────────
```

Exit code = number of failures (0 = all passed). Suitable for CI integration:
```bash
node tests/nist.test.js && node tests/pipeline.test.js && echo "All OK"
```

---

## Mathematical Notes

### p-values and significance threshold

Each test computes a p-value: the probability that a truly random sequence produces a statistic at least as extreme as observed. The threshold is **α = 0.01** (1%).

- **p ≥ 0.01** → PASS — no statistical evidence of non-randomness
- **p < 0.01** → FAIL — evidence of a detectable pattern
- **N/A** → sequence too short for this test

For any truly random sequence, ~1% of tests fail by chance at α = 0.01. An isolated failure is not conclusive.

### Math implementation

All p-values use either:
- `erfc(x)` — complementary error function (Abramowitz & Stegun 7.1.26, accuracy < 1.5×10⁻⁷)
- `Q(a, x)` — regularised upper incomplete gamma function (series expansion for x < a+1, Lentz continued fraction otherwise)

### Random Excursions threshold — Tests 14 & 15

These two tests operate on the partial-sum random walk S[i] of the input sequence. They require a minimum number of **zero crossings** J.

**Official NIST constraint** (from `randomExcursions.c` in STS 2.1.2):
```c
constraint = MAX(0.005 * sqrt(n), 500);
```
For all practical n < 10¹⁰ this always equals 500, so the effective condition is **J ≥ 500**.

**Distribution of J** follows the arc-sine law (Feller 1968), not a normal distribution:
```
E[J] ≈ √(2n/π)          Var[J] ≈ n·(π−2)/π²
```
Because σ[J] ≈ 0.65·√n is the same order as E[J], the distribution has extremely heavy tails.

**Empirical probabilities** (500 Monte Carlo trials per n):

| n | E[J] | P(J ≥ 500) |
|---|---|---|
| 10 000 | ~80 | < 1% |
| 100 000 | ~271 | ~14% |
| 1 000 000 | ~786 | ~62% |
| 5 000 000 | ~1 800 | ~82% |

There is no value of n that guarantees J ≥ 500 for every sequence. **N/A is a valid, expected result** per NIST design: when a sequence does not produce enough cycles, it is simply excluded from the analysis for these two tests. NIST's formal evaluation protocol (Section 4) runs ≥ 55 independent streams of 1 000 000 bits each and counts the fraction that meet the threshold.

Full investigation documented in [`INVESTIGATION_REPORT.md`](INVESTIGATION_REPORT.md).

### Berlekamp–Massey algorithm (Test 9)

The correct theorem (Massey 1969): for any binary sequence of length n, the LFSR complexity L satisfies **L ≤ n**. The expected value for a random sequence is **μ_L ≈ n/2 + (4+r)/18** where r = n mod 2, with standard deviation **σ ≈ √(11n/180)**.

Note: the naive claim "L ≤ ceil(n/2)" is **false** for individual sequences. For example, [1,1,1,0] of length 4 yields L = 3 > ceil(4/2) = 2.

---

## Known Limitations

- **Tests 14 & 15** require J ≥ 500 zero crossings, where J follows the arc-sine distribution with E[J] ≈ √(2n/π). There is no fixed minimum n: at n = 1 000 000 bits, P(J ≥ 500) ≈ 60%; at n = 10 000 bits, P(J ≥ 500) < 1%. NIST Appendix B uses 1 000 000-bit streams. See `INVESTIGATION_REPORT.md` for full analysis.
- **Test 8** (Maurer Universal) needs ≥ 904 960 bits for the minimum L = 6 parameter level.
- This tool analyses a **single sequence**. NIST SP 800-22 Section 4 recommends testing ≥ 55 sequences of 1 000 000 bits each for a formal generator evaluation.
- The **Generate** buttons use `window.crypto.getRandomValues()` (a cryptographically secure PRNG provided by the browser).

---

## Changelog

### 2026-07-29
- **Added:** Formal PDF Audit Reports. Exports a multi-page, print-ready document containing the overall verdict, summary table, and mathematical parameters for all 15 tests, complete with high-contrast, headless Chart.js rendering (via pdfmake).
- **Added:** Dual SHA-256 Fingerprinting. To guarantee audit integrity, the suite now records and displays both the hash of the *Original Source File* (via `crypto.subtle.digest` on the raw ArrayBuffer) and the hash of the *Analyzed ASCII Sequence*.
- **Refactor:** Migrated heavy statistical calculations (15 NIST tests) to run asynchronously in a Web Worker, preventing UI freezing and keeping the interface responsive even for multi-million-bit sequences.
- **Added:** Smooth pulsing inline loading state during analysis.

### 2026-05-05
- **Fixed:** Tests 14 & 15 — N/A message corrected from the misleading "Use >= 10 000 bits" to an accurate description referencing the arc-sine distribution, E[J] ≈ √(2n/π), and the NIST official constraint `MAX(0.005·√n, 500)`.
- **Fixed:** Unit test `"L ≤ n/2 for random sequences (half-length bound)"` replaced with two mathematically correct tests: (a) `L ≤ n` (Massey 1969 hard bound) and (b) `|L − μ_L| < 5σ` (statistical proximity to expected value). The original claim `L ≤ ceil(n/2)` is false for individual sequences — e.g. [1,1,1,0] gives L = 3 > 2.
- **Added:** `INVESTIGATION_REPORT.md` — full technical analysis of the J ≥ 500 threshold, arc-sine distribution of zero crossings, and empirical probability tables.
- **Added:** `tests/pipeline.test.js` — 59 unit tests covering the file-loading pipeline (binary/Base64/plain-text decoding).
- **Added:** File loading via drag-and-drop and file picker; supports binary files, Base64-encoded data, and plain 0/1 text — format detected automatically.
- **Added:** Generate button for 1 000 000-bit sequences (needed for Tests 14 & 15 to have a reasonable chance of producing J ≥ 500).
- **Added:** Help page, About page with authorship notes.
- **Added:** Dark/light mode toggle.
- **Added:** Apple-style carousel UI — sidebar with per-test indicator dots and animated panel transitions.
- **Fixed:** Test 8 (Maurer Universal) — off-by-one error in EV/VAR lookup table corrected. Arrays had 5 leading zeros instead of 6, causing all lookups to be shifted by one index (e.g. returning EL for L=7 when L=6 was requested). Discovered via unit tests.
- **Fixed:** Firefox compatibility — `color-mix()` replaced with explicit rgba fallbacks; `backdrop-filter` wrapped in `@supports`; `inset: 0` replaced with explicit `top/right/bottom/left`; `will-change` hints added for animated elements.

---

## Reference

Rukhin, A., Soto, J., Nechvatal, J., Smid, M., Barker, E., Leigh, S., Levenson, M., Vangel, M., Banks, D., Heckert, A., Dray, J., and Vo, S. (2010). *A Statistical Test Suite for Random and Pseudorandom Number Generators for Cryptographic Applications.* NIST Special Publication 800-22 Revision 1a. National Institute of Standards and Technology.

---

## Authorship

This project was orchestrated, managed, and verified by **[Alex Prylutskyy](https://www.linkedin.com/in/prylutskyy/)**.

The underlying code (architecture, algorithms, UI, unit tests, and documentation) was generated by large language models (LLMs) through an iterative, conversation-driven development process. Alex directed the AI's execution, meticulously reviewed the generated code, and rigorously checked the mathematical correctness of the algorithms against the official NIST SP 800-22 Rev 1a Appendix B reference vectors.

During this verification process, critical mathematical nuances were addressed—such as correcting an off-by-one indexing error in the Maurer Universal test (Test 8) lookup table, and properly implementing the arc-sine distribution bounds for the Random Excursions tests.

---

*No external libraries were used beyond Chart.js (for visualisation) and pdfmake (for PDF export).*
