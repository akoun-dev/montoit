import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CTAButton {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface FooterCTAProps {
  title: string;
  subtitle: string;
  buttons: CTAButton[];
  icon?: LucideIcon;
}

export default function FooterCTA({ title, subtitle, buttons, icon: Icon }: FooterCTAProps) {
  return (
    <section className="footer-cta-premium relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#F16522] rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#E8D4C5] rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {Icon && <Icon className="h-12 w-12 mx-auto mb-4 text-[#F16522]" />}

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{title}</h2>

        <p className="text-lg md:text-xl text-[#E8D4C5] mb-10 max-w-2xl mx-auto">{subtitle}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {buttons.map((button, index) => {
            const ButtonIcon = button.icon;
            const isPrimary = button.variant !== 'secondary';

            return (
              <Link
                key={index}
                to={button.href}
                className={`inline-flex items-center justify-center gap-2 px-8 py-4 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                  isPrimary
                    ? 'bg-[#F16522] text-white hover:bg-[#D95518]'
                    : 'bg-transparent border-2 border-[#E8D4C5] text-[#E8D4C5] hover:bg-[#E8D4C5] hover:text-[#2C1810]'
                }`}
              >
                <ButtonIcon className="h-5 w-5" />
                <span>{button.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
