import { Star, Users, Calculator } from "lucide-react";

const testimonials = [
  {
    quote: "Descobri que estava praticamente pagando para vender.",
    author: "Carla M.",
    role: "Marmitaria em SP",
  },
  {
    quote: "Eu achava que estava lucrando, mas estava errando na comissão.",
    author: "Roberto S.",
    role: "Hamburgueria em BH",
  },
  {
    quote: "Em 10 minutos ajustei meu cardápio inteiro.",
    author: "Fernanda L.",
    role: "Pizzaria em RJ",
  },
];

const counters = [
  { icon: Users, value: "+400", label: "restaurantes analisando margem" },
  { icon: Calculator, value: "+30 mil", label: "cálculos realizados" },
];

export function SocialProofSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Quem usa, não volta para planilha
          </h2>
        </div>

        {/* Counters */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mb-12">
          {counters.map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <c.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-bold text-foreground">
                  {c.value}
                </span>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-warning fill-warning"
                  />
                ))}
              </div>

              <p className="text-foreground font-medium mb-6 leading-relaxed italic">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
