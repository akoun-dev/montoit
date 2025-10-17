# Décisions Architecturales - Mon Toit

## 1. Vérification d'Identité: Azure Face API vs Smile ID

### Date de décision: 2025-10-05

### Contexte
Le projet Mon Toit nécessite un système de vérification d'identité robuste pour:
- Vérifier l'identité des utilisateurs (ONECI)
- Effectuer la reconnaissance faciale (Face Verification)
- Valider les documents d'identité

Deux options principales ont été évaluées:
1. **Azure Face API** (actuellement implémenté)
2. **Smile ID** (dans le backlog US-1.6)

### État Actuel

#### Azure Face API - Implémentation actuelle
- **Edge Function**: `supabase/functions/face-verification/index.ts`
- **Endpoints utilisés**:
  - `{AZURE_FACE_ENDPOINT}/face/v1.0/detect`
  - `{AZURE_FACE_ENDPOINT}/face/v1.0/verify`
- **Fonctionnalités**:
  - Détection de visage dans images CNI et selfie
  - Score de similarité entre visages
  - Limite de tentatives (3 par jour)
  - Mise à jour du statut de vérification
- **Coûts**: Variable selon utilisation, tarification Azure
- **Performance**: ~2-5 secondes par vérification

#### Points forts Azure Face API
✅ Déjà intégré et fonctionnel
✅ Documentation Microsoft complète
✅ Support global et haute disponibilité
✅ Bonne précision de détection faciale
✅ APIs REST simples à utiliser

#### Points faibles Azure Face API
❌ Coûts potentiellement élevés à l'échelle
❌ Pas de fonctionnalités OCR natives pour CNI
❌ Pas de détection de "liveness" (anti-spoofing)
❌ Dépendance à l'écosystème Microsoft Azure

#### Smile ID - Option alternative
**Fonctionnalités potentielles**:
- Vérification d'identité complète
- OCR de documents (passeports, CNI)
- Détection de liveness
- Biométrie faciale
- Conformité KYC/AML

**Avantages potentiels**:
✅ Spécialisé pour l'Afrique (support CNI ivoiriennes)
✅ Détection de liveness intégrée
✅ OCR natif pour extraction données CNI
✅ Pricing potentiellement plus adapté
✅ API unifiée pour vérification complète

**Inconvénients potentiels**:
❌ Migration requise (coût de développement)
❌ Apprentissage nouvelle API
❌ Risque de dépendance à un fournisseur spécialisé
❌ Documentation possiblement moins complète

### Décision: GARDER AZURE FACE API AVEC AMÉLIORA TIONS

#### Justification
1. **Fonctionnalité actuelle**: Azure Face API fonctionne et répond aux besoins immédiats
2. **Coût de migration**: Le temps de développement pour migrer vers Smile ID serait significatif
3. **Roadmap progressive**: Possibilité d'évaluer Smile ID pour futures fonctionnalités (OCR, liveness)
4. **Approche hybride future**: Garder Azure pour face matching, ajouter Smile ID pour OCR si nécessaire

#### Plan d'Amélioration Azure Face API (Court Terme)

```typescript
// 1. Améliorer la gestion d'erreurs
// 2. Ajouter retry logic avec backoff exponentiel
// 3. Logger métriques de performance
// 4. Améliorer UX avec feedback détaillé
```

**Améliorations prioritaires**:
- ✅ Gestion d'erreurs robuste avec messages utilisateur clairs
- ✅ Retry automatique en cas d'échec réseau
- ✅ Logging détaillé pour debugging
- ✅ Métriques de succès/échec dans admin dashboard

#### Plan d'Évaluation Smile ID (Moyen Terme)

**Phase 1 - POC (Proof of Concept)**:
- Créer compte Smile ID test
- Tester APIs sur documents CI (Côte d'Ivoire)
- Comparer performances et coûts
- Évaluer qualité OCR et liveness detection

**Phase 2 - Décision Go/No-Go**:
- Si Smile ID démontre valeur ajoutée claire → Migration progressive
- Sinon → Continuer avec Azure, envisager Azure Computer Vision pour OCR

**Phase 3 - Migration (si Go)**:
```
1. Créer edge function smile-id-verification
2. Implémenter en parallèle avec Azure (feature flag)
3. Tester avec utilisateurs beta
4. Basculer progressivement
5. Décommissioner Azure Face API
```

### Métriques de Décision Future

| Critère | Poids | Azure | Smile ID | Gagnant |
|---------|-------|-------|----------|---------|
| Coût à l'échelle | 30% | 6/10 | 8/10 | Smile ID |
| Qualité vérification | 25% | 8/10 | 8/10 | Égalité |
| Facilité intégration | 20% | 9/10 | 7/10 | Azure |
| Fonctionnalités (OCR, liveness) | 15% | 5/10 | 9/10 | Smile ID |
| Support local (CI) | 10% | 6/10 | 9/10 | Smile ID |

**Score Total**:
- Azure: 7.05/10
- Smile ID: 7.85/10

### Recommandation Finale

**Court terme (0-3 mois)**: 
- ✅ Améliorer implémentation Azure actuelle
- ✅ Monitorer coûts et taux de succès
- ✅ Collecter feedback utilisateurs

**Moyen terme (3-6 mois)**:
- 🔄 POC Smile ID si budget le permet
- 🔄 Comparer métriques réelles Azure vs Smile ID
- 🔄 Décision finale basée sur données concrètes

**Long terme (6-12 mois)**:
- 🎯 Potentielle migration vers Smile ID
- 🎯 Ou architecture hybride (Azure face match + Smile ID OCR)
- 🎯 Ou rester sur Azure si performances satisfaisantes

### Références
- [Azure Face API Docs](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity)
- [Smile ID Docs](https://docs.usesmileid.com/)
- Edge function actuelle: `supabase/functions/face-verification/index.ts`

### Dernière mise à jour
2025-10-05 par l'équipe Mon Toit
