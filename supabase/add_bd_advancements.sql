-- Advanced BD Tool Additions

-- 1. Table for non-hierarchical influence relationships (Many-to-Many)
CREATE TABLE IF NOT EXISTS org_node_influences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  influence_type TEXT DEFAULT 'supportive', -- supportive | advisory | administrative | antagonistic
  strength INTEGER DEFAULT 5 CHECK (strength >= 1 AND strength <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table for tracking status history (Transition Tracking)
CREATE TABLE IF NOT EXISTS org_node_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_node_id UUID NOT NULL REFERENCES org_nodes(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- 3. Trigger to track relationship_status changes automatically
CREATE OR REPLACE FUNCTION log_org_node_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.relationship_status IS DISTINCT FROM NEW.relationship_status) THEN
    INSERT INTO org_node_history (org_node_id, old_status, new_status, notes)
    VALUES (NEW.id, OLD.relationship_status, NEW.relationship_status, NEW.notes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_org_node_status_change ON org_nodes;
CREATE TRIGGER tr_org_node_status_change
AFTER UPDATE ON org_nodes
FOR EACH ROW
EXECUTE FUNCTION log_org_node_status_change();

-- 4. Enable RLS
ALTER TABLE org_node_influences ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_node_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All access to org_node_influences" ON org_node_influences FOR ALL USING (true);
CREATE POLICY "All access to org_node_history" ON org_node_history FOR ALL USING (true);
