import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface PaymentConfirmationEmailProps {
  userName: string;
  amount: number;
  provider: string;
  transactionRef: string;
  paymentType: string;
  date: string;
}

export const PaymentConfirmationEmail = ({
  userName,
  amount,
  provider,
  transactionRef,
  paymentType,
  date,
}: PaymentConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Paiement confirmé - {amount.toLocaleString()} FCFA</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Paiement confirmé</Heading>
        
        <Text style={text}>Bonjour {userName},</Text>
        
        <Text style={text}>
          Votre paiement a été effectué avec succès.
        </Text>

        <Section style={box}>
          <Text style={boxTitle}>Détails du paiement</Text>
          <Text style={boxText}>
            <strong>Montant :</strong> {amount.toLocaleString()} FCFA<br />
            <strong>Méthode :</strong> {provider.toUpperCase()}<br />
            <strong>Type :</strong> {paymentType}<br />
            <strong>Référence :</strong> {transactionRef}<br />
            <strong>Date :</strong> {new Date(date).toLocaleDateString("fr-FR")}
          </Text>
        </Section>

        <Text style={text}>
          Un reçu détaillé est disponible dans votre espace "Paiements".
        </Text>

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Paiements sécurisés<br />
          En cas de question, contactez-nous
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PaymentConfirmationEmail;

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
  padding: "20px",
  border: "1px solid #bbf7d0",
};

const boxTitle = {
  color: "#166534",
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
