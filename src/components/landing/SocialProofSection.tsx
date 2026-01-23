import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, Clock, Quote } from "lucide-react";

const microProofs = [
  {
    icon: Users,
    value: "50+",
    label: "donos de restaurantes testando",
  },
  {
    icon: Sparkles,
    value: "Beta",
    label: "acesso antecipado gratuito",
  },
  {
    icon: Clock,
    value: "3 min",
    label: "para precificar sua primeira receita",
  },
];

const testimonials = [
  {
    quote: "Finalmente sei exatamente quanto cobrar no iFood sem perder dinheiro.",
    author: "Carla M.",
    role: "Marmitaria em SP",
  },
  {
    quote: "Parei de chutar preço. Agora tenho certeza que estou lucrando.",
    author: "Roberto S.",
    role: "Hamburgueria em BH",
  },
];

export function SocialProofSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Badge de Beta */}
        <div className="flex justify-center mb-8">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
            🚀 Beta Aberto — Vagas limitadas
          </Badge>
        </div>

        {/* Micro Provas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
          {microProofs.map((proof, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 rounded-lg bg-background border border-border"
            >
              <proof.icon className="w-6 h-6 text-primary mb-2" />
              <span className="text-2xl font-bold text-foreground">{proof.value}</span>
              <span className="text-sm text-muted-foreground">{proof.label}</span>
            </div>
          ))}
        </div>

        {/* Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative p-6 rounded-xl bg-background border border-border"
            >
              <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/20" />
              <p className="text-foreground font-medium mb-4 pl-6 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-2 pl-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Frase de Confiança */}
        <p className="text-center text-muted-foreground text-sm max-w-md mx-auto">
          Desenvolvido por quem entende de food service. 
          <span className="text-foreground font-medium"> Testado por quem vive de delivery.</span>
        </p>
      </div>
    </section>
  );
}
