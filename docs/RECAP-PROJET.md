# Distri-Outdoor — Récap projet (refonte thème Shopify)

> Document de suivi « grandes lignes », mis à jour au fil du projet pour servir de base au doc de restitution final.
> Dernière mise à jour : 2026-06-29.

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
- **Homepage** : hero slideshow (correction d'un bug d'ancres `<a>` imbriquées qui masquait l'image), « Nos univers » (collection-list), **carrousels séparés Braseros / Accessoires** (rangée unique, plus de mélange), concept, modularité, **teaser histoire** (« Une passion devenue métier » → page À propos), **FAQ**, newsletter. Placeholders EN nettoyés.
- **Collection** : bannière image + titre display, grille 4 colonnes, facettes en sidebar, tri, swatches couleur, **section FAQ de collection**.
- **Produit** (un seul `product.json`) : galerie + miniatures + zoom, variantes (swatch couleur Corten/Noir, **options unifiées sans séparateur** : Taille/Couleur/Forme d'un bloc), short description, **badges FR/garantie conditionnels** (via métachamps, masqués si non éligible), accordéons **Description / Caractéristiques (specs auto Marque-via-vendor/Matière/Garantie) / Livraison & retours**, **configurateur de pack** (voir 3bis, remplace le cross-sell + le bouton d'achat), **section FAQ produit dédiée** (pleine largeur, même rendu que les collections), produits liés. *Sticky add-to-cart désactivé (le configurateur porte l'action d'achat).*

### 3bis. Configurateur de pack (fiche produit) — bloc `accessory_bundle`
**But** : ajouter le brasero **+ ses accessoires en un seul clic**. Remplace l'ancien carrousel « produits complémentaires » et le bouton d'achat natif.
- **Source de données** : le métachamp Shopify **Search & Discovery** « produits complémentaires » (`shopify--discovery--product_recommendation.complementary_products`), rempli par le marchand. Les accessoires s'affichent en **carrousel de cartes sélectionnables** (image carrée, marque, titre, prix, badge ✓ + anneau cuivre à la sélection).
- **Choix des options** : cocher un accessoire déplie **ses** sélecteurs (Taille, Forme…). Les accessoires sans option (four, gants) = simple sélection. Total dynamique + sélecteur de quantité (produit principal) + bouton sur la même ligne.
- **Auto-remplissage de la Taille** : à la sélection, la taille de l'accessoire se pré-règle sur celle du brasero (640/840/1040) et **suit** tout changement de variante du brasero. Modifiable. La Forme reste manuelle.
- **Ajout panier** : tout part en une requête via les `items[]` du `<product-form>` natif (ouverture du tiroir native). Le bloc survit aux changements de variante.
- **⚠️ Contrat de données (à transmettre au client)** :
  - *Indispensable* : remplir le métachamp « produits complémentaires » avec les bons accessoires (sinon le bloc n'affiche que le bouton d'achat).
  - *Pour l'auto-taille* : garder l'option nommée **`Taille`** et les **mêmes valeurs** (`640`/`840`/`1040`) entre brasero et accessoires.
  - *Mode d'échec sûr* : si la donnée n'est pas alignée → retour au **choix manuel** de la taille, jamais de mauvaise variante ni de vente fantôme (stock vérifié par Shopify à l'ajout).
- *Choix actés* : quantité par accessoire = 1 (la quantité ne joue que sur le produit principal) ; sticky ATC désactivé.

## 4. Navigation & pages
- **Méga-menu** : nouveau menu `main-menu-v2` (prod intacte) — **Boutique / Location / À propos / Contact** ; lien « Accueil » retiré (logo = accueil).
- **Footer** : barre de réassurance FR, 2 colonnes (Boutique / Informations via `footer-boutique` + `footer-infos`, **À propos** ajouté dans Informations), bloc À propos, **bloc Contact** (tél `06 68 53 54 07` + `contact@distri-outdoor.fr`, repris de la prod), **icônes réseaux Facebook + Instagram** (réglages thème `social_facebook`/`social_instagram` + toggle `show_social_media`), newsletter FR.
- **Barre d'annonce** : activée (fond cuivre, défilement auto), 3 messages — tagline marque · « Une sélection de fabrications françaises » (**reformulé prudemment** : la prod disait « 100 % made in France », inexact pour un distributeur) · livraison France.
- **Pages** :
  - **Contact** (intro + formulaire FR), **FAQ** (page créée + contenu FR prudent), **Location** (contenu récupéré de la prod live → template thème : hero + 3 colonnes infos + CTA, formulaire à ajouter côté client).
  - **À propos** (créée) : histoire de la marque + fondateur (Lionel Dufresnes), valeurs Durabilité/Design/Convivialité, savoir-faire français prudent. Contenu **récupéré du bloc « Qui sommes-nous ? » de la home prod** puis étoffé. Liée dans le menu principal **et** le footer ; teaser sur la home.
- **Décisions « com' » en attente** : formulation « fabrications françaises » (barre d'annonce) ; affichage ou non du nom du fondateur dans le contact footer.

## 5. SEO / GEO
- **Audit** : meta descriptions et `seo.title` vides sur 100 % des produits, `alt` images vides, meta descriptions collections vides, JSON-LD Organization maigre. Bases OK : structured_data produit (Shopify), breadcrumbs, WebSite+SearchAction, **FAQPage** déjà émis, OG/Twitter complets.
- **Couche meta déployée** : 45 meta descriptions produit (= `short_description`), 9 meta descriptions collection, JSON-LD Organization enrichi (description, contactPoint, areaServed FR, adresse Vienne 38200, **sameAs FB/Instagram**), `alt` des 44 images en avant, suffixe `– Distri-Outdoor` dans les `<title>`.
- **FAQ (GEO #1)** : métachamp `custom.faq` (**métaobjets `faq_item`**, éditables proprement par le marchand — pas du JSON brut) sur **les 45 produits** + **6 collections** ; rendu en **sections dédiées** (produit et collection) + **JSON-LD FAQPage**.
- **Collections** : 9 descriptions visibles (bannière) + section `collection-faq`.
- **Blog** : 3 guides publiés (quel brasero choisir, corten vs thermolaqué, borne anti-moustique) avec maillage interne + schéma Article.
- **⚠️ Incident & règle** : 12 corps de fiches produit réécrits par malentendu, puis **restaurés à l'identique**. Règle actée : **on ne touche plus aux corps de fiche produit** (meta uniquement).
- **Marque dans le `structured_data` produit** : ✅ fait — migration de la vraie marque dans le **`vendor` natif** (BRAZIR / ChefBBQ / Mességué / Qista / Laboratoire LMC / Comme Avant) + suppression du métachamp `custom.marque` (le bloc Caractéristiques lit `product.vendor`).
- **Non fait** : `alt` des images secondaires ; `seo.title` data-level.
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
- **Décisions « com' »** : formulation « fabrications françaises » (barre d'annonce) ; nom du fondateur dans le contact footer (oui/non).
- Confirmer : garder ou vider les descriptions visibles de collection (ajout additif).
- `alt` des images secondaires, `seo.title` data-level, plus d'articles de blog, lien blog dans le menu/footer.
- Page Location : intégration du formulaire (côté client).
- **App Shopify Forms** : popup newsletter (bas gauche) géré côté app (Admin → Apps → Forms), pas dans le thème.
- QA finale transverse (mobile, panier, recherche, 404) — déjà passée plusieurs fois (configurateur testé desktop + mobile).
- Config front des sections (en cours côté client via l'éditeur Shopify).
