-- Ajoute EMAIL_CHANGE et PHONE_CHANGE à l'enum otp_type
-- Les endpoints /api/profile/change-email et /api/profile/change-phone
-- utilisent ces valeurs depuis le début mais l'enum d'origine ne les
-- contenait pas → l'insert dans otp_codes échouait silencieusement (et
-- donc la vérification ultérieure ne trouvait jamais le code → erreur
-- "Code invalide ou expiré" alors que l'utilisateur avait bien reçu le SMS/email).
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS est supporté depuis Postgres 9.6+
-- et exécutable directement (chacune dans sa propre commande implicite).

alter type otp_type add value if not exists 'EMAIL_CHANGE';
alter type otp_type add value if not exists 'PHONE_CHANGE';
