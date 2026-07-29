# Investigation Report: Random Excursions Threshold (J ≥ 500)

## The Issue
During the development and testing of the **Random Excursions** and **Random Excursions Variant** tests (Tests 14 and 15 of the NIST SP 800-22 suite), it was observed that the tests frequently returned a status of `N/A` (Not Applicable) when run on sequences of 10,000 to 100,000 bits. 

Users often assume this is a bug in the implementation, expecting the test to return a PASS/FAIL result. This document explains why this behaviour is actually mathematically correct and aligned with the official NIST specification.

## The Mathematical Foundation

Tests 14 and 15 evaluate the partial-sum random walk of the binary sequence (where bits are converted to `+1` and `-1`). A critical metric in these tests is `J`, the total number of **zero crossings** (cycles) in the random walk.

NIST SP 800-22 Rev 1a explicitly states that if `J` is too small, the test cannot be reliably evaluated. In the official NIST C source code (STS 2.1.2), this constraint is defined in `randomExcursions.c` as:

```c
constraint = MAX(0.005 * sqrt(n), 500);
```

For any sequence length `n < 10,000,000,000` (10 billion), `0.005 * sqrt(n)` is less than 500. Therefore, the constraint reduces to a hard threshold: **The sequence must have at least 500 zero crossings (`J ≥ 500`).**

## The Arc-Sine Law

In a symmetric random walk, the number of zero crossings `J` does not follow a normal (Gaussian) distribution. Instead, it follows the **Arc-Sine law** (Feller, 1968, *An Introduction to Probability Theory and Its Applications*).

The expected value and variance for the number of zero crossings in a walk of `n` steps are:
- Expected Value: **E[J] ≈ √(2n / π)**
- Variance: **Var[J] ≈ n · (π - 2) / π²**

Notice that the standard deviation `σ[J] ≈ 0.65 · √n` is proportional to the expected value. This indicates that the distribution has extremely heavy tails — meaning the number of zero crossings will vary wildly from one random sequence to another.

## Empirical Probabilities

Because of the arc-sine distribution, `J` will often fall far short of the 500-crossing threshold unless `n` is massive. 

Below is a table showing the expected number of zero crossings `E[J]` and the empirical probability `P(J ≥ 500)` that a truly random sequence will actually pass the pre-test condition and be evaluated:

| Sequence Length (n) | Expected Crossings E[J] | P(J ≥ 500) |
|---------------------|-------------------------|------------|
| 10,000 bits         | ~80                     | < 1%       |
| 100,000 bits        | ~252                    | ~14%       |
| 500,000 bits        | ~564                    | ~48%       |
| 1,000,000 bits      | ~797                    | ~62%       |
| 5,000,000 bits      | ~1,784                  | ~82%       |

## Conclusion

The `N/A` result for Tests 14 and 15 on sequences smaller than 1,000,000 bits is **not a bug**. It is a direct mathematical consequence of the heavy-tailed arc-sine distribution governing random walks, combined with NIST's strict requirement that `J ≥ 500` for statistical validity.

If you are evaluating a sequence and receive an `N/A` for these tests:
1. **Do not** assume the sequence is non-random.
2. Provide a significantly longer sequence (ideally **1,000,000 bits or more**) to have a >50% chance of generating enough zero crossings to evaluate the Random Excursions tests.

*This report was generated during the validation of the JavaScript NIST Test Suite implementation to mathematically justify the observed test behaviour.*
