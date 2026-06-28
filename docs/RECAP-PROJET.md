# Distri-Outdoor — Récap projet (refonte thème Shopify)

> Document de suivi « grandes lignes », mis à jour au fil du projet pour servir de base au doc de restitution final.
> Dernière mise à jour : 2026-06-28.

## Contexte
- Boutique **Distri-Outdoor** (distri-outdoor.fr) — spécialiste de l'extérieur : braseros-planchas, kamados, bornes anti-moustiques, mobilier de jardin.
- Thème Shopify **Maestrooo « Stretch »**, branché en **preview via l'intégration GitHub** (`origin/main` → thème preview). **Un thème prod tourne en parallèle** : ne jamais l'impacter.
- Objectif global : déployer une direction artistique, refondre le front (home / collection / produit), nettoyer le back-office, structurer la navigation et les pages, poser les bases SEO/GEO.

## 1. Direction artistique
- Palette **« Feu & Acier »** (⚠️ codename interne, jamais public) : Sable, Cream, Charbon, Corten, Braise (CTA), Corten-clair → **7 color schemes**.
- Typo : **Fraunces** (titres) + **Inter** (corps) via le font_picker Shopify ; **JetBrains Mono** (eyebrows) hébergée sur le CDN Shopify Files (pas dans les assets).
- **Logos** (SVG autonomes) + **favicon** sur le CDN.
- **Boutons ISO-DA** via les fichiers du thème (filet gris chaud → corten au survol), sans couche d'override.
- **2 paramètres custom** ajoutés proprement : `subheading_custom_font`, `heading_display_font_weight`.
- **Repasse UI** : poids des titres display passé de 900 → **600** (plus élégant, fin du faux-gras sur Fraunces n6) ; tailles de titres de section affinées.

## 2. Back-office / données
- **Standardisation** : types produits, options, valeurs couleur (Black → **Noir**, **Corten** ; re-link aux métaobjets `shopify.color-pattern`). Backup conservé (`backups/`).
- **Métachamps produit** créés + remplis (namespace `custom`) : `marque`, `matiere`, `fabrique_en_france`, `garantie`, **`short_description`** (45 produits).
- **Cross-sell** : `complementary_products` rempli sur les 5 braseros modulables (→ grille, housse, four à pizza, gants).
- **Made-in-France** : recherche en ligne + **prudence distributeur** → `fabrique_en_france` + garantie 5 ans uniquement sur les braseros BRAZIR confirmés.

## 3. Front / templates
- **Homepage** : hero slideshow (correction d'un bug d'ancres `<a>` imbriquées qui masquait l'image), « Nos univers » (collection-list), **carrousels séparés Braseros / Accessoires** (rangée unique, plus de mélange), concept, modularité, **FAQ**, newsletter. Placeholders EN nettoyés.
- **Collection** : bannière image + titre display, grille 4 colonnes, facettes en sidebar, tri, swatches couleur.
- **Produit** (un seul `product.json`) : galerie + miniatures + zoom, variantes (swatch couleur Corten/Noir), CTA braise + sticky add-to-cart + Shop Pay, **badges FR/garantie conditionnels** (via métachamps, masqués si non éligible), **specs auto** (Marque/Matière/Garantie), accordéon Livraison, cross-sell « Complétez votre installation », produits liés.

## 4. Navigation & pages
- **Méga-menu** : nouveau menu `main-menu-v2` (prod intacte), Boutique ▸ colonnes (Braseros/Kamados/Anti-moustiques/Mobilier) + **promos produits** ; lien « Accueil » retiré (logo = accueil).
- **Footer** : barre de réassurance FR, 2 colonnes (Boutique / Informations via `footer-boutique` + `footer-infos`), bloc À propos, newsletter FR.
- **Pages** : **Contact** (intro + formulaire FR), **FAQ** (page créée + contenu FR prudent), **Location** (contenu récupéré de la prod live → template thème : hero + 3 colonnes infos + CTA, formulaire à ajouter côté client).

## 5. SEO / GEO
- **Audit** : meta descriptions et `seo.title` vides sur 100 % des produits, `alt` images vides, meta descriptions collections vides, JSON-LD Organization maigre. Bases OK : structured_data produit (Shopify), breadcrumbs, WebSite+SearchAction, **FAQPage** déjà émis, OG/Twitter complets.
- **Couche meta déployée** : 45 meta descriptions produit (= `short_description`), 9 meta descriptions collection, JSON-LD Organization enrichi (description, contactPoint, areaServed FR, adresse Vienne 38200, **sameAs FB/Instagram**), `alt` des 44 images en avant, suffixe `– Distri-Outdoor` dans les `<title>`.
- **FAQ (GEO #1)** : métachamp `custom.faq` (JSON) sur **les 45 produits** + **6 collections**, rendus en accordéons + **JSON-LD FAQPage** (produit et collection).
- **Collections** : 9 descriptions visibles (bannière) + section `collection-faq`.
- **Blog** : 3 guides publiés (quel brasero choisir, corten vs thermolaqué, borne anti-moustique) avec maillage interne + schéma Article.
- **⚠️ Incident & règle** : 12 corps de fiches produit réécrits par malentendu, puis **restaurés à l'identique**. Règle actée : **on ne touche plus aux corps de fiche produit** (meta uniquement).
- **Non fait** : marque réelle dans le `structured_data` produit (dépend de `product.vendor`, décision client) ; `alt` des images secondaires ; `seo.title` data-level.
- Architecture FAQ détaillée : voir [docs/PLAN-SEO-GEO.md](PLAN-SEO-GEO.md).

## Règles & garde-fous (transverses)
- **Respecter le thème** : pas d'override, pas de variable CSS dupliquée — on configure les réglages natifs, on étend proprement si besoin.
- **Prod-safety** : menus / pages / contenu produit = **données store-level partagées** avec la prod → on **crée du nouveau** (menus, pages) et on **repointe ce thème** ; on n'édite pas les objets partagés. Les écritures BO additives (métachamps, meta descriptions vides) sont OK.
- **« Feu & Acier »** = codename interne, jamais visible côté client.
- **Prudence « Fabriqué en France »** : distributeur → ne revendiquer que ce qui est confirmé.

## Git / déploiement
- **Une seule branche : `main`** (pas de `feat/*`). Commits fréquents.
- `origin/main` → thème **preview** via l'intégration GitHub (le push déploie sur la preview, pas sur la prod).

## Reste à faire / pistes
- Confirmer : garder ou vider les descriptions visibles de collection (ajout additif).
- Marque réelle dans le `structured_data` produit (décision sur `product.vendor`).
- `alt` des images secondaires, `seo.title` data-level, plus d'articles de blog, lien blog dans le menu/footer.
- Page Location : intégration du formulaire (côté client).
- QA finale transverse (mobile, panier, recherche, 404) — déjà passée une première fois.
- Config front des sections (en cours côté client via l'éditeur Shopify).
- **Push** des commits thème en attente vers `origin/main` (rendus FAQ, sections, schémas, titres).
