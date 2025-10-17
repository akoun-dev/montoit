import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface LeaseSignedEmailProps {
  userName: string;
  propertyTitle: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  bothSigned: boolean;
}

export const LeaseSignedEmail = ({
  userName,
  propertyTitle,
  monthlyRent,
  startDate,
  endDate,
  bothSigned,
}: LeaseSignedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {bothSigned ? "Bail signé par toutes les parties" : "Confirmation de signature"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {bothSigned ? "🎉 Bail finalisé !" : "✅ Signature confirmée"}
        </Heading>
        
        <Text style={text}>Bonjour {userName},</Text>
        
        <Text style={text}>
          {bothSigned 
            ? "Le bail a été signé par toutes les parties et est maintenant actif."
            : "Votre signature du bail a été enregistrée avec succès."}
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>{propertyTitle}</Text>
          <Text style={boxText}>
            <strong>Loyer mensuel :</strong> {monthlyRent.toLocaleString()} FCFA<br />
            <strong>Début :</strong> {new Date(startDate).toLocaleDateString("fr-FR")}<br />
            <strong>Fin :</strong> {new Date(endDate).toLocaleDateString("fr-FR")}
          </Text>
        </Section>

        {bothSigned ? (
          <>
            <Text style={text}>
              <strong>Prochaines étapes :</strong><br />
              ✓ Demander la certification ANSUT (recommandé)<br />
              ✓ Effectuer le premier paiement<br />
              ✓ Télécharger une copie du bail
            </Text>
            <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/leases`} style={button}>
              Voir mon bail
            </Link>
          </>
        ) : (
          <Text style={text}>
            En attente de la signature de l'autre partie. Vous serez notifié dès que le bail sera finalisé.
          </Text>
        )}

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Gestion de baux<br />
          Votre plateforme de location certifiée
        </Text>
      </Container>
    </Body>
  </Html>
);

export default LeaseSignedEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#2563eb",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
  padding: "0 40px",
};

const box = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "20px",
  border: "1px solid #bfdbfe",
};

const boxTitle = {
  color: "#1e40af",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const boxText = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  display: "block",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  margin: "32px 40px",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "32px 0",
};

const footer = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  padding: "0 40px",
};
