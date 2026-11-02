import { supabase } from '@/integrations/supabase/client';

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  // En local, on utilise l'URL locale directement
  // En production, on s'assure d'avoir l'URL de production
  const publicUrl = data.publicUrl;

  // Pour le débogage
  console.log('[Storage Service] URL générée pour', bucket, ':', publicUrl);

  return publicUrl;
}

export function getAuthenticatedImageUrl(bucket: string, path: string): string {
  // Pour les images qui nécessitent une authentification
  // Utiliser une fonction Edge pour servir l'image avec le bon token
  const {
    data: { session },
  } = supabase.auth.getSession();

  if (!session) {
    console.error('[Storage] No session found');
    return '';
  }

  // Construire l'URL vers la fonction Edge
  const baseUrl = window.location.origin.includes('localhost')
    ? 'http://127.0.0.1:54321/functions/v1'
    : 'https://silkjqepcbhlflbdtvgg.supabase.co/functions/v1';

  const params = new URLSearchParams({
    bucket,
    path,
  });

  return `${baseUrl}/get-verification-image?${params.toString()}`;
}

// Fonction pour créer un cache buster
export function addCacheBuster(url: string): string {
  const cacheBuster = `v=${Date.now()}`;
  return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
}

// Fonction pour obtenir l'URL de l'avatar avec fallback
export async function getAvatarUrl(userId: string, avatarPath?: string): Promise<string> {
  if (avatarPath) {
    return addCacheBuster(getPublicUrl('avatars', avatarPath));
  }

  // Essayer de récupérer l'avatar depuis le profil
  const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();

  if (data?.avatar_url) {
    return addCacheBuster(getPublicUrl('avatars', data.avatar_url));
  }

  // Avatar par défaut
  return `https://ui-avatars.com/api/?name=${userId}&background=random`;
}
