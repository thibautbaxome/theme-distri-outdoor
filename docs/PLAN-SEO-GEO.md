# Plan SEO / GEO — couche contenu

> Feuille de route pour la profondeur de contenu (au-delà de la couche « meta » déjà déployée).
> SEO = référencement classique. GEO = Generative Engine Optimization (ChatGPT, Perplexity, Google AI Overviews).
> Dernière mise à jour : 2026-06-28.

## Principe directeur
On donne aux moteurs (classiques **et** génératifs) des blocs **factuels, structurés, attribuables** (schema.org) et **cohérents** (entité claire, prudence « Fabriqué en France »). Les IA citent ce qu'elles peuvent extraire et vérifier facilement : FAQ, specs, définitions, comparatifs.

## ✅ État de réalisation (2026-06-28)

**Couche meta (déployée, additif — champs qui étaient vides) :**
- 45 meta descriptions produit (= `short_description`) · 9 meta descriptions collection.
- JSON-LD : Organization enrichi (adresse Vienne, contact, areaServed FR, **sameAs Facebook + Instagram**), structured_data produit (Shopify), breadcrumbs, WebSite+SearchAction, FAQPage, OG/Twitter.

**Chantier 1 — FAQ produit : ✅ FAIT.** Métachamp `custom.faq` (JSON) sur **les 45 produits** + accordéons visibles (bloc `liquid` dans `product.json`) + **JSON-LD FAQPage** (`snippets/microdata-schema.liquid`).

**Chantier 2 — Collections : ✅ FAIT.** 9 **descriptions visibles** (bannière) + métachamp collection `custom.faq` (6 collections) + section `sections/collection-faq.liquid` (dans `collection.json`) + FAQPage collection. ⚠️ *Les descriptions visibles de collection étaient vides → ajout additif ; à confirmer « garder/vider ».*

**Wave 2 meta : ✅ FAIT** — `alt` des 44 images en avant (étaient vides) ; suffixe `– Distri-Outdoor` dans les `<title>` (`layout/theme.liquid`) ; sameAs FB/IG. **Marque dans le `structured_data` : ✅ réglé le 2026-06-29** en migrant `vendor` vers la vraie marque (BRAZIR/ChefBBQ/Mességué/Qista/LMC/Comme Avant) et en supprimant le métachamp `custom.marque` (le bloc Caractéristiques lit `product.vendor`).

**Chantier 3 — Réécriture des descriptions : ❌ ANNULÉ.** Incident : 12 corps de fiches phares avaient été réécrits en prod par malentendu (« go » compris pour les corps au lieu des meta). **Tout a été restauré à l'identique** depuis le texte capturé en début de session. **Règle actée : on ne touche plus aux corps de fiche produit** (meta uniquement). Les 33 autres n'avaient pas été touchées.

**Chantier 4 — Blog : ✅ FAIT.** 3 guides publiés dans le blog « Infos » (additif), avec maillage interne vers les collections + schéma Article (Shopify) :
- `quel-brasero-choisir` — « Quel brasero choisir ? Le guide complet »
- `corten-ou-thermolaque-brasero` — « Acier corten ou thermolaqué… »
- `borne-anti-moustique-comment-ca-marche` — « Borne anti-moustique : comment ça marche… »

**Reste possible (non lancé) :** alt sur les images secondaires (au-delà de l'image en avant), `seo.title` data-level par produit, plus d'articles de blog, lien du blog dans le menu/footer.

---

### Détail initial du plan (conservé pour référence)

---

## Chantier 1 — FAQ par produit  ⭐ (levier GEO #1)
**Objectif** : Q/R par produit, visibles + `FAQPage` JSON-LD → cités par les IA, rich results Google.
**Architecture**
- Métachamp `custom.faq` (type `json`, liste `[{ "q": "...", "a": "..." }]`).
- 1 bloc `liquid` dans `main-product` : (a) rend des accordéons ISO-DA, (b) émet `<script type="application/ld+json">` FAQPage. Conditionnel (rien si vide).
**Contenu scalable** — 5 modèles par typologie, adaptés par produit :
- Braseros : quelle taille (nb convives), corten (patine voulue ≠ défaut), formes, accessoires compatibles, entretien, poids/livraison, grille incluse.
- Kamados : céramique, plage de températures, pizza/fumage, coloris, nb de personnes.
- Anti-moustiques : zone couverte, principe CO₂/écologie, entretien (leurre + recharge), sécurité abeilles/animaux.
- Accessoires : compatibilité (640/840/1040), matière, entretien.
- Jardinières : tailles, corten vs thermolaqué, drainage/soucoupe.
**Effort** : déf métachamp + bloc liquid (une fois) + peuplement 45 (≈ 1 lot via modèles).
**Prod-safety** : métachamp additif + bloc theme-level. OK.

## Chantier 2 — Contenu + FAQ collections
**Objectif** : pages catégorie qui rankent + contexte pour les IA.
**Architecture / contenu**
- Remplir la **description visible** (`descriptionHtml`) des ~9 collections → s'affiche dans la bannière (`show_description` déjà ON). Intro catégorie, mots-clés, made-in-France prudent.
- Métachamps collection `custom.seo_intro` (richtext) + `custom.faq` (json) → 1 **section custom en bas de `collection.json`** qui les rend (texte SEO + FAQ catégorie + schéma). Per-collection, sans prolifération de templates.
**Effort** : 9 descriptions + section (une fois) + peuplement collections phares.
**Prod-safety** : descriptions = écriture store additive ; section = theme-level. OK.

## Chantier 3 — Nettoyage / structuration des descriptions produit
**Constat** : correctes mais emojis à outrance, pas de structure sémantique (H2/H3), coquilles réelles (« élégancepour », « duo été éerein »…).
**Action** : corriger les coquilles, garder 1-2 emojis max, structurer (accroche courte → sous-titres → specs). On garde le fond et les arguments.
**Effort** : ~45 fiches, par lots de catégorie. Le plus chronophage.
**Prod-safety** : contenu prod partagé → **validation par lot** recommandée (ou go global). Prioriser 12-15 produits phares d'abord.

## Chantier 4 — Guides d'achat (blog) — autorité & GEO long-tail
**Objectif** : capter les requêtes « comment choisir », nourrir les IA, mailler vers collections/produits.
**Architecture** : blog Shopify + articles (schema Article), maillage interne.
**Sujets** : « Quel brasero choisir ? », « Corten ou thermolaqué ? », « Kamado : guide du débutant », « Borne anti-moustique : comment ça marche ? », « Entretenir un brasero en acier corten ».
**Effort** : rédaction longue (800-1500 mots/article). 1 article = 1 lot.

## Wave 2 « meta » (rapide, en parallèle)
- `alt` des images produit/collection (= titre) — écritures média.
- `seo.title` optimisés (« Brasero modulable fabriqué en France | Distri-Outdoor ») — 45.
- `sameAs` réseaux sociaux dans l'Organization (URLs à fournir).
- Marque réelle (BRAZIR/ChefBBQ/Qista) dans le structured_data produit (aujourd'hui vendor = « DISTRI-OUTDOOR »).

## Séquencement recommandé
1. **Chantier 1** (FAQ produit) — meilleur ROI GEO, archi réutilisable.
2. **Chantier 2** (collections) — pages catégorie.
3. **Wave 2 meta** (rapide, en parallèle).
4. **Chantier 3** (descriptions) — par lots, phares d'abord.
5. **Chantier 4** (guides) — au fil de l'eau.

## Décisions qui te reviennent (avant lancement)
- Ton : tutoiement / vouvoiement dans les FAQ et guides.
- Descriptions : go global ou validation par lot ? phares d'abord ?
- Blog : on active le blog Shopify ? combien d'articles au lancement ?
- `sameAs` : URLs des réseaux sociaux Distri-Outdoor.
