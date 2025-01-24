# OWASP Risk Assessment Calculator – URL Logic

This document describes the URL logic for configuring our OWASP Risk Assessment Calculator.

1. **Likelihood Configuration** (`likelihoodConfig`)
2. **Impact Configuration** (`impactConfig`)
3. **Mapping** (`mapping`)
4. **Vector** (optional) (`vector`)

Using this approach, you can create **more flexible** risk matrices (n×m) while predefining input values (16 factors).

---

## Structure & Parameter Format

### 1) Likelihood Configuration: `likelihoodConfig`
- Format: `LEVEL:MIN-MAX;LEVEL2:MIN2-MAX2;...`
- Example (3-level): `likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9`

- **LOW**: 0 ≤ value < 3
- **MEDIUM**: 3 ≤ value < 6
- **HIGH**: 6 ≤ value ≤ 9

You can define as many levels as needed; for example, a 5-level scale:  
`likelihoodConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9`

**Note:** Ensure correct formatting (no spaces except around `:` or `-`):

### 2) Impact Configuration: `impactConfig`
- Format identical to `likelihoodConfig`
- Example (also 3-level): `impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9`

- **NOTE**: 0 ≤ value < 3
- **LOW**: 3 ≤ value < 6
- **HIGH**: 6 ≤ value ≤ 9

### 3) Mapping: `mapping`
- Describes the **matrix** (n×m) derived from the defined likelihood and impact levels.
- The number of entries must **exactly** equal `n×m`.
- **n**: Number of defined likelihood levels
- **m**: Number of defined impact levels
- Format: Comma-separated list (`,`) in the **exact order** of the rows.

Example:
- Likelihood levels = `[LOW, MEDIUM, HIGH]` (3 levels)
- Impact levels = `[NOTE, LOW, HIGH]` (3 levels)
- => 3×3 = 9 entries: `mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9`

The mapping is structured as follows (pseudocode, rows = likelihood, columns = impact):

|          | NOTE | LOW  | HIGH |
|----------|------|------|------|
| LOW      | Val1 | Val2 | Val3 |
| MEDIUM   | Val4 | Val5 | Val6 |
| HIGH     | Val7 | Val8 | Val9 |

**Important:** The order of entries in `mapping` **must** match the sorted levels used by the script (see below: sorted by `minVal`).

### 4) Vector: `vector` (optional)
- Defines the **16 input factors**, e.g., `(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)`.
- Format: `(key:val/key:val/key:val/...)`

- **key** must be one of the 16 known factors (`sl, m, o, s, ed, ee, a, id, lc, li, lav, lac, fd, rd, nc, pv`).
- **val** is a number between 0 and 9.
- Pay attention to case sensitivity: the script expects lowercase keys or may convert them automatically.
- Invalid keys or values > 9 will result in an **error**.

---

## Full URL Example

Suppose you want:
- 3 likelihood levels: `LOW, MEDIUM, HIGH`
- 3 impact levels: `NOTE, LOW, HIGH`
- 9 entries in the mapping
- Predefined factors

Your URL might look like this:  
`?likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9&mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9&vector=(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:0/lc:9/li:0/lav:0/lac:2/fd:5/rd:5/nc:0/pv:1)`

1. **likelihoodConfig** = `LOW:0-3;MEDIUM:3-6;HIGH:6-9`
2. **impactConfig** = `NOTE:0-3;LOW:3-6;HIGH:6-9`
3. **mapping** = `Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9`
    - **n=3** (LOW, MEDIUM, HIGH)
    - **m=3** (NOTE, LOW, HIGH)
    - => 3×3 = 9 values
4. **vector** = `(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:0/lc:9/li:0/lav:0/lac:2/fd:5/rd:5/nc:0/pv:1)`

### Script Workflow

1. The script **parses** `likelihoodConfig` to build an object, e.g., `{LOW:[0,3],MEDIUM:[3,6],HIGH:[6,9]}`.
2. It **parses** `impactConfig` to build another object, e.g., `{NOTE:[0,3],LOW:[3,6],HIGH:[6,9]}`.
3. **Mapping** is converted into a matrix:
    - `LOW-NOTE` => Val1
    - `LOW-LOW` => Val2
    - `LOW-HIGH` => Val3
    - `MEDIUM-NOTE` => Val4
    - ...
    - `HIGH-HIGH` => Val9
4. If `vector` is present, it is processed, and input fields (e.g., `sl`, `m`, `o`) are directly populated.
5. This generates:
    - **LS** (average)
    - **IS** (maximum)
6. **Likelihood class** (e.g., LOW) and **impact class** (e.g., HIGH) are determined, and the final risk (e.g., Val3) is derived using `mappingObj`.

---

## Error Cases

- **Missing Parameters**  
  If `likelihoodConfig`, `impactConfig`, or `mapping` is missing, the script displays a **warning** and may fall back to a default configuration.
- **Invalid Format**
    - For `likelihoodConfig=LOW:0-ABC;HIGH:2-9`, `ABC` is identified as invalid => Error.
    - For `mapping` with too few or too many entries => Error.
- **Unknown Keys** in `vector` => Ignored or logged as a console warning.
- **Values > 9** in `vector` => Error.

---

## Additional Examples

### A) 2×2 Matrix
`?likelihoodConfig=LOW:0-2;HIGH:2-9&impactConfig=MINOR:0-5;MAJOR:5-9&mapping=Val1,Val2,Val3,Val4&vector=(sl:1/m:1/o:0/s:5/ed:1/ee:1/a:3/id:2/lc:4/li:0/lav:0/lac:1/fd:2/rd:2/nc:0/pv:0)`

- Likelihood levels: `LOW, HIGH`
- Impact levels: `MINOR, MAJOR`
- Mapping =>
    - LOW-MINOR => Val1
    - LOW-MAJOR => Val2
    - HIGH-MINOR => Val3
    - HIGH-MAJOR => Val4

### B) 4×3 Matrix
`?likelihoodConfig=L0:0-2;L1:2-4;L2:4-6;L3:6-9&impactConfig=I0:0-3;I1:3-6;I2:6-9&mapping=U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12&vector=(sl:1/m:1/o:0/s:9/ed:1/ee:5/a:1/id:1/lc:3/li:5/lav:2/lac:8/fd:3/rd:2/nc:0/pv:0)`

- Likelihood = 4 levels (`L0, L1, L2, L3`)
- Impact = 3 levels (`I0, I1, I2`)
- => 4×3 = 12 entries in `mapping`
- The rest is analogous.

---

## Summary

1. Use **four parameters**: `likelihoodConfig`, `impactConfig`, `mapping`, `vector`.
2. *All* are mandatory (except `vector`, which is optional).
3. The **size** (number of levels) of `likelihoodConfig` and `impactConfig` determines the **number** of required `mapping` entries (`n × m`).
4. `vector` can be omitted. In this case, input fields remain default to the lowest configuration possible.
5. The script calculates **LS & IS** and derives the **final risk** using the `mapping` matrix.
6. **Radar charts** and **output texts** are updated automatically.

With this **URL logic**, you can define complex n×m matrices and embed corresponding vectors (16 factors) directly.