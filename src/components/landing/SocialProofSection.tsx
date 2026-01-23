import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, Clock, Quote, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    result: "Aumentou margem em 15%",
  },
  {
    quote: "Parei de chutar preço. Agora tenho certeza que estou lucrando.",
    author: "Roberto S.",
    role: "Hamburgueria em BH",
    result: "Descobriu prejuízo de R$ 600/mês",
  },
  {
    quote: "Descobri que vendia meu prato mais pedido no prejuízo. O sistema salvou meu negócio.",
    author: "Fernanda L.",
    role: "Restaurante em RJ",
    result: "Ajustou 12 fichas técnicas",
  },
  {
    quote: "Simples e direto. Cadastrei meus insumos em uma tarde e já tenho todos os preços.",
    author: "Marcos A.",
    role: "Food Truck em Curitiba",
    result: "45 produtos precificados",
  },
  {
    quote: "A calculadora de iFood é genial. Agora sei o preço certo para cada canal.",
    author: "Juliana P.",
    role: "Açaíteria em Recife",
    result: "2 preços por produto",
  },
  {
    quote: "Meu contador adorou. Finalmente tenho controle real dos custos.",
    author: "Eduardo C.",
    role: "Pizzaria em POA",
    result: "CMV reduziu de 42% para 30%",
  },
  {
    quote: "Eu achava que lucrava 30%, na verdade era só 12%. Que susto!",
    author: "Patricia R.",
    role: "Doceria em Salvador",
    result: "Margem real descoberta",
  },
  {
    quote: "O fator de correção dos insumos faz toda diferença. Muito profissional.",
    author: "Thiago M.",
    role: "Steakhouse em Brasília",
    result: "Cálculo preciso de carnes",
  },
  {
    quote: "Indiquei para 3 amigos donos de restaurante. Todos adoraram.",
    author: "Amanda F.",
    role: "Cafeteria em Floripa",
    result: "Recomenda para colegas",
  },
];

export function SocialProofSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      if (!isPaused && scrollContainer) {
        scrollPosition += scrollSpeed;
        
        // Reset when we've scrolled half (since content is duplicated)
        if (scrollPosition >= scrollContainer.scrollWidth / 2) {
          scrollPosition = 0;
        }
        
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  // Duplicate testimonials for infinite scroll effect
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="py-16 bg-muted/30 overflow-hidden">
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

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Quem já usa, aprova
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            O que dizem nossos usuários
          </h3>
        </div>

        {/* Testimonials Carousel */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-hidden cursor-grab"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {duplicatedTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[320px] sm:w-[360px] relative p-6 rounded-xl bg-background border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-warning fill-warning" />
                ))}
              </div>
              
              <p className="text-foreground font-medium mb-4 italic leading-relaxed">
                "{testimonial.quote}"
              </p>
              
              {/* Result badge */}
              <div className="mb-4">
                <span className="inline-flex items-center text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                  ✓ {testimonial.result}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
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

        {/* Scroll indicator */}
        <div className="flex justify-center mt-6 gap-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-colors ${i === 0 ? 'bg-primary' : 'bg-primary/30'}`} 
            />
          ))}
        </div>

        {/* Frase de Confiança */}
        <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mt-8">
          Desenvolvido por quem entende de food service. 
          <span className="text-foreground font-medium"> Testado por quem vive de delivery.</span>
        </p>
      </div>
    </section>
  );
}
