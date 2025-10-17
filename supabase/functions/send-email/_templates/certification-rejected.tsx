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

interface CertificationRejectedEmailProps {
  userName: string;
  propertyTitle: string;
  reason: string;
}

export const CertificationRejectedEmail = ({
  userName,
  propertyTitle,
  reason,
}: CertificationRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>Certification ANSUT non approuvée - {propertyTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Certification non approuvée</Heading>
        
        <Text style={text}>Bonjour {userName},</Text>
        
        <Text style={text}>
          Votre demande de certification ANSUT pour <strong>{propertyTitle}</strong> n'a pas été approuvée.
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>Raison :</Text>
          <Text style={boxText}>{reason}</Text>
        </Section>

        <Text style={text}>
          <strong>Prochaines étapes :</strong><br />
          • Corrigez les points mentionnés ci-dessus<br />
          • Mettez à jour votre bail<br />
          • Soumettez une nouvelle demande
        </Text>

        <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/leases`} style={button}>
          Voir mon bail
        </Link>

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Support<br />
          Besoin d'aide ? Contactez notre équipe
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CertificationRejectedEmail;

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
  color: "#dc2626",
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
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "20px",
  border: "1px solid #fecaca",
};

const boxTitle = {
  color: "#991b1b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const boxText = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
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
