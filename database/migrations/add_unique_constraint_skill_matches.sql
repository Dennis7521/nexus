-- Add unique constraint to skill_matches to prevent duplicates
ALTER TABLE skill_matches 
ADD CONSTRAINT uq_skill_match UNIQUE (learner_id, teacher_id, skill_name);
