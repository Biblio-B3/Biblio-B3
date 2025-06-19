# Protocole de Test End-to-End - Gestion des Livres (Admin)

## Prérequis
1. Base de donnée démarré
2. Serveur backend démarré
3. Frontend démarré

## Scénarios de Test

### 1. Ajout d'un nouveau livre
**Étapes :**
1. Se connecter en tant qu'admin avec les identifiants par défaut
2. Naviguer vers la section "Livres"
3. Cliquer sur "Ajouter un livre"
4. Remplir le formulaire avec :
   - ISBN
   - Quantité de copie souhaité
5. Soumettre le formulaire

**Résultats attendus :**
- Notification de succès affichée
- Le livre apparaît dans la liste
- Les données sont persistées en base

### 2. Modification d'un livre existant
**Étapes :**
1. Sélectionner un livre dans la liste
2. Cliquer sur "Modifier"
3. Changer certains champs (ex: titre, description)
4. Sauvegarder les modifications

**Résultats attendus :**
- Notification de succès affichée
- Les modifications sont visibles dans la liste
- Les données sont mises à jour en base

### 3. Suppression d'un livre
**Étapes :**
1. Sélectionner un livre dans la liste
2. Cliquer sur "Supprimer"
3. Confirmer la suppression

**Résultats attendus :**
- Notification de succès affichée
- Le livre disparaît de la liste
- Le livre est supprimé de la base

### 4. Gestion des exemplaires
**Étapes :**
1. Sélectionner un livre
2. Naviguer vers l'onglet "Exemplaires"
3. Ajouter un nouvel exemplaire avec :
   - Statut (neuf/usé)
4. Modifier un exemplaire existant
5. Supprimer un exemplaire

**Résultats attendus :**
- Les exemplaires sont correctement affichés
- Les opérations CRUD fonctionnent
- Synchronisation avec le backend

### 5. Recherche et filtrage
**Étapes :**
1. Utiliser la barre de recherche
2. Appliquer des filtres (auteur, catégorie)
3. Trier les résultats

**Résultats attendus :**
- Les résultats correspondent aux critères
- Performance acceptable
- Pagination fonctionnelle
