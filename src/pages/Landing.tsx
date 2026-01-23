import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <SocialProofSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
