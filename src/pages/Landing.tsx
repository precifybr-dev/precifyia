import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { PricingSection } from "@/components/landing/PricingSection";
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
      <SolutionSection />
      <BenefitsSection />
      <DemoSection />
      <SocialProofSection />
      <PricingSection />
      <FAQSection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
