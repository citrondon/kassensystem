# Mon Comptoir — Produkt-Website Plan

## Kurzbeschreibung
Eine französische One-Page-Produktwebsite für **Mon Comptoir**, ein einfaches POS- und Ladenmanagement-System für kleine Geschäfte, Cafés, Bars und Einzelhändler in Kamerun und Frankafrika.

## Design-Richtung (entschieden)

- **Stil:** warm-professionell, minimalistisch, vertrauenswürdig
- **Vibe:** „modernes afrikanisches Kassenbuch“ — keine Tech-Gradienten, keine Spielzeug-Farben
- **Referenzen:** Stripe (klare Hierarchie) + Notion (warme Freundlichkeit) + Framer (subtile Motion)
- **Farben:**
  - Background: `#FDFBF7` (warmes Off-White)
  - Surface: `#FFFFFF`
  - Text: `#1C1917` (warmes Schwarz)
  - Muted: `#78716C`
  - Border: `#E7E5E4`
  - Primary Accent: `#C2410C` (Terrakotta / Deep Orange)
  - Secondary Accent: `#0F766E` (warmes Teal)
- **Typografie:**
  - Headlines: `Playfair Display` (serif, edel, freundlich)
  - Body/UI: `Inter` (klar, lesbar)
- **Formen:** sanfte Radien (`radius: 12–16px`), keine harte Glassmorphism
- **Motion:** dezente Scroll-Reveals, sanfte Hover-States, keine Theater-Animationen

## Struktur (Single Scroll Page)

### 1. Hero Section
- Titel: „Gérez votre boutique en toute simplicité.“
- Subline: kurze Erklärung, was Mon Comptoir ist (POS + Inventar + Analytics)
- CTA-Buttons: „Découvrir Mon Comptoir“ + „Voir la démo“
- Visual: abstrakte UI-Mockup/Illustration oder einfaches Kassen-Interface-Screenshot

### 2. Le Problème / Pourquoi Mon Comptoir
- 3 Pain Points kleiner Ladenbesitzer:
  - Chaos bei Bargeld- und Verkaufsverfolgung
  - Kein Überblick über Bestand und Verkaufszahlen
  - Schwierigkeiten bei Mehrfilialen-Kontrolle

### 3. Pour qui ?
- Zielgruppen-Cards:
  - Boutiques / Épicerie
  - Cafés / Bars
  - Restaurants / Street Food
  - Petits commerçants

### 4. Fonctionnalités
- Feature-Grid (6–8 Features):
  - Caisse rapide et intuitive
  - Gestion des produits et stocks
  - Suivi des ventes en temps réel
  - Multi-boutiques / Analytics
  - Mode hors-ligne
  - Gestion des utilisateurs (caissiers, manager, développeur)
  - Licences flexibles
  - Dark / Light Mode

### 5. Avantages
- 4 Benefit-Cards:
  - Gain de temps
  - Meilleure visibilité
  - Sécurité des données
  - Évolutivité

### 6. Comment ça marche
- 3 Schritte:
  1. Activer la licence
  2. Configurer votre boutique
  3. Commencer à vendre

### 7. Témoignages (optional, kann als Platzhalter)
- 2–3 kurze Testimonials (markiert als Beispieltext, falls keine echten vorhanden)

### 8. Pricing / Plans (optional)
- 3 Plans: Trial / Basic / Pro
- Preise in FCFA oder als „Sur demande“
- Hinweis: keine Zahlungsanbindung im aktuellen POS, hier nur informativ

### 9. CTA / Footer
- Final CTA: „Prêt à moderniser votre caisse ?“
- Kontakt/Email-Link
- Footer: Mon Comptoir © 2026, kleine Links

## Technischer Ansatz

- **Format:** Einzelne HTML-Datei, self-contained (keine externe Build-Pipeline)
- **Pfad:** `C:\Users\pasca\kassensystem\website\index.html`
- **CSS:** Embedded `<style>`, CSS-Variables, Grid/Flexbox
- **JS:** Embedded `<script>`, nur für Scroll-Reveal und Mobile-Nav
- **Responsive:** Mobile-first, Breakpoints bei 640px und 1024px
- **Bilder:** Keine echten Fotos, abstrakte SVG-Illustrationen oder CSS-only Visuals

## Offene Entscheidungen (für später)

1. Soll es eine echte Domain/Hosting geben, oder nur lokal als Artefakt?
2. Sollen echte Screenshots aus dem POS eingebaut werden?
3. Sollen Testimonials echt oder Platzhalter sein?
4. Soll es eine Newsletter/Contact-Form geben?

## Nächster Schritt

Wenn der Plan passt: Baue die `index.html` im gewählten Stil mit echtem französischem Copy.
