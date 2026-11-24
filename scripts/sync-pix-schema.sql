-- Compatibilidade aditiva com src/db/schema.ts.
-- Executar em transação; não remove tabelas, colunas nem registros.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS daily_limit numeric(15,2);
ALTER TABLE pix_keys ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE pix_keys ADD COLUMN IF NOT EXISTS suspended_reason varchar(255);
ALTER TABLE pix_keys ADD COLUMN IF NOT EXISTS suspended_at timestamp;
ALTER TABLE pix_transactions ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE pix_transactions ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE pix_transactions ADD COLUMN IF NOT EXISTS scheduled_at timestamp;
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type varchar(20) NOT NULL,
  start_date timestamp,
  end_date timestamp,
  total_transactions integer NOT NULL DEFAULT 0,
  total_sent numeric(15,2) NOT NULL DEFAULT 0,
  total_received numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
