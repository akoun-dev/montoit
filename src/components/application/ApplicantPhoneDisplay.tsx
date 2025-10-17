import { useUserPhone } from '@/hooks/useUserPhone';

interface ApplicantPhoneDisplayProps {
  applicantId: string;
}

/**
 * Composant pour afficher le numéro de téléphone d'un candidat de manière sécurisée.
 * Utilise le hook useUserPhone qui vérifie les permissions d'accès via RPC.
 */
export const ApplicantPhoneDisplay = ({ applicantId }: ApplicantPhoneDisplayProps) => {
  const { phone, loading } = useUserPhone(applicantId);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground mb-2">
        📞 Chargement...
      </p>
    );
  }

  if (!phone) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground mb-2">
      📞 {phone}
    </p>
  );
};
