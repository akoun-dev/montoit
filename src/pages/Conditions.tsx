import LegalPage from "./Legal";

const Conditions = () => {
  return (
    <LegalPage title="Conditions d'utilisation" lastUpdated="5 octobre 2025">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès 
        et l'utilisation de la plateforme Mon Toit propulsée par ANSUT.
      </p>

      <h2>2. Inscription</h2>
      <p>
        L'utilisation complète de la plateforme nécessite la création d'un compte. 
        Vous devez fournir des informations exactes et à jour.
      </p>

      <h2>3. Vérification d'identité</h2>
      <p>
        La plateforme utilise les services ONECI et CNAM pour vérifier l'identité 
        des utilisateurs, conformément à la réglementation ivoirienne.
      </p>

      <h2>4. Obligations des utilisateurs</h2>
      <ul>
        <li>Propriétaires : publier des annonces véridiques et conformes</li>
        <li>Locataires : respecter les biens loués et honorer les paiements</li>
        <li>Tous : respecter la législation en vigueur</li>
      </ul>

      <h2>5. Responsabilité</h2>
      <p>
        Mon Toit agit en qualité d'intermédiaire. La responsabilité des transactions 
        incombe aux parties (locataire/propriétaire).
      </p>

      <h2>6. Modification des CGU</h2>
      <p>
        Mon Toit se réserve le droit de modifier ces CGU à tout moment. 
        Les utilisateurs seront notifiés par email.
      </p>
    </LegalPage>
  );
};

export default Conditions;
