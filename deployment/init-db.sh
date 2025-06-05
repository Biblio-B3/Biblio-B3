#!/bin/bash

# Script de restauration de la base de données PostgreSQL
# Usage: ./restore_db.sh [chemin_vers_backup.dump]

set -e  # Arrêter le script en cas d'erreur

# Configuration
CONTAINER_NAME="Biblio-postgres"
DB_NAME="Librario"
DB_USER="root"
BACKUP_FILE=${1:-"backup.dump"}

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Script de restauration PostgreSQL ===${NC}"

# Vérifier si le fichier de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Erreur: Le fichier de backup '$BACKUP_FILE' n'existe pas${NC}"
    echo "Usage: $0 [chemin_vers_backup.dump]"
    exit 1
fi

# Vérifier si le container PostgreSQL est en cours d'exécution
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}Erreur: Le container '$CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
    echo "Démarrez d'abord vos services avec: docker-compose up -d"
    exit 1
fi

echo -e "${YELLOW}Fichier de backup: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Container cible: $CONTAINER_NAME${NC}"
echo -e "${YELLOW}Base de données: $DB_NAME${NC}"

# Demander confirmation
read -p "Voulez-vous continuer avec la restauration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restauration annulée${NC}"
    exit 0
fi

echo -e "${YELLOW}Copie du fichier de backup dans le container...${NC}"
docker cp "$BACKUP_FILE" "$CONTAINER_NAME:/tmp/backup.dump"

echo -e "${YELLOW}Suppression de la base de données existante...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo -e "${YELLOW}Création de la nouvelle base de données...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

echo -e "${YELLOW}Restauration de la base de données...${NC}"
docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" -v --no-owner --no-privileges /tmp/backup.dump

echo -e "${YELLOW}Nettoyage du fichier temporaire...${NC}"
docker exec -i "$CONTAINER_NAME" rm /tmp/backup.dump

echo -e "${GREEN}✅ Restauration terminée avec succès!${NC}"

# Optionnel: Afficher des informations sur la base restaurée
echo -e "${YELLOW}Informations sur la base de données restaurée:${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt"