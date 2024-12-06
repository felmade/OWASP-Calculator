<div align="center">
  <h1>OWASP Risk Assessment Calculator</h1>

<h4>An online calculator to assess the risk of threats & vulnerabilities based on OWASP Risk Assessment.</h4>

<a align="center" href="https://" target="_blank">Link to ONLINE CALCULATOR</a>

Based on https://github.com/JavierOlmedo/OWASP-Calculator | Modified by <a href="https://github.com/Zylesto" target="_blank"><span>Felix Berger</span></a>

</div>

---

# Risiko-Bewertungs-Tool

Dieses Tool berechnet ein Risikoniveau basierend auf verschiedenen Eingabefaktoren, ordnet diese einem **Likelihood-** (Wahrscheinlichkeits-) und einem **Impact-Level** (Auswirkungsgrad) zu und zeigt das Ergebnis als Radar-Chart an. Die Klassifizierung erfolgt mithilfe konfigurierbarer Schwellenwerte, die an unterschiedliche Konfigurationen gebunden sind.

## Funktionsweise

1. **Eingabefaktoren**  
   Es gibt insgesamt 16 Faktoren, die das Risiko bestimmen. Diese werden in zwei Gruppen unterteilt:
    - **Threat Agent Factors:** (z. B. Skills required, Motive, Opportunity, Population Size, Ease of Discovery, Ease of Exploit, Awareness, Intrusion Detection)
    - **Technical Impact Factors:** (z. B. Loss of Confidentiality, Loss of Integrity, Loss of Availability, Loss of Accountability, Financial Damage, Reputation Damage, Non-Compliance, Privacy Violation)

   Der Nutzer kann diese Werte über Eingabefelder anpassen.

2. **Berechnung von LS und IS**
    - **LS (Likelihood Score):** Wird als Durchschnitt der Threat Agent Factors berechnet.
    - **IS (Impact Score):** Ist der Maximalwert der Technical Impact Factors.

3. **Kategorisierung anhand von Schwellenwerten**  
   Anhand der berechneten Scores (LS und IS) werden Kategorien (LOW, MEDIUM, HIGH, CRITICAL) vergeben. Diese Kategorisierung basiert auf vordefinierten Intervallen, die je nach ausgewählter Konfiguration unterschiedlich sein können.

   **Beispiel für halb-offene Intervalle:**
    - LOW: 0 ≤ Wert < 3
    - MEDIUM: 3 ≤ Wert < 6
    - HIGH: 6 ≤ Wert ≤ 9

   Hier gilt:
    - Ein Wert von **2.5** ist LOW (weil 0 ≤ 2.5 < 3).
    - Ein Wert von **3** ist MEDIUM (weil 3 ≤ 3 < 6).
    - Ein Wert von **8.9** ist HIGH (weil 6 ≤ 8.9 ≤ 9).

   Durch diese halboffenen Intervalle werden Überschneidungen vermieden. Der obere Grenzwert gehört nicht mehr zur vorherigen Kategorie, sondern signalisiert den Übergang zur nächsten.  
   Möchten Sie, dass ein Wert an der Grenze noch zur vorherigen Kategorie zählt, müssten Sie das Intervall anpassen und z. B. inklusive obere Grenzen verwenden. Achten Sie dabei darauf, dass sich die Intervalle nicht überlappen.

4. **Finales Risikoniveau (RS)**  
   Aus den beiden Klassifizierungen (Likelihood und Impact) wird über eine eigene Logik ein finales Risikoniveau bestimmt (z. B. CRITICAL, HIGH, MEDIUM, LOW oder NOTE).

## Darstellung im Radar-Chart

Das Radar-Chart zeigt alle 16 Faktoren auf einen Blick. Die Farbe und Hintergrundfarbe des Charts ändern sich in Abhängigkeit vom finalen Risikoniveau. Dadurch erkennen Sie auf einen Blick die Schwere des Risikos.

## Konfiguration über die URL

Die Risikokonfigurationen und Eingabewerte können über URL-Parameter festgelegt werden. Dies ermöglicht es, voreingestellte Bewertungen direkt per Link aufzurufen.

### URL-Konfiguration laden

Wenn Sie einen Parameter `riskConfig` in der URL übergeben, kann das Skript dynamisch eine "URL Configuration" erstellen. Zum Beispiel: 

?riskConfig=LOW:0-4;MEDIUM:4-7;HIGH:7-9


- Diese Zeichenkette legt folgende Bereiche fest:
    - LOW: von 0 bis <4
    - MEDIUM: von 4 bis <7
    - HIGH: von 7 bis ≤9

Nach dem Laden der Seite mit diesem Parameter wird automatisch "URL Configuration" als Option im Dropdown-Menü hinzugefügt und ausgewählt. Die Berechnung erfolgt dann auf Basis dieser neuen Konfiguration.

### Vektoren übergeben

Über den Parameter `vector` können Sie vordefinierte Werte für die 16 Faktoren laden. Zum Beispiel:

?vector=(sl:1/m:2/o:3/s:4/ed:5/ee:6/a:7/id:8/lc:9/li:10/lav:11/lac:12/fd:13/rd:14/nc:15/pv:16)


Diese Angabe setzt die jeweiligen Input-Felder automatisch auf die angegebenen Werte und führt anschließend die Berechnung durch.

**Hinweis:** Stellen Sie sicher, dass das Format des `vector`-Strings korrekt ist. Ein ungültiges Format führt zu einer Fehlermeldung.

## Beispiel

Angenommen, Sie möchten folgende Konfiguration und Werte laden:

- Neue Konfiguration:  
  LOW: 0-3  
  MEDIUM: 3-6  
  HIGH: 6-9

- Eingabewerte für die Faktoren:
    - Threat Agent (sl,m,o,s,ed,ee,a,id): 1,1,1,1,1,1,1,1
    - Technical Impact (lc,li,lav,lac,fd,rd,nc,pv): 4,4,4,4,1,1,1,1

Rufen Sie die Seite auf mit: 

?riskConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&vector=(sl:1/m:1/o:1/s:1/ed:1/ee:1/a:1/id:1/lc:4/li:4/lav:4/lac:4/fd:1/rd:1/nc:1/pv:1)

Diese Angabe setzt die jeweiligen Input-Felder automatisch auf die angegebenen Werte und führt anschließend die 
Berechnung durch.

**Hinweis:** Stellen Sie sicher, dass das Format des `vector`-Strings korrekt ist. Ein ungültiges Format führt zu einer Fehlermeldung.

## Beispiel

Angenommen, Sie möchten folgende Konfiguration und Werte laden:

?riskConfig=LOW:0-3;MEDIUM:3-6;HIGH:6-9&vector=(sl:1/m:1/o:1/s:1/ed:1/ee:1/a:1/id:1/lc:4/li:4/lav:4/lac:4/fd:1/rd:1/nc:1/pv:1)


Das Skript:
- Lädt die "URL Configuration" mit den angegebenen Grenzen.
- Setzt alle Werte aus dem `vector`.
- Berechnet LS als Durchschnitt der Threat Agent Factors.
- Berechnet IS als Maximalwert der Technical Impact Factors.
- Bestimmt die Kategorien (LOW, MEDIUM, HIGH) für LS und IS.
- Ermittelt daraus das finale Risikoniveau (z. B. LOW, MEDIUM, HIGH, CRITICAL).
- Zeigt das Ergebnis im Radar-Chart und in den Ausgabe-Feldern an.






 

