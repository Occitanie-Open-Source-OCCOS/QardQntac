# Business Card Analyzer — Design Spec

**Date:** 2026-05-29  
**Project:** kardqntact  
**Status:** Approved

---

## 1. Overview

Feature permettant à un utilisateur authentifié de scanner des cartes de visite via un wizard mobile-first guidé en 3 étapes. L'image est traitée par un modèle Ollama local (vision), les données extraites sont stockées en DB, puis exportables en vCard ou synchronisables vers un serveur Radicale (CardDAV) configuré par l'utilisateur.

---

## 2. Architecture

### Route principale

`/app` (existante, retourne "ok") → remplacée par `ScannerWizard`.

Pas de nouvelles routes — tout sur `/app`.

### Feature directory

```
src/features/app/scanner/
  components/
    scanner-wizard.tsx       # Orchestrateur wizard + état steps
    steps/
      capture-step.tsx       # Step 1 : capture / upload image
      processing-step.tsx    # Step 2 : spinner pendant analyse
      review-step.tsx        # Step 3 : formulaire éditable
    contacts-drawer.tsx      # Drawer liste contacts + config CardDAV
    contact-item.tsx         # Ligne contact dans le drawer
    carddav-config-form.tsx  # Formulaire config Radicale
  actions/
    analyze-card.action.ts   # base64 → Ollama → ContactData
    save-contact.action.ts   # insert contact en DB
    list-contacts.action.ts  # query contacts de l'utilisateur
    delete-contact.action.ts # suppression par id
    sync-contact.action.ts   # générer vCard + PUT vers Radicale
    save-carddav.action.ts   # upsert user_carddav_config
  translations/
    fr.json
    en.json
```

### Libs existantes réutilisées

| Fichier | Usage |
|---|---|
| `src/lib/ollama.ts` | `parseCardImage(base64)` → ContactData |
| `src/lib/vcf.ts` | `generateVCard()`, `downloadVCard()` |
| `src/lib/carddav.ts` | `discoverBooks()`, `saveContact()` |
| `src/lib/actions.ts` | `authentificatedAction` pour toutes les actions |

### Fichier manquant à créer

`src/lib/types.ts` — types partagés entre les libs :

```typescript
export interface ContactData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export function emptyContact(): ContactData {
  return { name: "", title: "", company: "", email: "", phone: "", website: "", address: "" };
}

export interface AddressBook {
  href: string;
  name: string;
}
```

---

## 3. Data Model

### Table `contacts` (`db/schemas/contacts.ts`)

```
id          serial       PK
userId      text         FK → better-auth user (not null)
name        text
title       text
company     text
email       text
phone       text
website     text
address     text
imageUrl    text         path /uploads/... (nullable)
syncedAt    timestamp    nullable — dernière sync Radicale réussie
createdAt   timestamp    default now()
updatedAt   timestamp    default now()
```

### Table `user_carddav_config` (`db/schemas/contacts.ts`)

```
userId      text         PK, FK → better-auth user
url         text         URL base du serveur CardDAV
username    text
password    text         plaintext (usage interne/self-hosted)
createdAt   timestamp    default now()
updatedAt   timestamp    default now()
```

---

## 4. Environment Variables

Ollama est infra globale — env vars serveur :

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llava
```

À ajouter dans `env.ts` (server schema) et `.env.example`.

CardDAV est par utilisateur — stocké en DB, pas d'env var.

---

## 5. PWA

L'app est destinée à fonctionner en mode PWA. Points d'attention :

- **HTTPS requis** pour `getUserMedia` en production (caméra bloquée en HTTP sauf `localhost`)
- **`app/manifest.ts`** (existant) : vérifier que les permissions caméra ne nécessitent pas de déclaration explicite (sur iOS/Android la permission est gérée par le navigateur, pas le manifest)
- **`next.config.ts`** : ajouter les headers `Permissions-Policy: camera=()` si nécessaire (à valider en prod)
- Fallback garanti : si caméra refusée, galerie reste toujours disponible — l'app reste utilisable

---

## 6. UX Flow

### Wizard 3 steps (état React local dans `ScannerWizard`)

**Step 1 — Capture**
- Au montage du composant : demande de permission caméra via `navigator.mediaDevices.getUserMedia({ video: true })` — stockée en état React (`granted | denied | pending`)
- Si `granted` : bouton `📷 Caméra` actif (input `accept="image/*" capture="environment"`) + bouton `🖼 Galerie`
- Si `denied` : bouton caméra désactivé + message "Autorisez la caméra dans les paramètres de votre navigateur", bouton galerie toujours disponible
- Si `pending` : bouton caméra affiche "Autoriser la caméra…" — déclenche la demande au clic
- Preview de l'image choisie (miniature)
- Bouton `Analyser →` actif dès qu'une image est sélectionnée

**Step 2 — Processing**
- Upload image vers `/api/uploads` (existant)
- Appel `analyzeCard` (server action) avec base64 de l'image
- Spinner avec message "Analyse en cours…"
- Pas d'interaction utilisateur — transition automatique vers step 3 ou erreur

**Step 3 — Review**
- Miniature de l'image en haut
- Formulaire éditable : Nom, Poste, Société, Email, Téléphone, Site web, Adresse
- Bouton `Sauvegarder ✓` → appel `saveContact` → reset step 1
- Bouton `← Recommencer` → reset step 1 sans sauvegarder

**Gestion d'erreur step 2**
- Si Ollama indisponible ou modèle absent → message d'erreur + bouton retour step 1

### Drawer contacts (FAB haut à droite sur toutes les steps)

- Ouverture via Sheet (vaul, déjà installé)
- En-tête : titre "Mes contacts" + badge count
- Liste scrollable : avatar initiales + nom + société + date
- Actions par contact (inline) : `⬇ vCard` | `↑ Radicale` | `🗑`
- Bas du drawer : `⚙ Configurer Radicale` (toggle form url/username/password)
- Si CardDAV non configuré → badge warning orange sur le FAB et boutons sync désactivés

---

## 7. Server Actions

Toutes via `authentificatedAction` (injecte `ctx.userId`).

| Action | Input | Output |
|---|---|---|
| `analyzeCard` | `{ imageBase64: string }` | `ContactData` |
| `saveContact` | `ContactData & { imageUrl?: string }` | `{ id: number }` |
| `listContacts` | — | `Contact[]` |
| `deleteContact` | `{ id: number }` | — |
| `syncContact` | `{ id: number }` | — |
| `saveCarddavConfig` | `{ url, username, password }` | — |

`syncContact` :
1. Charge le contact + `user_carddav_config` du user
2. Si config absente → throw "CardDAV non configuré"
3. Génère vCard via `generateVCard()`
4. Appelle une version modifiée de `saveContact()` avec credentials en paramètre (pas depuis env) : `saveContact(vcardString, bookHref, { url, username, password })`
5. Met à jour `syncedAt` sur le contact

---

## 8. Error Handling

- Ollama down → step 2 affiche erreur + retour step 1
- Ollama retourne champs vides → step 3 s'affiche avec champs vides (utilisateur remplit manuellement)
- CardDAV non configuré → boutons sync désactivés avec tooltip explicatif
- CardDAV PUT échoue → toast erreur, `syncedAt` non mis à jour

---

## 9. Out of Scope

- Édition d'un contact déjà sauvegardé (pas de page de détail)
- Recherche / filtre dans la liste contacts
- Sync bidirectionnelle (pas de pull depuis Radicale)
- Sélection du carnet d'adresses Radicale (`discoverBooks()` non utilisé — push vers URL directe)
- Chiffrement du mot de passe CardDAV en DB
