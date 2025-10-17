-- ===================================================================
-- Script de Seed Simple pour Supabase Mon Toit
-- Base de données nettoyée, prête pour création d'utilisateurs via interface web
-- ===================================================================

-- Nettoyage des données de test
DELETE FROM public.login_attempts;
DELETE FROM public.reviews;
DELETE FROM public.rental_applications;
DELETE FROM public.messages;
DELETE FROM public.leases;
DELETE FROM public.properties;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@ci';

-- Rapport
SELECT 'BASE DE DONNÉES NETTOYÉE - PRÊTE POUR CRÉATION UTILISATEURS' as status;