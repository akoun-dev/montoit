import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Calendar, Clock } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { useState } from "react";

interface WorkStatusSectionProps {
  workStatus: string;
  workDescription?: string | null;
  workImages?: string[];
  workEstimatedCost?: number | null;
  workEstimatedDuration?: string | null;
  workStartDate?: string | null;
}

export const WorkStatusSection = ({
  workStatus,
  workDescription,
  workImages = [],
  workEstimatedCost,
  workEstimatedDuration,
  workStartDate,
}: WorkStatusSectionProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (workStatus !== 'travaux_a_effectuer') return null;

  const slides = workImages.map(url => ({ src: url }));

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge className="bg-orange-600 hover:bg-orange-700 text-white text-base px-4 py-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            ⚠️ Travaux à prévoir
          </Badge>
        </div>
        <CardTitle className="text-xl mt-4">État des travaux</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        {workDescription && (
          <div>
            <h4 className="font-semibold mb-2 text-orange-800">Description des travaux</h4>
            <p className="text-muted-foreground whitespace-pre-line bg-white p-4 rounded-lg border">
              {workDescription}
            </p>
          </div>
        )}

        {/* Galerie photos */}
        {workImages.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 text-orange-800">
              Photos de l'état actuel ({workImages.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {workImages.map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-video cursor-pointer group overflow-hidden rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-colors"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={url}
                    alt={`Travaux ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-semibold">
                      Agrandir
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Lightbox
              open={lightboxOpen}
              close={() => setLightboxOpen(false)}
              index={lightboxIndex}
              slides={slides}
              plugins={[Zoom]}
            />
          </div>
        )}

        {/* Estimations (si renseignées) */}
        {(workEstimatedCost || workEstimatedDuration || workStartDate) && (
          <div className="bg-white p-4 rounded-lg border border-orange-200">
            <h4 className="font-semibold mb-3 text-orange-800 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informations complémentaires
            </h4>
            <div className="space-y-2 text-sm">
              {workEstimatedCost && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <span className="text-muted-foreground">Coût estimé :</span>
                  <span className="font-semibold">
                    {workEstimatedCost.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}
              {workEstimatedDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-muted-foreground">Durée estimée :</span>
                  <span className="font-semibold">{workEstimatedDuration}</span>
                </div>
              )}
              {workStartDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-muted-foreground">Début prévu :</span>
                  <span className="font-semibold">
                    {new Date(workStartDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message d'information */}
        <div className="bg-orange-100 border border-orange-200 p-4 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>ℹ️ Information importante :</strong> Les travaux seront effectués par le propriétaire 
            avant votre emménagement. Le loyer indiqué s'appliquera une fois les travaux terminés.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
