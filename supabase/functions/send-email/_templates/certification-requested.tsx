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

interface CertificationRequestedEmailProps {
  userName: string;
  propertyTitle: string;
  isAdmin?: boolean;
  leaseId?: string;
}

export const CertificationRequestedEmail = ({
  userName,
  propertyTitle,
  isAdmin = false,
  leaseId,
}: CertificationRequestedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {isAdmin ? "Nouvelle demande de certification ANSUT" : "Demande de certification envoyée"}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {isAdmin ? "📋 Nouvelle demande de certification" : "✅ Demande envoyée"}
        </Heading>
        
        <Text style={text}>Bonjour {userName},</Text>
        
        {isAdmin ? (
          <>
            <Text style={text}>
              Une nouvelle demande de certification ANSUT a été soumise pour le bien suivant :
            </Text>
            <Section style={box}>
              <Text style={boxText}>
                <strong>Propriété :</strong> {propertyTitle}<br />
                <strong>ID du bail :</strong> {leaseId}
              </Text>
            </Section>
            <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/admin`} style={button}>
              Examiner la demande
            </Link>
          </>
        ) : (
          <>
            <Text style={text}>
              Votre demande de certification ANSUT pour <strong>{propertyTitle}</strong> a bien été envoyée.
            </Text>
            <Section style={box}>
              <Text style={boxText}>
                Notre équipe examine votre bail et vous notifiera dès que la certification sera validée.
                Ce processus prend généralement 24 à 48 heures.
              </Text>
            </Section>
            <Text style={text}>
              <strong>Avantages de la certification ANSUT :</strong><br />
              ✓ Bail légalement reconnu<br />
              ✓ Protection renforcée<br />
              ✓ Badge de confiance
            </Text>
          </>
        )}

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Certifications<br />
          {isAdmin ? "Tableau de bord administrateur" : "Votre plateforme de location certifiée"}
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CertificationRequestedEmail;

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
  color: "#f97316",
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
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "20px",
  border: "1px solid #fed7aa",
};

const boxText = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#f97316",
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
