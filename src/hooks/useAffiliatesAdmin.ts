import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CouponFormData {
  code: string;
  coupon_type: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  affiliate_id: string | null;
  notes: string | null;
}

export function useAffiliatesAdmin() {
  const queryClient = useQueryClient();

  // Fetch coupons
  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, affiliates(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch affiliates
  const { data: affiliates = [], isLoading: affiliatesLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch commissions
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*, affiliates(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create coupon
  const createCoupon = useMutation({
    mutationFn: async (formData: CouponFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("coupons").insert({
        ...formData,
        created_by: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom criado com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar cupom"),
  });

  // Toggle coupon active
  const toggleCoupon = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Status do cupom atualizado");
    },
  });

  // Update affiliate status
  const updateAffiliateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("affiliates").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Status do afiliado atualizado");
    },
  });

  // Create affiliate
  const createAffiliate = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; instagram?: string; commission_rate: number; pix_key?: string; pix_key_type?: string; notes?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("affiliates").insert({
        ...data,
        user_id: session.user.id,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Afiliado cadastrado com sucesso");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao cadastrar afiliado"),
  });

  // Update affiliate commission rate
  const updateAffiliateRate = useMutation({
    mutationFn: async ({ id, commission_rate }: { id: string; commission_rate: number }) => {
      const { error } = await supabase.from("affiliates").update({ commission_rate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Taxa de comissão atualizada");
    },
  });

  // Process commissions via edge function
  const processCommissions = useMutation({
    mutationFn: async (action: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("process-commissions", {
        body: { action },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success(data?.message || "Comissões processadas");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao processar comissões"),
  });

  // KPIs
  const activeCoupons = coupons.filter((c: any) => c.is_active).length;
  const totalUses = coupons.reduce((sum: number, c: any) => sum + (c.current_uses || 0), 0);
  const expiredCoupons = coupons.filter((c: any) => c.expires_at && new Date(c.expires_at) < new Date()).length;

  const activeAffiliates = affiliates.filter((a: any) => a.status === "active").length;
  const totalPending = affiliates.reduce((sum: number, a: any) => sum + (a.total_pending || 0), 0);
  const totalPaid = affiliates.reduce((sum: number, a: any) => sum + (a.total_paid || 0), 0);

  const commissionsByStatus = {
    pending: commissions.filter((c: any) => c.status === "pending"),
    eligible: commissions.filter((c: any) => c.status === "eligible"),
    approved: commissions.filter((c: any) => c.status === "approved"),
    paid: commissions.filter((c: any) => c.status === "paid"),
  };

  const totalByStatus = {
    pending: commissionsByStatus.pending.reduce((s: number, c: any) => s + c.commission_amount, 0),
    eligible: commissionsByStatus.eligible.reduce((s: number, c: any) => s + c.commission_amount, 0),
    approved: commissionsByStatus.approved.reduce((s: number, c: any) => s + c.commission_amount, 0),
    paid: commissionsByStatus.paid.reduce((s: number, c: any) => s + c.commission_amount, 0),
  };

  return {
    coupons,
    affiliates,
    commissions,
    isLoading: couponsLoading || affiliatesLoading || commissionsLoading,
    createCoupon,
    toggleCoupon,
    updateAffiliateStatus,
    updateAffiliateRate,
    createAffiliate,
    processCommissions,
    kpis: {
      activeCoupons,
      totalUses,
      expiredCoupons,
      activeAffiliates,
      totalPending,
      totalPaid,
      totalByStatus,
    },
    commissionsByStatus,
  };
}
