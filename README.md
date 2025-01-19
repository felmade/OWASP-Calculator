# OWASP Risk Assessment Calculator – URL-Logik

Dieses Dokument beschreibt die URL-Logik, mit der sich unser OWASP Risk Assessment Calculator konfigurieren lässt. Die bisherigen Parameter wie `?riskConfig=...` existieren nicht mehr. Stattdessen zerlegen wir die Konfiguration in einzelne Bausteine:

1. **Likelihood-Konfiguration** (`likelihoodConfig`)
2. **Impact-Konfiguration** (`impactConfig`)
3. **Mapping** (`mapping`)
4. **Vector** (optional) (`vector`)

Auf diese Weise können Sie **flexiblere** Riskomatrixen (n×m) erstellen und zugleich die Eingabewerte (16 Faktoren) vorgeben.

---

## Aufbau & Struktur der Parameter

### 1) Likelihood-Konfiguration: `likelihoodConfig`
- Format: `LEVEL:MIN-MAX;LEVEL2:MIN2-MAX2;...`
- Beispiel (3-Level): likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9

- **LOW**: 0 ≤ Wert < 3  
- **MEDIUM**: 3 ≤ Wert < 6  
- **HIGH**: 6 ≤ Wert ≤ 9  

Sie können beliebig viele Level definieren; zum Beispiel für eine 5-stufige Skala:
likelihoodConfig=LOW:0-2;MEDIUM:2-4;HIGH:4-6;VERY_HIGH:6-8;EXTREME:8-9

**Hinweis:** Bitte achten Sie auf korrekte Schreibweise (keine Leerzeichen außer um `:` oder `-`):


### 2) Impact-Konfiguration: `impactConfig`
- Format identisch zu `likelihoodConfig`
- Beispiel (ebenso 3-Level): impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9

- **NOTE**: 0 ≤ Wert < 3  
- **LOW**: 3 ≤ Wert < 6  
- **HIGH**: 6 ≤ Wert ≤ 9  

### 3) Mapping: `mapping`
- Beschreibt die **Matrix** (n×m) aus den definierten Likelihood- und Impact-Levels.
- Die Anzahl der Einträge muss **genau** `n×m` sein.
- **n**: Anzahl definierter Likelihood-Level
- **m**: Anzahl definierter Impact-Level
- Format: Kommagetrennte Liste (`,`) in der **exakten Reihenfolge** der Zeilen.

Beispiel:  
- Likelihood-Level = `[LOW, MEDIUM, HIGH]` (also 3 Stück)  
- Impact-Level = `[NOTE, LOW, HIGH]` (also 3 Stück)  
- => 3×3 = 9 Einträge: mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9

Die Zuordnung lautet hierbei (in pseudocode, Zeile für Likelihood, Spalte für Impact):

|     | NOTE | LOW  | HIGH |
|-----|------|------|------|
| LOW    | Val1 | Val2 | Val3 |
| MEDIUM | Val4 | Val5 | Val6 |
| HIGH   | Val7 | Val8 | Val9 |

**Achtung**: Die Reihenfolge der Einträge in `mapping` **muss** exakt zu den sortierten Levels passen, die das Skript verwendet (siehe unten: Sortierung nach `minVal`).

### 4) Vector: `vector` (optional)
- Legt die **16 Eingabefaktoren** fest, z. B. `(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)`.
- Format: (key:val/key:val/key:val/...)

- **key** muss einer der 16 bekannten Faktoren sein (`sl, m, o, s, ed, ee, a, id, lc, li, lav, lac, fd, rd, nc, pv`).
- **val** ist eine Zahl 0..9.
- Beachten Sie Groß-/Kleinschreibung: das Skript erwartet kleingeschriebene Keys oder es wandelt sie evtl. entsprechend um.
- Bei falschen Keys oder Werten > 9 gibt es eine **Fehlermeldung**.

---

## Vollständiges URL-Beispiel

Angenommen, Sie möchten:
- 3-Likelihood-Level: `LOW, MEDIUM, HIGH`
- 3-Impact-Level: `NOTE, LOW, HIGH`
- 9 Einträge im Mapping
- Vordefinierte Faktoren

Dann könnte Ihr URL-Aufruf so aussehen: ?likelihoodConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9 &impactConfig=NOTE:0-3;LOW:3-6;HIGH:6-9 &mapping=Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9 &vector=(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:0/lc:9/li:0/lav:0/lac:2/fd:5/rd:5/nc:0/pv:1)


1. **likelihoodConfig** = `LOW:0-3;MEDIUM:3-6;HIGH:6-9`
2. **impactConfig** = `NOTE:0-3;LOW:3-6;HIGH:6-9`
3. **mapping** = `Val1,Val2,Val3,Val4,Val5,Val6,Val7,Val8,Val9`
   - **n=3** (LOW, MEDIUM, HIGH)  
   - **m=3** (NOTE, LOW, HIGH)  
   - => 3×3 = 9 Werte
4. **vector** = `(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:0/lc:9/li:0/lav:0/lac:2/fd:5/rd:5/nc:0/pv:1)`

### Ablauf im Skript

1. Das Skript **parsed** `likelihoodConfig` und baut ein Objekt, z. B. `{LOW:[0,3],MEDIUM:[3,6],HIGH:[6,9]}`.
2. Das Skript **parsed** `impactConfig` und baut ebenfalls ein Objekt, z. B. `{NOTE:[0,3],LOW:[3,6],HIGH:[6,9]}`.
3. **Mapping** wird zu einer Matrix gemapped:  
   - `LOW-NOTE` => Val1  
   - `LOW-LOW` => Val2  
   - `LOW-HIGH` => Val3  
   - `MEDIUM-NOTE` => Val4  
   - ...  
   - `HIGH-HIGH` => Val9
4. Falls `vector` vorhanden ist, wird es ausgewertet und die Eingabefelder (z. B. `sl`, `m`, `o`) werden direkt befüllt.
5. Daraus werden:
   - **LS** (Durchschnitt)  
   - **IS** (Maximum)
6. **Likelihood-Klasse** (z. B. LOW) und **Impact-Klasse** (z. B. HIGH) werden bestimmt, woraus sich per `mappingObj` das finale Risiko (z. B. Val3) ergibt.

---

## Fehlerfälle

- **Fehlende Parameter**  
  Wenn `likelihoodConfig`, `impactConfig` oder `mapping` fehlt, zeigt das Skript eine **Warnung** an und fällt ggf. auf eine Standardkonfiguration zurück.
- **Falsches Format**  
  - Bei `likelihoodConfig=LOW:0-ABC;HIGH:2-9` wird `ABC` als ungültig erkannt => Fehlermeldung.  
  - Bei `mapping` mit zu wenig oder zu vielen Einträgen => Fehlermeldung.
- **Unbekannte Keys** im `vector` => Wird ignoriert oder es erfolgt eine Warnung in der Konsole.
- **Werte > 9** im `vector` => Error.

---

## Weitere Beispiele

### A) 2×2 Matrix 
?likelihoodConfig=LOW:0-2;HIGH:2-9 &impactConfig=MINOR:0-5;MAJOR:5-9 &mapping=Val1,Val2,Val3,Val4 &vector=(sl:1/m:2/o:0/s:5/ed:1/ee:1/a:3/id:2/lc:4/li:0/lav:0/lac:1/fd:2/rd:2/nc:0/pv:0)

- Likelihood-Level: `LOW, HIGH`  
- Impact-Level: `MINOR, MAJOR`  
- mapping =>  
  - LOW-MINOR => Val1  
  - LOW-MAJOR => Val2  
  - HIGH-MINOR => Val3  
  - HIGH-MAJOR => Val4  

### B) 4×3 Matrix  
?likelihoodConfig=L0:0-2;L1:2-4;L2:4-6;L3:6-9 &impactConfig=I0:0-3;I1:3-6;I2:6-9 &mapping=U1,U2,U3,U4,U5,U6,U7,U8,U9,U10,U11,U12 &vector=(sl:0/m:0/o:0/s:9/ed:1/ee:5/a:1/id:1/lc:3/li:5/lav:2/lac:8/fd:3/rd:2/nc:0/pv:0)

- Likelihood = 4 Level (`L0, L1, L2, L3`)
- Impact = 3 Level (`I0, I1, I2`)
- => 4×3 = 12 Einträge in `mapping`
- Der Rest analog.

---

## Zusammenfassung

1. Verwenden Sie **vier** Parameter: `likelihoodConfig`, `impactConfig`, `mapping`, `vector`.
2. *Alle* sind Pflicht (außer `vector`, das optional ist).  
3. Je nach Größe (Anzahl Level) von `likelihoodConfig` und `impactConfig` wird die **Anzahl** der benötigten Einträge in `mapping` bestimmt (`n × m`).
4. `vector` darf beliebig weggelassen werden. Dann bleiben die Eingabefelder leer bzw. Standard `0`.
5. Das Skript erstellt die **Berechnung** (LS & IS) und das **finale Risiko** mithilfe der `mapping`-Matrix.  
6. **Radar-Chart** und **Ausgabetexte** werden automatisch aktualisiert.

Mit dieser **URL-Logik** können Sie komplexe n×m-Matrizen definieren und dazu passende Vektoren (16 Faktoren) direkt einbinden – flexibler und klarer als mit dem alten `riskConfig`-Ansatz.




