import { useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { SpreadsheetLimitationsSection } from "@/components/landing/SpreadsheetLimitationsSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export default function Landing() {
  // Force light mode on landing page - dark mode only for authenticated users
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    
    // Restore theme when leaving landing page
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
      <HowItWorksSection />
      <DemoSection />
      <SpreadsheetLimitationsSection />
      <SocialProofSection />
      <FeaturesSection />
      <FAQSection />
      <PricingSection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
