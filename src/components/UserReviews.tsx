import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Review {
  name: string;
  profession: string;
  photo: string;
  quote: string;
  rating: number;
}

const reviews: Review[] = [
  {
    name: "Aminata K.",
    profession: "Comptable",
    photo: "https://ui-avatars.com/api/?name=Aminata+Kone&size=100&background=E67E22&color=fff",
    quote: "J'ai trouvé mon appartement à Cocody en seulement 2 jours. Tout était vérifié, aucune mauvaise surprise !",
    rating: 5
  },
  {
    name: "Konan M.",
    profession: "Ingénieur",
    photo: "https://ui-avatars.com/api/?name=Konan+Mensah&size=100&background=2C5F7F&color=fff",
    quote: "La certification ANSUT m'a vraiment rassuré. Fini les arnaques et les faux propriétaires !",
    rating: 5
  },
  {
    name: "Fatoumata S.",
    profession: "Étudiante",
    photo: "https://ui-avatars.com/api/?name=Fatoumata+Sanogo&size=100&background=10B981&color=fff",
    quote: "100% gratuit et super efficace. Je recommande à tous mes amis qui cherchent un logement !",
    rating: 5
  }
];

const UserReviews = () => {
  return (
    <section className="py-16 md:py-20 bg-muted">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-lg text-muted-foreground">
            Rejoignez des milliers d'Ivoiriens satisfaits
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          {reviews.map((review, index) => (
            <Card 
              key={index}
              className="p-6 bg-white shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-250 ease-in-out cursor-pointer"
            >
              {/* Photo */}
              <div className="flex justify-center mb-4">
                <img
                  src={review.photo}
                  alt={`Photo de ${review.name}`}
                  className="w-[100px] h-[100px] rounded-full"
                  loading="lazy"
                />
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-muted-foreground italic text-center mb-4 min-h-[3rem]">
                "{review.quote}"
              </p>

              {/* Name & Profession */}
              <div className="text-center">
                <p className="font-bold text-foreground">{review.name}</p>
                <p className="text-sm text-muted-foreground">{review.profession}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserReviews;
