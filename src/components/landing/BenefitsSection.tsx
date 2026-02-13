const stats = [
  { value: "+12%", label: "margem média ajustada" },
  { value: "-6h", label: "por semana economizadas" },
  { value: "0", label: "erros de fórmula" },
];

export function BenefitsSection() {
  return (
    <section id="resultados" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 max-w-3xl mx-auto">
            Restaurantes que ajustaram preço com base em margem real{" "}
            <span className="text-gradient">aumentaram até 15% no lucro</span>{" "}
            sem vender mais.
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-8 rounded-2xl bg-card border border-border hover:shadow-card-hover transition-all duration-300"
            >
              <p className="text-5xl sm:text-6xl font-bold text-success mb-3">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
