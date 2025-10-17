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

interface CertificationApprovedEmailProps {
  userName: string;
  propertyTitle: string;
  monthlyRent: number;
}

export const CertificationApprovedEmail = ({
  userName,
  propertyTitle,
  monthlyRent,
}: CertificationApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>🎉 Certification ANSUT approuvée - {propertyTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Certification ANSUT approuvée !</Heading>
        
        <Text style={text}>Félicitations {userName},</Text>
        
        <Text style={text}>
          Votre bail pour <strong>{propertyTitle}</strong> a été certifié par ANSUT.
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>✨ Badge Certifié ANSUT</Text>
          <Text style={boxText}>
            Votre bail bénéficie maintenant de la certification officielle ANSUT,
            garantissant sa validité légale et la protection de toutes les parties.
          </Text>
          <Text style={boxText}>
            <strong>Loyer mensuel :</strong> {monthlyRent.toLocaleString()} FCFA
          </Text>
        </Section>

        <Text style={text}>
          <strong>Ce que cela signifie :</strong><br />
          ✓ Bail légalement reconnu en Côte d'Ivoire<br />
          ✓ Protection juridique renforcée<br />
          ✓ Conformité aux normes ANSUT<br />
          ✓ Badge de confiance visible
        </Text>

        <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/leases`} style={button}>
          Voir mon bail certifié
        </Link>

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Certifications<br />
          Votre bail est maintenant protégé
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CertificationApprovedEmail;

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
  color: "#059669",
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
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
  border: "2px solid #10b981",
  textAlign: "center" as const,
};

const boxTitle = {
  color: "#059669",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 12px 0",
};

const boxText = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#059669",
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
