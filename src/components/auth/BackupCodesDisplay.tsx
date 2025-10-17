import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Shield, AlertTriangle } from 'lucide-react';

interface BackupCodesDisplayProps {
  codes: string[];
  onDownload?: () => void;
}

export const BackupCodesDisplay = ({ codes, onDownload }: BackupCodesDisplayProps) => {
  const handleDownload = () => {
    const content = `Codes de récupération 2FA - Mon Toit

IMPORTANT : Conservez ces codes en lieu sûr !
Ces codes vous permettront de vous connecter si vous perdez l'accès à votre application d'authentification.

Chaque code ne peut être utilisé qu'une seule fois.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Généré le : ${new Date().toLocaleString('fr-FR')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `montoit-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (onDownload) onDownload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          Codes de récupération 2FA
        </CardTitle>
        <CardDescription>
          Ces codes vous permettront de vous connecter si vous perdez l'accès à votre application d'authentification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>IMPORTANT :</strong> Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
          {codes.map((code, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-muted-foreground">{index + 1}.</span>
              <code className="font-bold tracking-wider">{code}</code>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleDownload} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Télécharger les codes
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Vous pouvez voir vos codes restants dans votre profil
        </p>
      </CardContent>
    </Card>
  );
};
