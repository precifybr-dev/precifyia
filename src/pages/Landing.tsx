import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <PainSection />
      <ComparisonSection />
      <SolutionSection />
      <DemoSection />
      <BenefitsSection />
      <SocialProofSection />
      <DifferentialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
