ALTER TABLE calculation_history
  DROP CONSTRAINT calculation_history_store_id_fkey,
  ADD CONSTRAINT calculation_history_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE cmv_periodos
  DROP CONSTRAINT cmv_periodos_store_id_fkey,
  ADD CONSTRAINT cmv_periodos_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE combo_generation_usage
  DROP CONSTRAINT combo_generation_usage_store_id_fkey,
  ADD CONSTRAINT combo_generation_usage_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE combos
  DROP CONSTRAINT combos_store_id_fkey,
  ADD CONSTRAINT combos_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE topo_cardapio_simulacoes
  DROP CONSTRAINT topo_cardapio_simulacoes_store_id_fkey,
  ADD CONSTRAINT topo_cardapio_simulacoes_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;