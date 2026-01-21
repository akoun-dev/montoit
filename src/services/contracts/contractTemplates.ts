export const getObligationsLocataire = () => [
  'Payer le loyer et les charges aux dates convenues',
  'User paisiblement des lieux loués',
  'Répondre des dégradations et pertes survenues pendant la durée du contrat',
  'Entretenir les lieux loués et effectuer les réparations locatives',
  'Ne pas transformer les lieux sans accord écrit du bailleur',
  'Souscrire une assurance habitation',
  'Laisser visiter les lieux en cas de vente ou de relocation',
];

export const getObligationsBailleur = () => [
  'Délivrer au locataire un logement décent',
  'Assurer au locataire la jouissance paisible du logement',
  "Entretenir les locaux en état de servir à l'usage prévu",
  'Effectuer les grosses réparations',
];

export const getArticle1Text = (address: string, city: string) =>
  `Le bailleur donne en location au locataire qui accepte, un logement situé à l'adresse suivante: ${address}, ${city}, désigné ci-après "les lieux loués".`;

export const getArticle2Text = (startDate: string, endDate: string) => {
  const start = new Date(startDate).toLocaleDateString('fr-FR');
  const end = new Date(endDate).toLocaleDateString('fr-FR');

  return {
    duration: 'Le présent bail est conclu pour une durée de 12 mois',
    startDate: `Date de début: ${start}`,
    endDate: `Date de fin: ${end}`,
    renewal:
      'Le bail se renouvellera automatiquement par tacite reconduction pour des périodes de 12 mois.',
  };
};

export const getArticle4Text = () =>
  `Ce dépôt sera restitué au locataire dans un délai de 2 mois après la restitution des clés, déduction faite des éventuelles réparations locatives et des loyers impayés.`;
