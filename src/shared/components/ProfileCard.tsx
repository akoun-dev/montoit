interface ProfileCardProps {
  icon: string;
  title: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

export default function ProfileCard({ icon, title, features, ctaText, ctaLink }: ProfileCardProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sm:p-8 text-center hover:border-orange-500 shadow-premium hover:shadow-orange transition-all duration-300 card-premium animate-slide-up">
      {/* Icon */}
      <div className="text-4xl sm:text-5xl mb-4">{icon}</div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{title}</h3>

      {/* Features List */}
      <ul className="text-left mb-6 space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="text-sm sm:text-base text-gray-600 flex items-start">
            <span className="text-orange-500 font-bold mr-2 flex-shrink-0">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <a
        href={ctaLink}
        className="block w-full px-6 py-3 bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-900 font-semibold rounded-lg transition-all duration-300 text-sm sm:text-base btn-premium"
      >
        {ctaText}
      </a>
    </div>
  );
}
