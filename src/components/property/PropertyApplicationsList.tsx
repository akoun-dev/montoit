import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Application } from '@/types';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_VARIANTS } from '@/constants';

interface PropertyApplicationsListProps {
  applications: Application[];
}

export const PropertyApplicationsList = ({ applications }: PropertyApplicationsListProps) => {
  if (applications.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidatures récentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications.map((application: any) => (
          <div
            key={application.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <Avatar>
                <AvatarImage src={application.applicant?.avatar_url} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {application.applicant?.full_name || 'Candidat'}
                  </span>
                  {application.applicant?.is_verified && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Score: {application.verification?.tenant_score || 0}/100</span>
                  <Badge variant={APPLICATION_STATUS_VARIANTS[application.status] || 'outline'}>
                    {APPLICATION_STATUS_LABELS[application.status] || application.status}
                  </Badge>
                </div>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/application/${application.id}`}>
                Voir détails
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
