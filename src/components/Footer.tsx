import { Shield, Facebook, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import monToitLogo from "@/assets/logo/mon-toit-logo.png";

const Footer = () => {
  return (
    <footer className="py-8 bg-gray-900 text-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
          
          {/* Zone gauche : Logo + Copyright + Badge ANSUT */}
          <div className="flex items-center gap-4">
            <img src={monToitLogo} alt="Mon Toit" className="h-6 w-auto brightness-0 invert" />
            <span className="text-gray-300">© 2025 Mon Toit</span>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 border border-primary/30 rounded">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-xs">ANSUT</span>
            </div>
          </div>

          {/* Zone centrale : Liens essentiels */}
          <nav className="flex gap-6" aria-label="Footer navigation">
            <Link to="/mentions-legales" className="text-gray-300 hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="text-gray-300 hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link to="/aide" className="text-gray-300 hover:text-white transition-colors">
              Aide
            </Link>
            <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
              Contact
            </Link>
          </nav>

          {/* Zone droite : Icônes réseaux sociaux */}
          <div className="flex gap-4" aria-label="Réseaux sociaux">
            <a 
              href="https://facebook.com/montoit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com/montoit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://linkedin.com/company/montoit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
