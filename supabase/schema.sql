-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pharma',
  segment TEXT,
  region TEXT,
  size TEXT,
  website TEXT,
  address TEXT,
  score INT DEFAULT 5 CHECK (score >= 0 AND score <= 10),
  score_reason TEXT,
  pain_points TEXT,
  budget_cycle TEXT,
  buying_process TEXT,
  current_needs TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions table
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'other',
  date TIMESTAMPTZ NOT NULL,
  summary TEXT NOT NULL,
  next_action TEXT,
  buying_signal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product TEXT,
  value BIGINT NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'prospect',
  probability INT DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  products TEXT,
  strengths TEXT,
  weaknesses TEXT,
  market_share TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battlecards table
CREATE TABLE battlecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  criteria TEXT NOT NULL,
  biomedia_value TEXT,
  competitor_value TEXT,
  advantage TEXT DEFAULT 'neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Win/Loss table
CREATE TABLE win_loss (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  date DATE NOT NULL,
  lessons TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Segments table
CREATE TABLE market_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  opportunity_size TEXT,
  penetration TEXT DEFAULT 'none',
  trends TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  steps JSONB DEFAULT '[]',
  products_mapped JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_interactions_account ON interactions(account_id);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_deals_account ON deals(account_id);
CREATE INDEX idx_battlecards_competitor ON battlecards(competitor_id);
CREATE INDEX idx_win_loss_deal ON win_loss(deal_id);
CREATE INDEX idx_win_loss_competitor ON win_loss(competitor_id);
CREATE INDEX idx_workflows_account ON workflows(account_id);
CREATE INDEX idx_accounts_region ON accounts(region);
CREATE INDEX idx_accounts_type ON accounts(type);

-- Auto-update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_segments_updated_at BEFORE UPDATE ON market_segments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON workflows
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE win_loss ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies (single-user app)
CREATE POLICY "All access to accounts" ON accounts FOR ALL USING (true);
CREATE POLICY "All access to contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "All access to interactions" ON interactions FOR ALL USING (true);
CREATE POLICY "All access to deals" ON deals FOR ALL USING (true);
CREATE POLICY "All access to competitors" ON competitors FOR ALL USING (true);
CREATE POLICY "All access to battlecards" ON battlecards FOR ALL USING (true);
CREATE POLICY "All access to win_loss" ON win_loss FOR ALL USING (true);
CREATE POLICY "All access to market_segments" ON market_segments FOR ALL USING (true);
CREATE POLICY "All access to workflows" ON workflows FOR ALL USING (true);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT, -- 'sterility_testing','endotoxin','environmental','microbial','consumable','equipment'
  sku TEXT,
  list_price BIGINT DEFAULT 0, -- VND
  cost BIGINT DEFAULT 0,
  unit TEXT,
  description TEXT,
  usp TEXT, -- unique selling points
  competitor_alternatives JSONB DEFAULT '[]', -- [{competitor, product, price}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  deal_id UUID REFERENCES deals(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft','sent','accepted','rejected'
  items JSONB DEFAULT '[]', -- [{product_id, name, qty, unit_price, discount_pct, total}]
  subtotal BIGINT DEFAULT 0,
  total_discount BIGINT DEFAULT 0,
  grand_total BIGINT DEFAULT 0,
  notes TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at for products and quotes
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies
CREATE POLICY "All access to products" ON products FOR ALL USING (true);
CREATE POLICY "All access to quotes" ON quotes FOR ALL USING (true);

-- Market Intel table
CREATE TABLE market_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_date TIMESTAMPTZ,
  category TEXT, -- 'pharma_factory', 'fnb_factory', 'gmp_license', 'tender', 'regulatory'
  title TEXT,
  summary TEXT,
  companies_mentioned TEXT[],
  region TEXT,
  relevance_score INTEGER,
  source_type TEXT,
  is_lead_candidate BOOLEAN,
  converted_to_account UUID, -- null if not yet converted
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE market_intel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All access to market_intel" ON market_intel FOR ALL USING (true);

-- Org Nodes table (BD Tool — stakeholder org chart)
CREATE TABLE org_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  department TEXT,
  level INTEGER DEFAULT 3,          -- 1=C-level, 2=Director, 3=Manager, 4=Staff
  reports_to UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
  influence_score INTEGER DEFAULT 5 CHECK (influence_score >= 1 AND influence_score <= 10),
  relationship_status TEXT DEFAULT 'neutral', -- champion|supporter|neutral|skeptic|blocker
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_nodes_account ON org_nodes(account_id);
CREATE INDEX idx_org_nodes_reports_to ON org_nodes(reports_to);

CREATE TRIGGER org_nodes_updated_at BEFORE UPDATE ON org_nodes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All access to org_nodes" ON org_nodes FOR ALL USING (true);
