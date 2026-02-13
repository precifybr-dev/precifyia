import { Star, Users } from "lucide-react";

const testimonials = [
  {
    quote:
      "Descobri que estava lucrando menos da metade do que imaginava. Ajustei os preços e a diferença apareceu no mesmo mês.",
    author: "Carla M.",
    role: "Marmitaria em SP",
  },
  {
    quote:
      "Ajustei 4 produtos no iFood e minha margem subiu quase 20%. Eu vendia no prejuízo sem saber.",
    author: "Roberto S.",
    role: "Hamburgueria em BH",
  },
  {
    quote:
      "Hoje eu sei exatamente quanto sobra por pedido. Simples de usar e me economiza horas por semana.",
    author: "Fernanda L.",
    role: "Pizzaria em RJ",
  },
];

export function SocialProofSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-10">
            Restaurantes que decidiram parar de trabalhar no escuro
          </h2>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <span className="text-4xl sm:text-5xl font-bold text-foreground">
              380+
            </span>
          </div>
          <p className="text-lg text-muted-foreground">
            restaurantes já usam o Precify para precificar corretamente
          </p>
        </div>

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
