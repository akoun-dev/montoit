'use client'

import { Home, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

const platformLinks = [
  { label: 'Annonces', href: '#' },
  { label: 'Locataires', href: '#' },
  { label: 'Propriétaires', href: '#' },
  { label: 'Tiers de Confiance', href: '#' },
]

const resourceLinks = [
  { label: "Centre d'aide", href: '#' },
  { label: 'CGU', href: '#' },
  { label: 'Politique de confidentialité', href: '#' },
  { label: 'FAQ', href: '#' },
]

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <Home className="size-5 text-brand-500" />
              <span className="text-lg font-bold text-white">MON TOIT</span>
            </a>
            <p className="text-sm text-neutral-400 leading-relaxed mb-5 max-w-xs">
              La plateforme de confiance pour la location immobilière. Trouvez votre logement
              ou publiez votre annonce en toute sécurité.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="size-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-brand-500 transition-colors"
                  >
                    <Icon className="size-4 text-neutral-400 hover:text-white" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Column 2: Plateforme */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Plateforme
            </h4>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Ressources */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Ressources
            </h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 text-brand-400 mt-0.5 shrink-0" />
                <span className="text-sm text-neutral-400">
                  Abidjan, Côte d&apos;Ivoire
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-brand-400 shrink-0" />
                <a
                  href="mailto:contact@montoit.ci"
                  className="text-sm text-neutral-400 hover:text-brand-400 transition-colors"
                >
                  contact@montoit.ci
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-brand-400 shrink-0" />
                <a
                  href="tel:+2250102030405"
                  className="text-sm text-neutral-400 hover:text-brand-400 transition-colors"
                >
                  +225 01 02 03 04 05
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-500 text-center sm:text-left">
            © 2025 Mon Toit — ANSUT. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Mentions légales
            </a>
            <a
              href="#"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
