import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const LegalPage = ({ title, lastUpdated, children }: LegalPageProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Dernière mise à jour : {lastUpdated}
            </p>
            <div className="prose prose-lg max-w-none">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
