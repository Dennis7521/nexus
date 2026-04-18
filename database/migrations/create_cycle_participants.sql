-- Participants for each exchange cycle
CREATE TABLE IF NOT EXISTS cycle_participants (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL REFERENCES exchange_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position_in_cycle INTEGER NOT NULL,
  teach_skill VARCHAR(255) NOT NULL,
  learn_skill VARCHAR(255) NOT NULL,
  acceptance_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (acceptance_status IN ('pending','accepted','rejected')),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE cycle_participants
  ADD CONSTRAINT uq_cycle_participant UNIQUE (cycle_id, user_id);

ALTER TABLE cycle_participants
  ADD CONSTRAINT uq_cycle_position UNIQUE (cycle_id, position_in_cycle);

CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle ON cycle_participants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_user ON cycle_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_status ON cycle_participants(acceptance_status);
