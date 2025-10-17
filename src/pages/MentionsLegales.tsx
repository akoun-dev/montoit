import LegalPage from "./Legal";

const MentionsLegales = () => {
  return (
    <LegalPage title="Mentions légales" lastUpdated="5 octobre 2025">
      <h2>Éditeur du site</h2>
      <p>
        <strong>Mon Toit</strong><br />
        Plateforme propulsée par ANSUT<br />
        (Agence Nationale de Sécurisation des Transactions)<br />
        Abidjan, Côte d'Ivoire
      </p>

      <h2>Directeur de publication</h2>
      <p>[Nom du Directeur Général d'ANSUT]</p>

      <h2>Hébergement</h2>
      <p>
        <strong>Lovable Cloud</strong><br />
        Infrastructure cloud sécurisée
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, logos, code source) 
        est la propriété exclusive de Mon Toit / ANSUT.
      </p>

      <h2>Crédits</h2>
      <ul>
        <li>Logo Mon Toit : ANSUT</li>
        <li>Framework : React + TypeScript</li>
        <li>UI : shadcn/ui + Tailwind CSS</li>
        <li>Backend : Lovable Cloud</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Email : <a href="mailto:contact@montoit.ci">contact@montoit.ci</a><br />
        Téléphone : +225 27 XX XX XX XX
      </p>
    </LegalPage>
  );
};

export default MentionsLegales;
