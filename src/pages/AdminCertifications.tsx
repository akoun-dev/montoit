import { useState } from "react";
import { useRequireRole } from "@/hooks/useRequireRole";
import Navbar from "@/components/Navbar";
import CertificationStats from "@/components/admin/CertificationStats";
import LeaseCertificationQueue from "@/components/admin/LeaseCertificationQueue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const AdminCertifications = () => {
  useRequireRole('admin');
  const [selectedTab, setSelectedTab] = useState("pending");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            Certifications ANSUT
          </h1>
          <p className="text-muted-foreground">
            Gérez les demandes de certification des baux et suivez leur statut
          </p>
        </div>

        <div className="space-y-8">
          <CertificationStats />
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                En attente
              </TabsTrigger>
              <TabsTrigger value="in_review" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                En révision
              </TabsTrigger>
              <TabsTrigger value="certified" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Certifiés
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejetés
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-6">
              <LeaseCertificationQueue status="pending" />
            </TabsContent>
            
            <TabsContent value="in_review" className="mt-6">
              <LeaseCertificationQueue status="in_review" />
            </TabsContent>
            
            <TabsContent value="certified" className="mt-6">
              <LeaseCertificationQueue status="certified" />
            </TabsContent>
            
            <TabsContent value="rejected" className="mt-6">
              <LeaseCertificationQueue status="rejected" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminCertifications;