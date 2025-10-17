#!/bin/bash

echo "🔧 Configuration du mode développement pour MonToit..."

# 1. Appliquer les corrections de développement
echo "📋 Application des corrections RLS pour le développement..."
supabase db push --db-url="postgresql://postgres:tivilnibujikyxdrdrgd@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"

# 2. Vérifier que les migrations sont appliquées
echo "✅ Vérification des migrations..."
supabase migration list

# 3. Créer une configuration locale si nécessaire
if [ ! -f ".env.local" ]; then
    echo "📝 Création du fichier .env.local..."
    cat > .env.local << EOF
# Configuration locale pour le développement
VITE_SUPABASE_URL=https://tivilnibujikyxdrdrgd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdmlsbmlidWppa3l4ZHJkcmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDU4MzYsImV4cCI6MjA3NjEyMTgzNn0.QvpJQgdEE4kfEMn7L1Wy8rB-XHl2QFGJvlBqquYn34E
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdmlsbmlidWppa3l4ZHJkcmdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU0NTgzNiwiZXhwIjoyMDc2MTIxODM2fQ.gAAgPKydG5J9axq_yKUxzyyawc0EX-qcElkGpxaID-k

# Mode développement
VITE_DEV_MODE=true
VITE_DISABLE_RLS=true
EOF
fi

# 4. Lancer le serveur de développement
echo "🚀 Lancement du serveur de développement..."
npm run dev