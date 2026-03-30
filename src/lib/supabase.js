import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Accounts ──────────────────────────────────────────────────────────────────
export async function fetchAccounts(filters = {}) {
  let query = supabase
    .from("accounts")
    .select("*, contacts(count), deals(count), interactions(date)")
    .order("updated_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.region) query = query.eq("region", filters.region);
  if (filters.scoreMin != null) query = query.gte("score", filters.scoreMin);
  if (filters.scoreMax != null) query = query.lte("score", filters.scoreMax);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  return { data, error };
}

export async function fetchAccountById(id) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function createAccount(accountData) {
  const { data, error } = await supabase
    .from("accounts")
    .insert([accountData])
    .select()
    .single();
  return { data, error };
}

export async function updateAccount(id, accountData) {
  const { data, error } = await supabase
    .from("accounts")
    .update(accountData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteAccount(id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  return { error };
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export async function fetchContacts(accountId) {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("account_id", accountId)
    .order("name");
  return { data, error };
}

export async function fetchAllContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*, accounts(name)")
    .order("name");
  return { data, error };
}

export async function createContact(contactData) {
  const { data, error } = await supabase
    .from("contacts")
    .insert([contactData])
    .select()
    .single();
  return { data, error };
}

export async function updateContact(id, contactData) {
  const { data, error } = await supabase
    .from("contacts")
    .update(contactData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteContact(id) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  return { error };
}

// ── Interactions ──────────────────────────────────────────────────────────────
export async function fetchInteractions(accountId = null, limit = 100) {
  let query = supabase
    .from("interactions")
    .select("*, contacts(name, title), accounts(name)")
    .order("date", { ascending: false })
    .limit(limit);

  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
  return { data, error };
}

export async function fetchRecentInteractions(limit = 10) {
  const { data, error } = await supabase
    .from("interactions")
    .select("*, contacts(name), accounts(name)")
    .order("date", { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function createInteraction(interactionData) {
  const { data, error } = await supabase
    .from("interactions")
    .insert([interactionData])
    .select()
    .single();
  return { data, error };
}

export async function updateInteraction(id, interactionData) {
  const { data, error } = await supabase
    .from("interactions")
    .update(interactionData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteInteraction(id) {
  const { error } = await supabase.from("interactions").delete().eq("id", id);
  return { error };
}

// ── Deals ─────────────────────────────────────────────────────────────────────
export async function fetchDeals(accountId = null) {
  let query = supabase
    .from("deals")
    .select("*, accounts(name)")
    .order("created_at", { ascending: false });

  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
  return { data, error };
}

export async function fetchDealById(id) {
  const { data, error } = await supabase
    .from("deals")
    .select("*, accounts(name)")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function createDeal(dealData) {
  const { data, error } = await supabase
    .from("deals")
    .insert([dealData])
    .select()
    .single();
  return { data, error };
}

export async function updateDeal(id, dealData) {
  const { data, error } = await supabase
    .from("deals")
    .update(dealData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteDeal(id) {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  return { error };
}

// ── Competitors ───────────────────────────────────────────────────────────────
export async function fetchCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("*, battlecards(count), win_loss(count)")
    .order("name");
  return { data, error };
}

export async function fetchCompetitorById(id) {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function createCompetitor(competitorData) {
  const { data, error } = await supabase
    .from("competitors")
    .insert([competitorData])
    .select()
    .single();
  return { data, error };
}

export async function updateCompetitor(id, competitorData) {
  const { data, error } = await supabase
    .from("competitors")
    .update(competitorData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteCompetitor(id) {
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  return { error };
}

// ── Battlecards ───────────────────────────────────────────────────────────────
export async function fetchBattlecards(competitorId) {
  const { data, error } = await supabase
    .from("battlecards")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("criteria");
  return { data, error };
}

export async function createBattlecard(battlecardData) {
  const { data, error } = await supabase
    .from("battlecards")
    .insert([battlecardData])
    .select()
    .single();
  return { data, error };
}

export async function updateBattlecard(id, battlecardData) {
  const { data, error } = await supabase
    .from("battlecards")
    .update(battlecardData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteBattlecard(id) {
  const { error } = await supabase.from("battlecards").delete().eq("id", id);
  return { error };
}

// ── Win/Loss ──────────────────────────────────────────────────────────────────
export async function fetchWinLoss(filters = {}) {
  let query = supabase
    .from("win_loss")
    .select("*, deals(name, account_id, accounts(name)), competitors(name)")
    .order("date", { ascending: false });

  if (filters.competitor_id) query = query.eq("competitor_id", filters.competitor_id);
  if (filters.outcome) query = query.eq("outcome", filters.outcome);

  const { data, error } = await query;
  return { data, error };
}

export async function createWinLoss(winLossData) {
  const { data, error } = await supabase
    .from("win_loss")
    .insert([winLossData])
    .select()
    .single();
  return { data, error };
}

export async function updateWinLoss(id, winLossData) {
  const { data, error } = await supabase
    .from("win_loss")
    .update(winLossData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteWinLoss(id) {
  const { error } = await supabase.from("win_loss").delete().eq("id", id);
  return { error };
}

// ── Market Segments ───────────────────────────────────────────────────────────
export async function fetchMarketSegments() {
  const { data, error } = await supabase
    .from("market_segments")
    .select("*")
    .order("name");
  return { data, error };
}

export async function createMarketSegment(segmentData) {
  const { data, error } = await supabase
    .from("market_segments")
    .insert([segmentData])
    .select()
    .single();
  return { data, error };
}

export async function updateMarketSegment(id, segmentData) {
  const { data, error } = await supabase
    .from("market_segments")
    .update(segmentData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteMarketSegment(id) {
  const { error } = await supabase.from("market_segments").delete().eq("id", id);
  return { error };
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export async function fetchWorkflows(accountId = null) {
  let query = supabase
    .from("workflows")
    .select("*, accounts(name)")
    .order("updated_at", { ascending: false });

  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
  return { data, error };
}

export async function fetchWorkflowById(id) {
  const { data, error } = await supabase
    .from("workflows")
    .select("*, accounts(name)")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function createWorkflow(workflowData) {
  const { data, error } = await supabase
    .from("workflows")
    .insert([workflowData])
    .select()
    .single();
  return { data, error };
}

export async function updateWorkflow(id, workflowData) {
  const { data, error } = await supabase
    .from("workflows")
    .update(workflowData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteWorkflow(id) {
  const { error } = await supabase.from("workflows").delete().eq("id", id);
  return { error };
}

// ── Products ──────────────────────────────────────────────────────────────────
export async function fetchProducts(filters = {}) {
  let query = supabase.from("products").select("*").order("name");
  if (filters.category) query = query.eq("category", filters.category);
  const { data, error } = await query;
  return { data, error };
}

export async function createProduct(productData) {
  const { data, error } = await supabase.from("products").insert([productData]).select().single();
  return { data, error };
}

export async function updateProduct(id, productData) {
  const { data, error } = await supabase.from("products").update(productData).eq("id", id).select().single();
  return { data, error };
}

export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  return { error };
}

// ── Quotes ────────────────────────────────────────────────────────────────────
export async function fetchQuotes(accountId = null) {
  let query = supabase.from("quotes").select("*, accounts(name), deals(name)").order("updated_at", { ascending: false });
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  return { data, error };
}

export async function createQuote(quoteData) {
  const { data, error } = await supabase.from("quotes").insert([quoteData]).select().single();
  return { data, error };
}

export async function updateQuote(id, quoteData) {
  const { data, error } = await supabase.from("quotes").update(quoteData).eq("id", id).select().single();
  return { data, error };
}

export async function deleteQuote(id) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  return { error };
}

// ── KPI Tracker ───────────────────────────────────────────────────────────────
export async function fetchKPITarget(period) {
  const { data, error } = await supabase.from("kpi_targets").select("*").eq("period", period).single();
  return { data, error };
}

export async function upsertKPITarget(kpiData) {
  const { data, error } = await supabase.from("kpi_targets").upsert(kpiData).select().single();
  return { data, error };
}

export async function fetchKPIActuals(period) {
  const { data, error } = await supabase.from("kpi_actuals").select("*").eq("period", period).order("week");
  return { data, error };
}

export async function upsertKPIActual(kpiActualData) {
  const { data, error } = await supabase.from("kpi_actuals").upsert(kpiActualData).select().single();
  return { data, error };
}

export async function fetchKPIActualsByPeriods(periods) {
  const { data, error } = await supabase.from("kpi_actuals").select("*").in("period", periods);
  return { data, error };
}

export async function fetchKPITargetsByPeriods(periods) {
  const { data, error } = await supabase.from("kpi_targets").select("*").in("period", periods);
  return { data, error };
}

// ── Market Scan ─────────────────────────────────────────────────────────────────
export async function fetchMarketIntel() {
  const { data, error } = await supabase.from("market_intel").select("*").order("scan_date", { ascending: false });
  return { data, error };
}

export async function updateMarketIntel(id, updates) {
  const { data, error } = await supabase.from("market_intel").update(updates).eq("id", id).select().single();
  return { data, error };
}

export async function createAccountFromIntel(intelRecord) {
  // intelRecord expected to have at least title, region, category
  const type = intelRecord.category === "fnb_factory" ? "fnb" : "pharma";
  // The accounts table usually expects { name, type, region, status ... }
  // Let's create account directly
  const newAccount = {
    name: intelRecord.title || "New Account",
    type: type,
    region: intelRecord.region || "North",
    status: "active",
    score: intelRecord.relevance_score || 50
  };

  const { data: accData, error: accError } = await supabase.from("accounts").insert([newAccount]).select().single();
  
  if (accError) return { data: null, error: accError };

  // Update market_intel to link
  const { error: intelError } = await supabase.from("market_intel")
    .update({ converted_to_account: accData.id })
    .eq("id", intelRecord.id);

  return { data: accData, error: intelError || null };
}

// ── Market Sizing ───────────────────────────────────────────────────────────────
export async function fetchMarketSizing() {
  const { data, error } = await supabase
    .from("market_sizing")
    .select("*")
    .order("year", { ascending: false })
    .order("segment", { ascending: true });
  return { data, error };
}

export async function createMarketSizing(marketData) {
  const { data, error } = await supabase.from("market_sizing").insert([marketData]).select().single();
  return { data, error };
}

export async function updateMarketSizing(id, marketData) {
  const { data, error } = await supabase.from("market_sizing").update(marketData).eq("id", id).select().single();
  return { data, error };
}

export async function deleteMarketSizing(id) {
  const { error } = await supabase.from("market_sizing").delete().eq("id", id);
  return { error };
}

// ── Org Nodes ─────────────────────────────────────────────────────────────────
export async function fetchOrgNodes(accountId) {
  const { data, error } = await supabase
    .from("org_nodes")
    .select("*, contacts(name, email)")
    .eq("account_id", accountId)
    .order("level", { ascending: true })
    .order("name", { ascending: true });
  return { data, error };
}

export async function createOrgNode(orgNodeData) {
  const { data, error } = await supabase
    .from("org_nodes")
    .insert([orgNodeData])
    .select()
    .single();
  return { data, error };
}

export async function updateOrgNode(id, orgNodeData) {
  const { data, error } = await supabase
    .from("org_nodes")
    .update(orgNodeData)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteOrgNode(id) {
  const { error } = await supabase.from("org_nodes").delete().eq("id", id);
  return { error };
}

// ── Complex Queries ───────────────────────────────────────────────────────────
export async function getAccountStats() {
  const [accountsResult, dealsResult] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact" }),
    supabase.from("deals").select("id, value, stage, probability")
  ]);

  const totalAccounts = accountsResult.count || 0;
  const deals = dealsResult.data || [];

  const openDeals = deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
  );
  const closedDeals = deals.filter(
    (d) => d.stage === "closed_won" || d.stage === "closed_lost"
  );
  const wonDeals = deals.filter((d) => d.stage === "closed_won");

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = openDeals.length;
  const winRate =
    closedDeals.length > 0
      ? Math.round((wonDeals.length / closedDeals.length) * 100)
      : 0;

  return {
    data: { totalAccounts, totalPipelineValue, activeDeals, winRate },
    error: accountsResult.error || dealsResult.error
  };
}

export async function getTopAccountsByScore(limit = 5) {
  const { data, error } = await supabase
    .from("accounts")
    .select("*, interactions(date)")
    .order("score", { ascending: false })
    .limit(limit);
  return { data, error };
}

export async function getDealsByStage() {
  const { data, error } = await supabase
    .from("deals")
    .select("stage, value, probability");

  if (error) return { data: null, error };

  const stages = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
  const grouped = stages.map((stage) => {
    const stageDeals = (data || []).filter((d) => d.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    };
  });

  return { data: grouped, error: null };
}

export async function getMarketMatrixData() {
  const [accountsResult, dealsResult, segmentsResult] = await Promise.all([
    supabase.from("accounts").select("id, name, segment, region"),
    supabase.from("deals").select("account_id, value, stage"),
    supabase.from("market_segments").select("*")
  ]);

  return {
    accounts: accountsResult.data || [],
    deals: dealsResult.data || [],
    segments: segmentsResult.data || [],
    error: accountsResult.error || dealsResult.error || segmentsResult.error
  };
}

export async function globalSearch(query) {
  if (!query || query.trim().length < 2) return { data: { accounts: [], contacts: [], deals: [], competitors: [] } };

  const [accounts, contacts, deals, competitors] = await Promise.all([
    supabase.from("accounts").select("id, name, region, type").ilike("name", `%${query}%`).limit(5),
    supabase.from("contacts").select("id, name, email, title, account_id, accounts(name)").or(`name.ilike.%${query}%,email.ilike.%${query}%`).limit(5),
    supabase.from("deals").select("id, name, stage, value, account_id, accounts(name)").ilike("name", `%${query}%`).limit(5),
    supabase.from("competitors").select("id, name, market_share").ilike("name", `%${query}%`).limit(5)
  ]);

  return {
    data: {
      accounts: accounts.data || [],
      contacts: contacts.data || [],
      deals: deals.data || [],
      competitors: competitors.data || []
    }
  };
}
