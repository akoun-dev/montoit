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

interface NewMessageEmailProps {
  userName: string;
  senderName: string;
  messagePreview: string;
}

export const NewMessageEmail = ({
  userName,
  senderName,
  messagePreview,
}: NewMessageEmailProps) => (
  <Html>
    <Head />
    <Preview>Nouveau message de {senderName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>💬 Nouveau message</Heading>
        
        <Text style={text}>Bonjour {userName},</Text>
        
        <Text style={text}>
          <strong>{senderName}</strong> vous a envoyé un message :
        </Text>

        <Section style={box}>
          <Text style={boxText}>
            {messagePreview.length > 150 ? messagePreview.substring(0, 150) + "..." : messagePreview}
          </Text>
        </Section>

        <Link href={`${Deno.env.get("SUPABASE_URL")?.replace("https://", "https://").split(".supabase.co")[0]}.lovable.app/messages`} style={button}>
          Répondre au message
        </Link>

        <Hr style={hr} />
        
        <Text style={footer}>
          MonToit ANSUT - Messagerie<br />
          Pour vous désabonner de ces notifications, modifiez vos préférences
        </Text>
      </Container>
    </Body>
  </Html>
);

export default NewMessageEmail;

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
  fontStyle: "italic",
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
