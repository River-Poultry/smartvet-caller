-- next_steps was referenced in submitPostCall but never added to the calls table.
-- Every POST /calls/:id/post-call returned 500 until this migration runs.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS next_steps TEXT;
