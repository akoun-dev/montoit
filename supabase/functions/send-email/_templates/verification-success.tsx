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

interface VerificationSuccessEmailProps {
  userName: string;
  verificationType: "ONECI" | "CNAM";
  tenantScore?: number;
}

export const VerificationSuccessEmail = ({
  userName,
  verificationType,
  tenantScore,
}: VerificationSuccessEmailProps) => (
  <Html>
    <Head />
    <Preview>Vérification {verificationType} réussie</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Vérification réussie !</Heading>
        
        <Text style={text}>Félicitations {userName},</Text>
        
        <Text style={text}>
          Votre vérification <strong>{verificationType}</strong> a été effectuée avec succès.
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>🎯 Badge de confiance activé</Text>
          <Text style={boxText}>
            Votre profil affiche maintenant le badge de vérification {verificationType},
            renforçant votre crédibilité auprès des propriétaires.
          </Text>
          {tenantScore && tenantScore > 0 && (
            <Text style={scoreText}>
              Score locataire : <strong>{tenantScore}/100</strong>
            </Text>
          )}
        </Section>

        <Text style={text}>
          <strong>Avantages :</strong><br />
          ✓ Profil vérifié et crédible<br />
          ✓ Candidatures prioritaires<br />
          ✓ Processus de location accéléré<br />
          {verificationType === "CNAM" && "✓ Preuve d'emploi certifiée"}
        </Text>

        <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/profile`} style={button}>
          Voir mon profil
        </Link>

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Vérifications<br />
          Votre identité est maintenant sécurisée
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationSuccessEmail;

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

const scoreText = {
  color: "#059669",
  fontSize: "18px",
  fontWeight: "600",
  margin: "16px 0 0 0",
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
