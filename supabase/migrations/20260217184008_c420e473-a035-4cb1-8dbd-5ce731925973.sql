ALTER TABLE combos ADD COLUMN IF NOT EXISTS combo_price_ifood numeric DEFAULT 0;
ALTER TABLE combos ADD COLUMN IF NOT EXISTS ingredients_description text;