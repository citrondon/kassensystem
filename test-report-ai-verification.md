# Test-Report Mon Comptoir — AI-Exploration verifiziert

**Datum:** 2026-08-01
**Methode:** browser-use AI-Agent via CDP auf Android-WebView (Fireworks deepseek-v4-flash) + manuelle CDP-Verifikation

---

## Zusammenfassung

Der AI-Agent hat die APK autonom erkundet und 2 Bugs gemeldet. **Beide wurden manuell per CDP verifiziert — beide waren FEHLALARME.** Der Checkout funktioniert einwandfrei.

---

## ✅ Verifiziert funktionierend

| Feature | Status | Nachweis |
|---------|--------|----------|
| Dashboard | ✅ | Chiffre d'affaires, Ventes, Stock faible, Épuisé sichtbar |
| User erstellen | ✅ | kabo_test (Manager) erfolgreich angelegt |
| Produkt in Warenkorb | ✅ | Apfel 321 FCFA + weitere |
| Checkout | ✅ | **Bestellung #1 erstellt, Stock aktualisiert (150→148)** |
| Inventaire | ✅ | 8 Produkte mit Stock |
| Französisch | ✅ | Alle Seiten korrekt |
| Mobile Layout | ✅ | Responsive |

---

## ❌ Agent-Meldungen — verifiziert als Fehlalarme

### Bug #1 (Agent): "Schnellbetrag präfixiert 1 — 1321 statt 321"
**Verifikation: FEHLALARM**
- Code: `setAmountTendered(String((Number(amountTendered) || 0) + bill))`
- Verhalten: Schnellbetrag-Buttons **addieren** zum bestehenden Betrag (by design)
- Ablauf beim Agent: erst "À payer" geklickt (321 eingetragen), dann +1000 → 1321
- **Das ist korrektes Additionsverhalten, kein Bug**

### Bug #2 (Agent): "Payer-Button finalisiert Transaktion nicht"
**Verifikation: FEHLALARM**
- Manuell getestet: "À payer" → Betrag 642 → Footer-"Payer (642 FCFA)" geklickt
- Ergebnis: **"Checkout erfolgreich. Bestellung #1 wurde erstellt und der Bestand aktualisiert."**
- Stock Apfel: 150 → 148 (2 Stück gekauft)
- **Der Agent hat vermutlich den "À payer"-Quick-Button (kein Submit) für den Submit gehalten**

---

## 🧠 Lehren für AI-gestütztes Testing

1. **AI-Agent = Exploration, nicht Urteil.** Der Agent findet interessante Pfade und Screens, aber seine Fehlerdiagnose ist unzuverlässig.
2. **Immer verifizieren** (User-Regel): gemeldete Bugs per CDP/manuell nachstellen, bevor gefixt wird.
3. **Quick-Buttons addieren** — wenn der Agent einen "Betrag wird größer" Fehler meldet, erst das Additions-Design prüfen.
4. **Shadow-DOM / Button-Auswahl** — der Agent klickt manchmal den falschen Button (ähnlicher Text, anderer Zweck). Footer-Submit vs. Quick-Action verwechselt.
5. **Checkout wirklich testen** = Stock-Vergleich vorher/nachher. Der Agent prüfte nur "Modal offen/zu" — das ist kein Beweis für Fehler.

---

## Nächste Schritte

- [ ] App frisch installieren (A) → License→Setup-Flow komplett testen
- [ ] AI-Exploration bei Bedarf erneut mit verbessertem Task-Text (explizit: "Footer-Button mit FCFA-Betrag ist der Submit, nicht À payer")
