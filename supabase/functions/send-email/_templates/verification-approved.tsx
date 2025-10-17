import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface VerificationApprovedEmailProps {
  userName: string;
  verificationType: 'ONECI' | 'CNAM';
  reviewNotes?: string;
}

export const VerificationApprovedEmail = ({
  userName,
  verificationType,
  reviewNotes,
}: VerificationApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>Votre vérification {verificationType} a été approuvée</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Vérification approuvée ✓</Heading>
        <Text style={text}>Bonjour {userName},</Text>
        <Text style={text}>
          Excellente nouvelle ! Votre vérification <strong>{verificationType}</strong> a été approuvée par notre équipe.
        </Text>
        
        {reviewNotes && (
          <Section style={box}>
            <Text style={boxText}>
              <strong>Notes de l'administrateur :</strong>
            </Text>
            <Text style={boxText}>{reviewNotes}</Text>
          </Section>
        )}

        <Text style={text}>
          Votre profil est maintenant vérifié, ce qui augmente votre crédibilité auprès des propriétaires et locataires.
        </Text>

        <Link href={`${Deno.env.get('VITE_SUPABASE_URL')}/verification`} style={button}>
          Voir mon profil vérifié
        </Link>

        <Text style={footer}>
          Mon Toit - Plateforme de location immobilière
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationApprovedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#10b981',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const box = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const boxText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '24px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  marginTop: '32px',
};
