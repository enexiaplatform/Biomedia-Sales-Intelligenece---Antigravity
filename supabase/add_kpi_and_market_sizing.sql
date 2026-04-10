-- Add KPI and Market Sizing tables

-- 1. KPI Targets
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL, -- YYYY-MM
  revenue_target BIGINT DEFAULT 0,
  deals_target INTEGER DEFAULT 0,
  calls_target INTEGER DEFAULT 0,
  visits_target INTEGER DEFAULT 0,
  demos_target INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period)
);

-- 2. KPI Actuals
CREATE TABLE IF NOT EXISTS kpi_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL, -- YYYY-MM
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 5),
  revenue_closed BIGINT DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  calls_count INTEGER DEFAULT 0,
  visits_count INTEGER DEFAULT 0,
  demos_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period, week)
);

-- 3. Market Sizing
CREATE TABLE IF NOT EXISTS market_sizing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_market_value BIGINT DEFAULT 0,
  biomedia_market_share NUMERIC DEFAULT 0, -- Percentage 0-100
  growth_rate NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(segment, year)
);

-- Triggers for updated_at
CREATE TRIGGER kpi_targets_updated_at BEFORE UPDATE ON kpi_targets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER kpi_actuals_updated_at BEFORE UPDATE ON kpi_actuals
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_sizing_updated_at BEFORE UPDATE ON market_sizing
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_sizing ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies for authenticated users
CREATE POLICY "All access to kpi_targets" ON kpi_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All access to kpi_actuals" ON kpi_actuals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All access to market_sizing" ON market_sizing FOR ALL TO authenticated USING (true) WITH CHECK (true);
