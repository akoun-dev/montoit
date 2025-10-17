import LegalPage from "./Legal";

const Confidentialite = () => {
  return (
    <LegalPage title="Politique de confidentialité" lastUpdated="5 octobre 2025">
      <h2>1. Collecte des données</h2>
      <p>
        Mon Toit collecte les données personnelles suivantes :
      </p>
      <ul>
        <li>Données d'identification (nom, prénom, email, téléphone)</li>
        <li>Données de vérification (ONECI, CNAM, photo faciale)</li>
        <li>Données de navigation (logs, cookies)</li>
      </ul>

      <h2>2. Utilisation des données</h2>
      <p>Vos données sont utilisées pour :</p>
      <ul>
        <li>Créer et gérer votre compte</li>
        <li>Vérifier votre identité (sécurité)</li>
        <li>Faciliter les transactions immobilières</li>
        <li>Améliorer nos services</li>
      </ul>

      <h2>3. Partage des données</h2>
      <p>
        Vos données ne sont jamais vendues. Elles peuvent être partagées avec :
      </p>
      <ul>
        <li>ANSUT (pour certification des baux)</li>
        <li>Partenaires de paiement (Mobile Money)</li>
        <li>Autorités légales (sur demande judiciaire)</li>
      </ul>

      <h2>4. Sécurité</h2>
      <p>
        Nous utilisons le chiffrement SSL, l'authentification sécurisée, 
        et des sauvegardes régulières pour protéger vos données.
      </p>

      <h2>5. Vos droits</h2>
      <p>Conformément à la loi 2013-450, vous pouvez :</p>
      <ul>
        <li>Accéder à vos données</li>
        <li>Rectifier vos informations</li>
        <li>Supprimer votre compte</li>
        <li>Vous opposer au traitement</li>
      </ul>

      <h2>6. Contact</h2>
      <p>
        Pour toute question : <a href="mailto:privacy@montoit.ci">privacy@montoit.ci</a>
      </p>
    </LegalPage>
  );
};

export default Confidentialite;
