import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type OnboardingStep = "business" | "ingredients" | "recipe" | "completed";

export interface Profile {
  id: string;
  user_id: string;
  onboarding_step: OnboardingStep;
  business_name: string | null;
  business_type: string | null;
  tax_regime: string | null;
  default_profit_margin: number | null;
  created_at: string;
  updated_at: string;
}

export function useOnboarding() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile | null;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      return null;
    }
  }, []);

  const createProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          onboarding_step: "business",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        throw error;
      }

      return data as Profile;
    } catch (error) {
      console.error("Error in createProfile:", error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profile.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      setProfile(data as Profile);
      return data as Profile;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw error;
    }
  }, [profile]);

  const advanceToNextStep = useCallback(async () => {
    if (!profile) return;

    const stepOrder: OnboardingStep[] = ["business", "ingredients", "recipe", "completed"];
    const currentIndex = stepOrder.indexOf(profile.onboarding_step);
    
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      await updateProfile({ onboarding_step: nextStep });
      
      if (nextStep === "completed") {
        toast({
          title: "Onboarding concluído! 🎉",
          description: "Você completou a configuração inicial.",
        });
        navigate("/dashboard");
      }
    }
  }, [profile, updateProfile, navigate, toast]);

  useEffect(() => {
    const initializeProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      setUser(session.user);

      let userProfile = await fetchProfile(session.user.id);

      if (!userProfile) {
        userProfile = await createProfile(session.user.id);
      }

      // If onboarding is completed, redirect to dashboard
      if (userProfile.onboarding_step === "completed") {
        navigate("/dashboard");
        return;
      }

      setProfile(userProfile);
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          navigate("/login");
          return;
        }

        if (event === "SIGNED_IN") {
          setUser(session.user);
          let userProfile = await fetchProfile(session.user.id);

          if (!userProfile) {
            userProfile = await createProfile(session.user.id);
          }

          // If onboarding is completed, redirect to dashboard
          if (userProfile.onboarding_step === "completed") {
            navigate("/dashboard");
            return;
          }

          setProfile(userProfile);
          setIsLoading(false);
        }
      }
    );

    initializeProfile();

    return () => subscription.unsubscribe();
  }, [navigate, fetchProfile, createProfile]);

  return {
    user,
    profile,
    isLoading,
    updateProfile,
    advanceToNextStep,
    currentStep: profile?.onboarding_step || "business",
  };
}
