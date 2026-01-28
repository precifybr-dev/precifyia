import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserType = "master" | "collaborator" | "user" | "loading";

interface UserRoleState {
  userType: UserType;
  isLoading: boolean;
  isMaster: boolean;
  isCollaborator: boolean;
  isAdminUser: boolean; // master OR collaborator
  isEndUser: boolean;
  collaboratorRole: string | null;
  userId: string | null;
}

export function useUserRole() {
  const [state, setState] = useState<UserRoleState>({
    userType: "loading",
    isLoading: true,
    isMaster: false,
    isCollaborator: false,
    isAdminUser: false,
    isEndUser: false,
    collaboratorRole: null,
    userId: null,
  });

  const checkUserRole = useCallback(async (userId: string) => {
    try {
      // Check if user is master
      const { data: masterRole } = await supabase
        .from("user_roles")
        .select("role, is_protected")
        .eq("user_id", userId)
        .eq("role", "master")
        .maybeSingle();

      if (masterRole?.role === "master" && masterRole?.is_protected) {
        setState({
          userType: "master",
          isLoading: false,
          isMaster: true,
          isCollaborator: false,
          isAdminUser: true,
          isEndUser: false,
          collaboratorRole: "master",
          userId,
        });
        return "master";
      }

      // Check if user is collaborator
      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (collaborator) {
        setState({
          userType: "collaborator",
          isLoading: false,
          isMaster: false,
          isCollaborator: true,
          isAdminUser: true,
          isEndUser: false,
          collaboratorRole: collaborator.role,
          userId,
        });
        return "collaborator";
      }

      // Regular user
      setState({
        userType: "user",
        isLoading: false,
        isMaster: false,
        isCollaborator: false,
        isAdminUser: false,
        isEndUser: true,
        collaboratorRole: null,
        userId,
      });
      return "user";
    } catch (error) {
      console.error("Error checking user role:", error);
      setState(prev => ({ ...prev, isLoading: false, userType: "user", isEndUser: true }));
      return "user";
    }
  }, []);

  useEffect(() => {
    const initializeRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          userType: "user",
          isEndUser: true,
        }));
        return;
      }

      await checkUserRole(session.user.id);
    };

    initializeRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid deadlock
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setState({
            userType: "user",
            isLoading: false,
            isMaster: false,
            isCollaborator: false,
            isAdminUser: false,
            isEndUser: true,
            collaboratorRole: null,
            userId: null,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkUserRole]);

  return {
    ...state,
    refetch: () => state.userId ? checkUserRole(state.userId) : Promise.resolve("user" as UserType),
  };
}

// Helper function for login redirection
export async function determineLoginRedirect(userId: string): Promise<"/admin" | "/app"> {
  // Check if user is master
  const { data: masterRole } = await supabase
    .from("user_roles")
    .select("role, is_protected")
    .eq("user_id", userId)
    .eq("role", "master")
    .maybeSingle();

  if (masterRole?.role === "master" && masterRole?.is_protected) {
    return "/admin";
  }

  // Check if user is collaborator
  const { data: collaborator } = await supabase
    .from("collaborators")
    .select("role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (collaborator) {
    return "/admin";
  }

  return "/app";
}
