-- Adicionar campos de volume de vendas e cupons detalhados para a calculadora completa do iFood
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ifood_monthly_orders integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_average_ticket numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_orders_with_coupon integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ifood_coupon_absorber text DEFAULT 'business';

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.ifood_monthly_orders IS 'Total de pedidos mensais no iFood';
COMMENT ON COLUMN public.profiles.ifood_average_ticket IS 'Ticket médio dos pedidos iFood em R$';
COMMENT ON COLUMN public.profiles.ifood_orders_with_coupon IS 'Quantidade média de pedidos com cupom por mês';
COMMENT ON COLUMN public.profiles.ifood_coupon_absorber IS 'Quem absorve o cupom: business, partial, ifood';