# Lessons Learned — Mon Toit CI

| Date | Contexte | Leçon | Action préventive |
|------|----------|-------|-------------------|
| 2026-10-26 | Setup codespace branche 4.0.0 | L'agent de sync du sandbox restaure le snapshot après modifications massives de fichiers connus | Procéder par petits lots (≤7 fichiers en conflit) ; nouveaux chemins en gros lots OK |
| 2026-10-26 | Page d'accueil crashée sans backend | Les composants doivent tolérer l'absence de backend (500 API) | Dégradation gracieuse : toujours prévoir états loading/error/empty ; ne jamais appeler .toLocaleString() sur des données non garanties |
