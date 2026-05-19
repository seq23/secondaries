const STORAGE_VERSION = 'ventureDealDashboardsV1';
const STORAGE_KEYS = {
  secondary: `${STORAGE_VERSION}:secondary`,
  primary: `${STORAGE_VERSION}:primary`,
  fund: `${STORAGE_VERSION}:fund`
};

const DASHBOARD_TITLES = {
  instructions: 'Instructions',
  secondary: 'Secondary Deals',
  primary: 'Primary Deals',
  fund: 'Fund Math'
};

const BASELINES = {
  secondary: {
    dealSize: 25000000,
    basePrice: 25000000,
    investedCapital: 25000000,
    entryDate: '2026-03-26',
    exitDate: '2028-03-26',
    holdYears: 2,
    exitMultiple: 1.75,
    spvLifeYears: 2,
    carryBasisGlobal: 'hard',
    aLabel: '0 / 20 with hurdle',
    aUpfrontPct: 0,
    aMgmtPct: 0,
    aCarryPct: 20,
    aPrefPct: 8,
    bLabel: '5% upfront',
    bUpfrontPct: 5,
    bMgmtPct: 0,
    bCarryPct: 0,
    bPrefPct: 0,
    legalCost: 30000,
    annualComplianceCost: 20000,
    annualAuditTaxCost: 15000,
    roundPrice: 10,
    secondaryPrice: 8.5,
    allocUpfrontInvestor: 100,
    allocUpfrontSponsor: 0,
    allocUpfrontClient: 0,
    allocMgmtInvestor: 100,
    allocMgmtSponsor: 0,
    allocMgmtClient: 0,
    allocCarryInvestor: 100,
    allocCarrySponsor: 0,
    allocCarryClient: 0,
    allocLegalInvestor: 100,
    allocLegalSponsor: 0,
    allocLegalClient: 0,
    allocOngoingInvestor: 100,
    allocOngoingSponsor: 0,
    allocOngoingClient: 0,
    cashFlows: [
      { date: '2027-03-26', desc: 'Interim distribution', amount: 0 },
      { date: '2027-09-26', desc: 'Fee reimbursement', amount: 0 }
    ]
  },
  primary: {
    pCompanyName: 'Sample Primary Deal',
    pStage: 'seed',
    pInstrument: 'priced',
    pCheckSize: 500000,
    pRoundSize: 3500000,
    pPreMoney: 12000000,
    pValuationCap: 12000000,
    pDiscountPct: 20,
    pNoteInterestPct: 6,
    pNextRoundYears: 1.5,
    pTargetOwnership: 3,
    pCurrentOptionPool: 10,
    pPostOptionPool: 15,
    pExitValue: 250000000,
    pHoldYears: 7,
    pFutureDilution: 35,
    pUpfrontFeePct: 0,
    pMgmtFeePct: 0,
    pCarryPct: 20,
    pPrefPct: 0,
    pCarryBasis: 'none',
    pLiqPrefMultiple: 1,
    pPreferenceType: 'non-participating',
    pProRata: 'yes',
    pReserve: 1000000,
    pFundSize: 25000000
  },
  fund: {
    fFundName: 'Emerging Manager Fund I',
    fFundSize: 25000000,
    fGpCommitPct: 1,
    fMgmtFeePct: 2,
    fFeeYears: 10,
    fExpensePct: 1,
    fGrossTvpi: 3.5,
    fNetTvpi: 3,
    fTargetDpi: 1,
    fCarryPct: 20,
    fPrefPct: 8,
    fDeployYears: 3,
    fAvgFollowRound: 12000000,
    fPreSeedAlloc: 25,
    fPreSeedCheck: 250000,
    fPreSeedOwn: 5,
    fPreSeedReserve: 1.5,
    fPreSeedGrad: 45,
    fSeedAlloc: 55,
    fSeedCheck: 750000,
    fSeedOwn: 7,
    fSeedReserve: 1,
    fSeedGrad: 55,
    fSeriesAAlloc: 20,
    fSeriesACheck: 1500000,
    fSeriesAOwn: 6,
    fSeriesAReserve: 0.5,
    fSeriesAGrad: 65
  }
};

const FIELD_IDS = {
  secondary: Object.keys(BASELINES.secondary).filter((key) => key !== 'cashFlows'),
  primary: Object.keys(BASELINES.primary),
  fund: Object.keys(BASELINES.fund)
};

const cashFlowTableBody = document.getElementById('cashFlowTableBody');
const cashFlowRowTemplate = document.getElementById('cashFlowRowTemplate');
let activeTab = 'instructions';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function el(id) { return document.getElementById(id); }
function input(id) { return el(id); }

function currency(value, digits = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}
function percent(value, digits = 2) {
  return `${Number.isFinite(value) ? value.toFixed(digits) : '0.00'}%`;
}
function multiple(value, digits = 2) {
  return `${Number.isFinite(value) ? value.toFixed(digits) : '0.00'}x`;
}
function number(value, digits = 1) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}
function setText(id, value, className = '') {
  const node = el(id);
  if (!node) return;
  node.textContent = value;
  node.className = className;
}
function setHtml(id, value) {
  const node = el(id);
  if (!node) return;
  node.innerHTML = value;
}
function num(id) {
  const node = input(id);
  if (!node || node.value === '') return 0;
  const value = Number(node.value);
  return Number.isFinite(value) ? value : 0;
}
function text(id, fallback = '') {
  return (input(id)?.value || '').trim() || fallback;
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function yearsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max((b - a) / (365.25 * 24 * 3600 * 1000), 0);
}
function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + Math.round(years * 365.25));
  return d;
}
function safeDiv(a, b) { return b ? a / b : 0; }
function statusClass(ok) { return ok ? 'positive' : 'warning'; }
function redYellowGreen(score) {
  if (score >= 80) return ['Strong', 'positive'];
  if (score >= 60) return ['Workable', 'warning'];
  return ['Weak', 'negative'];
}

function getSaved(dashboard) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[dashboard]);
    if (!raw) return clone(BASELINES[dashboard]);
    const parsed = JSON.parse(raw);
    const merged = { ...clone(BASELINES[dashboard]), ...parsed };
    if (dashboard === 'secondary') merged.cashFlows = Array.isArray(parsed.cashFlows) ? parsed.cashFlows : clone(BASELINES.secondary.cashFlows);
    return merged;
  } catch {
    return clone(BASELINES[dashboard]);
  }
}
function saveDashboard(dashboard, values) {
  localStorage.setItem(STORAGE_KEYS[dashboard], JSON.stringify(values));
}
function collectDashboard(dashboard) {
  const values = {};
  FIELD_IDS[dashboard].forEach((id) => {
    const node = input(id);
    if (!node) return;
    values[id] = node.type === 'number' ? (node.value === '' ? '' : Number(node.value)) : node.value;
  });
  if (dashboard === 'secondary') values.cashFlows = getCashFlowRows();
  return values;
}
function applyDashboard(dashboard, values) {
  FIELD_IDS[dashboard].forEach((id) => {
    const node = input(id);
    if (!node) return;
    node.value = values[id] ?? '';
  });
  if (dashboard === 'secondary') renderCashFlowInputs(values.cashFlows || []);
  recalculateAll();
}
function clearDashboard(dashboard) {
  FIELD_IDS[dashboard].forEach((id) => {
    const node = input(id);
    if (!node) return;
    node.value = node.tagName === 'SELECT' ? node.options[0]?.value || '' : '';
  });
  if (dashboard === 'secondary') renderCashFlowInputs([]);
  saveDashboard(dashboard, collectDashboard(dashboard));
  recalculateAll();
}
function resetDashboardToSaved(dashboard) {
  if (dashboard === 'instructions') return;
  applyDashboard(dashboard, getSaved(dashboard));
}
function resetDashboardToBaseline(dashboard) {
  if (dashboard === 'instructions') return;
  saveDashboard(dashboard, clone(BASELINES[dashboard]));
  applyDashboard(dashboard, getSaved(dashboard));
}
function saveActiveDashboard() {
  if (activeTab === 'instructions') return;
  saveDashboard(activeTab, collectDashboard(activeTab));
}

function getCashFlowRows() {
  if (!cashFlowTableBody) return [];
  return Array.from(cashFlowTableBody.querySelectorAll('tr')).map((row) => ({
    date: row.querySelector('.cf-date')?.value || '',
    desc: row.querySelector('.cf-desc')?.value || '',
    amount: Number(row.querySelector('.cf-amount')?.value || 0)
  }));
}
function renderCashFlowInputs(rows) {
  if (!cashFlowTableBody || !cashFlowRowTemplate) return;
  cashFlowTableBody.innerHTML = '';
  rows.forEach((row) => addCashFlowRow(row));
}
function addCashFlowRow(row = { date: '', desc: '', amount: 0 }) {
  if (!cashFlowTableBody || !cashFlowRowTemplate) return;
  const node = cashFlowRowTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.cf-date').value = row.date || '';
  node.querySelector('.cf-desc').value = row.desc || '';
  node.querySelector('.cf-amount').value = row.amount || 0;
  node.querySelector('.cf-remove').addEventListener('click', () => {
    node.remove();
    saveActiveDashboard();
    recalculateSecondary();
  });
  node.querySelectorAll('input').forEach((field) => field.addEventListener('input', () => {
    saveActiveDashboard();
    recalculateSecondary();
  }));
  cashFlowTableBody.appendChild(node);
}

function computeCarry(profit, investedCapital, holdYears, prefPct, carryPct, basis) {
  const hurdleProfit = investedCapital * (prefPct / 100) * holdYears;
  if (profit <= 0 || carryPct <= 0) return 0;
  if (basis === 'none') return profit * carryPct / 100;
  if (basis === 'soft') return profit > hurdleProfit ? profit * carryPct / 100 : 0;
  return Math.max(profit - hurdleProfit, 0) * carryPct / 100;
}
function xnpv(rate, cashflows) {
  const firstDate = cashflows[0]?.date;
  if (!firstDate) return NaN;
  return cashflows.reduce((acc, cf) => acc + (cf.amount / Math.pow(1 + rate, yearsBetween(firstDate, cf.date))), 0);
}
function xirr(cashflows, guess = 0.2) {
  if (cashflows.length < 2 || !cashflows.some((cf) => cf.amount > 0) || !cashflows.some((cf) => cf.amount < 0)) return null;
  let rate = guess;
  for (let i = 0; i < 100; i += 1) {
    const npv = xnpv(rate, cashflows);
    const derivative = cashflows.reduce((acc, cf) => {
      const years = yearsBetween(cashflows[0].date, cf.date);
      return acc - (years * cf.amount) / Math.pow(1 + rate, years + 1);
    }, 0);
    if (!Number.isFinite(npv) || !Number.isFinite(derivative) || derivative === 0) break;
    const newRate = rate - npv / derivative;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
  }
  return Number.isFinite(rate) ? rate : null;
}
function allocationPct(prefix, payer) { return num(`${prefix}${payer}`) / 100; }
function validateAllocation(prefix, statusId) {
  const total = num(`${prefix}Investor`) + num(`${prefix}Sponsor`) + num(`${prefix}Client`);
  setText(statusId, `${total.toFixed(2)}%`, Math.abs(total - 100) < 0.01 ? 'positive' : 'negative');
  return total;
}
function premiumDiscount(roundPrice, secondaryPrice) {
  if (!roundPrice) return { pct: 0, label: 'No round price entered', className: 'neutral' };
  const pct = ((secondaryPrice - roundPrice) / roundPrice) * 100;
  if (Math.abs(pct) < 0.005) return { pct, label: 'At par', className: 'neutral' };
  return { pct, label: pct > 0 ? 'Premium' : 'Discount', className: pct > 0 ? 'warning' : 'positive' };
}
function classifySpvLife(years) {
  if (years <= 0) return 'No duration entered';
  if (years <= 1.5) return 'Very short hold / near-term liquidity';
  if (years <= 3) return 'Typical late-stage / pre-IPO';
  if (years <= 5) return 'Typical venture secondary hold';
  return 'Long-duration / slower-liquidity hold';
}
function winnerLabel(aVal, bVal, lowerIsBetter = true) {
  if (Math.abs(aVal - bVal) < 0.005) return 'Tie';
  const aWins = lowerIsBetter ? aVal < bVal : aVal > bVal;
  return aWins ? 'A' : 'B';
}
function computeSecondaryStructure(label, upfrontPct, mgmtPct, carryPct, prefPct, basis, globals) {
  const upfrontFee = globals.dealSize * (upfrontPct / 100);
  const mgmtFees = globals.investedCapital * (mgmtPct / 100) * globals.holdYears;
  const profit = globals.grossExit - globals.investedCapital;
  const carry = computeCarry(profit, globals.investedCapital, globals.holdYears, prefPct, carryPct, basis);
  const totalFees = upfrontFee + mgmtFees + carry + globals.legalCost + globals.ongoingCost;
  const netProceeds = globals.grossExit - totalFees;
  const netMultiple = safeDiv(netProceeds, globals.investedCapital);
  const payerBurden = {
    investor: upfrontFee * globals.allocations.upfront.investor + mgmtFees * globals.allocations.mgmt.investor + carry * globals.allocations.carry.investor + globals.legalCost * globals.allocations.legal.investor + globals.ongoingCost * globals.allocations.ongoing.investor,
    sponsor: upfrontFee * globals.allocations.upfront.sponsor + mgmtFees * globals.allocations.mgmt.sponsor + carry * globals.allocations.carry.sponsor + globals.legalCost * globals.allocations.legal.sponsor + globals.ongoingCost * globals.allocations.ongoing.sponsor,
    client: upfrontFee * globals.allocations.upfront.client + mgmtFees * globals.allocations.mgmt.client + carry * globals.allocations.carry.client + globals.legalCost * globals.allocations.legal.client + globals.ongoingCost * globals.allocations.ongoing.client
  };
  const datedFlows = [];
  if (globals.entryDate) datedFlows.push({ date: globals.entryDate, amount: -(globals.basePrice + payerBurden.investor) });
  globals.interimFlows.forEach((cf) => { if (cf.date && Number(cf.amount)) datedFlows.push({ date: parseDate(cf.date), amount: Number(cf.amount) }); });
  if (globals.exitDate) datedFlows.push({ date: globals.exitDate, amount: netProceeds });
  datedFlows.sort((a, b) => a.date - b.date);
  return { label, upfrontFee, mgmtFees, carry, totalFees, netProceeds, netMultiple, payerBurden, datedFlows, irr: xirr(datedFlows) };
}
function updateSecondaryStandardsSummary() {
  const s = getSaved('secondary');
  const pills = [
    `Deal size ${currency(s.dealSize)}`,
    `Exit ${multiple(Number(s.exitMultiple || 0))}`,
    `SPV life ${Number(s.spvLifeYears || 0).toFixed(2)} yrs`,
    `${s.aLabel}: ${percent(Number(s.aUpfrontPct || 0))} upfront / ${percent(Number(s.aCarryPct || 0))} carry`,
    `${s.bLabel}: ${percent(Number(s.bUpfrontPct || 0))} upfront / ${percent(Number(s.bCarryPct || 0))} carry`,
    `Legal ${currency(s.legalCost)}`,
    `Round ${currency(s.roundPrice, 2)}`,
    `Secondary ${currency(s.secondaryPrice, 2)}`
  ];
  setHtml('secondaryStandardsList', pills.map((pill) => `<span class="pill">${pill}</span>`).join(''));
  setText('secondaryStatus', 'Saved values auto-update in this browser as you edit.');
}
function recalculateSecondary() {
  const entryDate = parseDate(input('entryDate')?.value);
  const exitDateRaw = parseDate(input('exitDate')?.value);
  const holdYears = yearsBetween(entryDate, exitDateRaw) || num('holdYears');
  const exitDate = exitDateRaw || (entryDate ? addYears(entryDate, holdYears) : null);
  const spvLifeYears = num('spvLifeYears') || holdYears;
  const investedCapital = num('investedCapital') || num('basePrice') || num('dealSize');
  const globals = {
    dealSize: num('dealSize'),
    basePrice: num('basePrice'),
    investedCapital,
    grossExit: investedCapital * num('exitMultiple'),
    holdYears,
    entryDate,
    exitDate,
    legalCost: num('legalCost'),
    ongoingCost: (num('annualComplianceCost') + num('annualAuditTaxCost')) * spvLifeYears,
    allocations: {
      upfront: { investor: allocationPct('allocUpfront', 'Investor'), sponsor: allocationPct('allocUpfront', 'Sponsor'), client: allocationPct('allocUpfront', 'Client') },
      mgmt: { investor: allocationPct('allocMgmt', 'Investor'), sponsor: allocationPct('allocMgmt', 'Sponsor'), client: allocationPct('allocMgmt', 'Client') },
      carry: { investor: allocationPct('allocCarry', 'Investor'), sponsor: allocationPct('allocCarry', 'Sponsor'), client: allocationPct('allocCarry', 'Client') },
      legal: { investor: allocationPct('allocLegal', 'Investor'), sponsor: allocationPct('allocLegal', 'Sponsor'), client: allocationPct('allocLegal', 'Client') },
      ongoing: { investor: allocationPct('allocOngoing', 'Investor'), sponsor: allocationPct('allocOngoing', 'Sponsor'), client: allocationPct('allocOngoing', 'Client') }
    },
    interimFlows: getCashFlowRows()
  };
  const basis = input('carryBasisGlobal')?.value || 'hard';
  const a = computeSecondaryStructure(text('aLabel', 'Structure A'), num('aUpfrontPct'), num('aMgmtPct'), num('aCarryPct'), num('aPrefPct'), basis, globals);
  const b = computeSecondaryStructure(text('bLabel', 'Structure B'), num('bUpfrontPct'), num('bMgmtPct'), num('bCarryPct'), num('bPrefPct'), basis, globals);
  ['Upfront','Mgmt','Carry','Legal','Ongoing'].forEach((name) => validateAllocation(`alloc${name}`, `alloc${name}Status`));
  ['colALabel','payerColALabel','xirrColALabel'].forEach((id) => setText(id, a.label));
  ['colBLabel','payerColBLabel','xirrColBLabel'].forEach((id) => setText(id, b.label));
  const premium = premiumDiscount(num('roundPrice'), num('secondaryPrice'));
  setText('premiumDiscountValue', percent(premium.pct), premium.className);
  setText('premiumDiscountLabel', premium.label, premium.className);
  const comparisonRows = [
    ['Upfront fee', a.upfrontFee, b.upfrontFee, true, 'currency'],
    ['Management fees', a.mgmtFees, b.mgmtFees, true, 'currency'],
    ['Carry', a.carry, b.carry, true, 'currency'],
    ['Legal + ongoing overhead', globals.legalCost + globals.ongoingCost, globals.legalCost + globals.ongoingCost, true, 'currency'],
    ['Total fees', a.totalFees, b.totalFees, true, 'currency'],
    ['Net proceeds to investor', a.netProceeds, b.netProceeds, false, 'currency'],
    ['Net multiple', a.netMultiple, b.netMultiple, false, 'multiple']
  ];
  setHtml('comparisonBody', comparisonRows.map(([label, av, bv, lower, kind]) => `<tr><td>${label}</td><td>${kind === 'multiple' ? multiple(av) : currency(av)}</td><td>${kind === 'multiple' ? multiple(bv) : currency(bv)}</td><td>${winnerLabel(av, bv, lower)}</td></tr>`).join(''));
  setHtml('payerBody', ['investor','sponsor','client'].map((payer) => `<tr><td>${payer.charAt(0).toUpperCase() + payer.slice(1)}</td><td>${currency(a.payerBurden[payer])}</td><td>${currency(b.payerBurden[payer])}</td></tr>`).join(''));
  setHtml('xirrSummaryBody', `<tr><td>Investor XIRR</td><td>${a.irr === null ? 'n/a' : percent(a.irr * 100)}</td><td>${b.irr === null ? 'n/a' : percent(b.irr * 100)}</td></tr><tr><td>Dated cash-flow rows</td><td>${a.datedFlows.length}</td><td>${b.datedFlows.length}</td></tr><tr><td>Gross exit value</td><td>${currency(globals.grossExit)}</td><td>${currency(globals.grossExit)}</td></tr>`);
  setText('breakEvenPill', `Break-even exit multiple before fees: ${multiple(safeDiv(globals.investedCapital, globals.investedCapital))}`);
  setText('spvLifePill', classifySpvLife(spvLifeYears));
  updateSecondaryStandardsSummary();
}

function stageBenchmarks(stage) {
  if (stage === 'pre-seed') return { low: 10, high: 20, target: 15, reserve: 1.5 };
  if (stage === 'series-a') return { low: 15, high: 25, target: 20, reserve: 0.75 };
  return { low: 17.5, high: 25, target: 20, reserve: 1 };
}
function recalculatePrimary() {
  const stage = input('pStage')?.value || 'seed';
  const instrument = input('pInstrument')?.value || 'priced';
  const b = stageBenchmarks(stage);
  const check = num('pCheckSize');
  const round = num('pRoundSize');
  const pre = num('pPreMoney');
  const cap = num('pValuationCap') || pre;
  const discountPct = num('pDiscountPct');
  const noteInterestPct = num('pNoteInterestPct');
  const nextRoundYears = num('pNextRoundYears');

  let post = pre + round;
  let ownership = safeDiv(check, post) * 100;
  let roundDilution = safeDiv(round, post) * 100;
  let effectiveValuation = pre;
  let ownershipBasis = 'Priced equity: check ÷ post-money';
  let convertedInvestment = check;

  if (instrument === 'post-money-safe') {
    post = cap || post;
    effectiveValuation = post;
    ownership = safeDiv(check, post) * 100;
    roundDilution = safeDiv(round, post) * 100;
    ownershipBasis = 'Post-money SAFE: check ÷ post-money cap';
  } else if (instrument === 'convertible-note') {
    const discountedPre = pre * Math.max(0, 1 - discountPct / 100);
    const candidates = [pre, cap, discountedPre].filter((value) => value > 0);
    effectiveValuation = candidates.length ? Math.min(...candidates) : pre;
    convertedInvestment = check * (1 + (noteInterestPct / 100) * nextRoundYears);
    post = effectiveValuation + round;
    ownership = safeDiv(convertedInvestment, post) * 100;
    roundDilution = safeDiv(round, post) * 100;
    ownershipBasis = 'Note / pre-money SAFE: accrued check ÷ conversion post-money';
  }

  const poolIncrease = Math.max(num('pPostOptionPool') - num('pCurrentOptionPool'), 0);
  const exitOwnership = ownership * (1 - num('pFutureDilution') / 100);
  const grossProceedsCommon = num('pExitValue') * exitOwnership / 100;
  const preference = check * num('pLiqPrefMultiple');
  const grossProceeds = input('pPreferenceType')?.value === 'participating' ? preference + grossProceedsCommon : Math.max(preference, grossProceedsCommon);
  const upfrontFee = check * num('pUpfrontFeePct') / 100;
  const mgmtFees = check * num('pMgmtFeePct') / 100 * num('pHoldYears');
  const carry = computeCarry(grossProceeds - check, check, num('pHoldYears'), num('pPrefPct'), num('pCarryPct'), input('pCarryBasis')?.value || 'none');
  const netProceeds = Math.max(grossProceeds - upfrontFee - mgmtFees - carry, 0);
  const netMoic = safeDiv(netProceeds, check + upfrontFee + mgmtFees);
  const annualized = num('pHoldYears') > 0 && netMoic > 0 ? (Math.pow(netMoic, 1 / num('pHoldYears')) - 1) * 100 : 0;
  const fundContribution = safeDiv(netProceeds, num('pFundSize'));
  const nextRoundSize = Math.max(round * 2.5, 5000000);
  const proRataNeed = nextRoundSize * ownership / 100;
  const reserveCoverage = safeDiv(num('pReserve'), proRataNeed) * 100;
  const conversionBreakpoint = ownership > 0 ? preference / (ownership / 100) : 0;

  let score = 100;
  const reasons = [];
  if (ownership < num('pTargetOwnership')) { score -= 18; reasons.push('ownership below target'); }
  if (roundDilution < b.low || roundDilution > b.high) { score -= 12; reasons.push('round dilution outside normal band'); }
  if (poolIncrease > 8) { score -= 10; reasons.push('large option-pool expansion'); }
  if (reserveCoverage < 75 && input('pProRata')?.value === 'yes') { score -= 12; reasons.push('reserve does not cover likely pro-rata need'); }
  if (input('pProRata')?.value === 'no') { score -= 15; reasons.push('no pro-rata rights'); }
  if (netMoic < 5) { score -= 14; reasons.push('weak venture-scale return'); }
  if (instrument === 'priced' && safeDiv(pre, round) > 8) { score -= 8; reasons.push('valuation high relative to round size'); }
  if (instrument !== 'priced' && !cap) { score -= 10; reasons.push('SAFE/note cap missing'); }
  if (discountPct > 30) { score -= 5; reasons.push('discount is unusually investor-favorable; confirm terms are real'); }
  if (noteInterestPct > 12) { score -= 5; reasons.push('note interest looks high for venture context'); }
  if (num('pLiqPrefMultiple') > 1 || input('pPreferenceType')?.value === 'participating') { score -= 8; reasons.push('heavier preference stack'); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const [signal, cls] = redYellowGreen(score);
  setText('pSignal', signal, cls);
  setText('pScore', `${score}/100`, cls);
  setText('pMainReason', reasons[0] || 'ownership, valuation, reserves, and terms are directionally coherent', reasons[0] ? 'warning' : 'positive');
  setText('pPostMoney', currency(post));
  setText('pEffectiveValuation', currency(effectiveValuation));
  setText('pInstrumentBasis', ownershipBasis);
  setText('pOwnership', percent(ownership), ownership >= num('pTargetOwnership') ? 'positive' : 'warning');
  setText('pRoundDilution', percent(roundDilution), roundDilution >= b.low && roundDilution <= b.high ? 'positive' : 'warning');
  setText('pPoolIncrease', percent(poolIncrease), poolIncrease <= 5 ? 'positive' : 'warning');
  setText('pExitOwnership', percent(exitOwnership));
  setText('pGrossProceeds', currency(grossProceeds));
  setText('pNetProceeds', currency(netProceeds));
  setText('pNetMoic', multiple(netMoic), netMoic >= 10 ? 'positive' : netMoic >= 5 ? 'warning' : 'negative');
  setText('pAnnualized', percent(annualized), annualized >= 30 ? 'positive' : annualized >= 20 ? 'warning' : 'negative');
  setText('pFundContribution', `${multiple(fundContribution)} of fund`, fundContribution >= 0.25 ? 'positive' : 'warning');
  setText('pNextRoundSize', currency(nextRoundSize));
  setText('pProRataNeed', currency(proRataNeed));
  setText('pReserveCoverage', percent(reserveCoverage), reserveCoverage >= 100 ? 'positive' : reserveCoverage >= 75 ? 'warning' : 'negative');
  const checks = [
    ['Instrument math', ownershipBasis, instrument === 'priced' ? 'Uses priced-round post-money' : 'Uses cap/discount/accrual approximation'],
    ['Stage dilution band', `${percent(roundDilution)} vs ${percent(b.low, 1)}-${percent(b.high, 1)}`, roundDilution >= b.low && roundDilution <= b.high ? 'In normal range' : 'Needs explanation'],
    ['Ownership target', `${percent(ownership)} vs ${percent(num('pTargetOwnership'))} target`, ownership >= num('pTargetOwnership') ? 'Clears target' : 'Below target'],
    ['Option pool expansion', percent(poolIncrease), poolIncrease <= 5 ? 'Normal-ish' : 'Can hide valuation pain'],
    ['Preference conversion breakpoint', currency(conversionBreakpoint), 'Below this exit, preference math matters more than common ownership'],
    ['Pro-rata rights', input('pProRata')?.value === 'yes' ? 'Yes' : 'No', input('pProRata')?.value === 'yes' ? 'Can defend winners' : 'Major ownership-decay risk'],
    ['Reserve coverage', percent(reserveCoverage), reserveCoverage >= 100 ? 'Covered' : 'Under-reserved']
  ];
  setHtml('pChecksBody', checks.map(([a, b2, c]) => `<tr><td>${a}</td><td>${b2}</td><td>${c}</td></tr>`).join(''));
  const memo = [
    ['Deal', `${text('pCompanyName', 'Primary deal')} · ${stage} · ${instrument}`],
    ['Valuation / conversion basis', `${currency(effectiveValuation)} effective conversion valuation; ${currency(post)} modeled post/conversion value`],
    ['Ownership', `${percent(ownership)} at close/conversion; ${percent(exitOwnership)} after assumed future dilution`],
    ['Return case', `${currency(num('pExitValue'))} exit produces ${multiple(netMoic)} net MOIC and ${percent(annualized)} annualized`],
    ['Reserve plan', `${currency(num('pReserve'))} reserve vs ${currency(proRataNeed)} modeled pro-rata need`],
    ['Signal', `${signal} (${score}/100): ${reasons[0] || 'directionally coherent'}`]
  ];
  setHtml('pMemoBody', memo.map(([a, b2]) => `<tr><td>${a}</td><td>${b2}</td></tr>`).join(''));
  setText('primaryStatus', 'Saved values auto-update in this browser as you edit. SAFE/note math is an approximation; legal docs still control.');
}

function recalculateFund() {
  const fundSize = num('fFundSize');
  const fees = fundSize * num('fMgmtFeePct') / 100 * num('fFeeYears');
  const expenses = fundSize * num('fExpensePct') / 100;
  const investable = Math.max(fundSize - fees - expenses, 0);
  const avgFollowRound = num('fAvgFollowRound');
  const stages = [
    { key: 'PreSeed', label: 'Pre-seed', alloc: num('fPreSeedAlloc'), check: num('fPreSeedCheck'), own: num('fPreSeedOwn'), reserve: num('fPreSeedReserve'), grad: num('fPreSeedGrad') },
    { key: 'Seed', label: 'Seed', alloc: num('fSeedAlloc'), check: num('fSeedCheck'), own: num('fSeedOwn'), reserve: num('fSeedReserve'), grad: num('fSeedGrad') },
    { key: 'SeriesA', label: 'Series A', alloc: num('fSeriesAAlloc'), check: num('fSeriesACheck'), own: num('fSeriesAOwn'), reserve: num('fSeriesAReserve'), grad: num('fSeriesAGrad') }
  ];
  let totalCompanies = 0;
  let initialCapital = 0;
  let reserveCapital = 0;
  let modeledReserveNeed = 0;
  let expectedFollowOnCompanies = 0;
  let weightedOwnership = 0;
  let winnerOwnership = 0;
  const totalAlloc = stages.reduce((sum, s) => sum + s.alloc, 0);
  stages.forEach((s) => {
    const bucket = investable * s.alloc / 100;
    const fullyLoadedCheck = s.check * (1 + s.reserve);
    const companies = fullyLoadedCheck > 0 ? Math.floor(bucket / fullyLoadedCheck) : 0;
    const initial = companies * s.check;
    const reserve = companies * s.check * s.reserve;
    const graduated = companies * s.grad / 100;
    const stageModeledReserveNeed = graduated * avgFollowRound * s.own / 100;
    totalCompanies += companies;
    initialCapital += initial;
    reserveCapital += reserve;
    modeledReserveNeed += stageModeledReserveNeed;
    expectedFollowOnCompanies += graduated;
    weightedOwnership += companies * s.own;
    winnerOwnership = Math.max(winnerOwnership, s.own * 0.65);
    setText(`f${s.key}Companies`, String(companies));
  });
  const avgOwnership = safeDiv(weightedOwnership, totalCompanies);
  const dealsPerYear = safeDiv(totalCompanies, num('fDeployYears'));
  const grossValueNeeded = fundSize * num('fGrossTvpi');
  const netValueNeeded = fundSize * num('fNetTvpi');
  const dpiCashNeeded = fundSize * num('fTargetDpi');
  const moicOnInvestable = safeDiv(grossValueNeeded, investable);
  const winnerExit = winnerOwnership > 0 ? grossValueNeeded / (winnerOwnership / 100) : 0;
  const reserveRatio = safeDiv(reserveCapital, initialCapital);
  const reserveCoverageVsNeed = safeDiv(reserveCapital, modeledReserveNeed) * 100;
  const unallocated = investable - initialCapital - reserveCapital;
  let score = 100;
  const reasons = [];
  if (Math.abs(totalAlloc - 100) > 0.5) { score -= 18; reasons.push('stage allocations do not total 100%'); }
  if (reserveRatio < 0.6) { score -= 10; reasons.push('reserve ratio looks light for venture'); }
  if (reserveCoverageVsNeed < 75) { score -= 16; reasons.push('reserve budget does not cover modeled pro-rata need'); }
  if (totalCompanies < 12) { score -= 12; reasons.push('portfolio may be too concentrated'); }
  if (totalCompanies > 45) { score -= 10; reasons.push('portfolio may be too diluted to manage'); }
  if (avgOwnership < 3) { score -= 15; reasons.push('average ownership likely too low to return the fund'); }
  if (dealsPerYear > 15) { score -= 10; reasons.push('deployment pace may be unrealistic'); }
  if (fees > fundSize * 0.22) { score -= 8; reasons.push('fee load is high'); }
  if (winnerExit > 2000000000) { score -= 10; reasons.push('single-winner requirement is very high'); }
  if (unallocated < -fundSize * 0.01) { score -= 12; reasons.push('planned checks/reserves exceed investable capital'); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const [signal, cls] = redYellowGreen(score);
  setText('fSignal', signal, cls);
  setText('fScore', `${score}/100`, cls);
  setText('fMainReason', reasons[0] || 'allocation, reserves, ownership, and return target are directionally coherent', reasons[0] ? 'warning' : 'positive');
  setText('fFees', currency(fees));
  setText('fExpenses', currency(expenses));
  setText('fInvestable', currency(investable));
  setText('fGpCommit', currency(fundSize * num('fGpCommitPct') / 100));
  setText('fInitialCapital', currency(initialCapital));
  setText('fReserveCapital', currency(reserveCapital));
  setText('fModeledReserveNeed', currency(modeledReserveNeed));
  setText('fReserveCoverage', percent(reserveCoverageVsNeed), reserveCoverageVsNeed >= 100 ? 'positive' : reserveCoverageVsNeed >= 75 ? 'warning' : 'negative');
  setText('fFollowOnCompanies', number(expectedFollowOnCompanies, 1));
  setText('fTotalCompanies', number(totalCompanies, 0));
  setText('fDealsPerYear', number(dealsPerYear, 1));
  setText('fAvgOwnership', percent(avgOwnership));
  setText('fGrossValueNeeded', currency(grossValueNeeded));
  setText('fNetValueNeeded', currency(netValueNeeded));
  setText('fDpiCashNeeded', currency(dpiCashNeeded));
  setText('fWinnerExit', currency(winnerExit));
  setText('fWinnerOwnership', percent(winnerOwnership));
  setText('fMoicOnInvestable', multiple(moicOnInvestable));
  setText('fAllocStatus', `Stage allocation: ${percent(totalAlloc)}`, Math.abs(totalAlloc - 100) <= 0.5 ? 'positive' : 'negative');
  setText('fReserveStatus', `Reserve ratio: ${multiple(reserveRatio)} · coverage ${percent(reserveCoverageVsNeed)}`, reserveCoverageVsNeed >= 100 ? 'positive' : 'warning');
  setText('fPaceStatus', `Deployment: ${number(dealsPerYear, 1)} new deals/year`, dealsPerYear <= 12 ? 'positive' : 'warning');
  const checks = [
    ['Stage allocation', percent(totalAlloc), Math.abs(totalAlloc - 100) <= 0.5 ? 'Totals correctly' : 'Must total 100%'],
    ['Investable capital', currency(investable), 'Net of management fees and expenses'],
    ['Reserve ratio', multiple(reserveRatio), reserveRatio >= 0.8 ? 'Reasonable for early-stage strategy' : 'Likely under-reserved'],
    ['Reserve coverage vs pro-rata need', percent(reserveCoverageVsNeed), reserveCoverageVsNeed >= 100 ? 'Modeled need covered' : 'May need more reserve or lower follow-on assumptions'],
    ['Expected follow-on companies', number(expectedFollowOnCompanies, 1), 'Uses graduation % by stage'],
    ['Portfolio count', number(totalCompanies, 0), totalCompanies >= 12 && totalCompanies <= 45 ? 'Defensible range' : 'Needs strategy explanation'],
    ['Average ownership', percent(avgOwnership), avgOwnership >= 3 ? 'Can matter if winners hit' : 'May not move fund-level returns'],
    ['Single-winner requirement', currency(winnerExit), winnerExit <= 2000000000 ? 'Plausible with power-law upside' : 'Very hard to defend to LPs'],
    ['DPI cash target', currency(dpiCashNeeded), 'Placeholder for LP cash-return expectations; not a forecast'],
    ['Unallocated / overallocated capital', currency(unallocated), unallocated >= 0 ? 'Budget has slack' : 'Overallocated']
  ];
  setHtml('fChecksBody', checks.map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join(''));
  const memo = [
    ['Fund', `${text('fFundName', 'Fund')} · ${currency(fundSize)} commitments`],
    ['Capital budget', `${currency(investable)} investable after ${currency(fees)} fees and ${currency(expenses)} expenses`],
    ['Portfolio plan', `${number(totalCompanies, 0)} companies, ${currency(initialCapital)} initial checks, ${currency(reserveCapital)} reserves`],
    ['Reserve sufficiency', `${currency(modeledReserveNeed)} modeled pro-rata need across ${number(expectedFollowOnCompanies, 1)} expected follow-ons; ${percent(reserveCoverageVsNeed)} coverage`],
    ['Ownership plan', `${percent(avgOwnership)} average initial ownership; ${percent(winnerOwnership)} modeled winner ownership after dilution`],
    ['Return requirement', `${currency(grossValueNeeded)} gross value for ${multiple(num('fGrossTvpi'))} gross TVPI; ${currency(dpiCashNeeded)} cash DPI target; single winner needs about ${currency(winnerExit)} exit value`],
    ['LP signal', `${signal} (${score}/100): ${reasons[0] || 'directionally coherent'}`]
  ];
  setHtml('fMemoBody', memo.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join(''));
  setText('fundStatus', 'Saved values auto-update in this browser as you edit. Graduation % and average follow-on round size now drive reserve-need coverage.');
}

function recalculateAll() {
  recalculateSecondary();
  recalculatePrimary();
  recalculateFund();
}

function exportCsvForDashboard(dashboard) {
  if (dashboard === 'instructions') return;
  const rows = [['Dashboard', DASHBOARD_TITLES[dashboard]], ['Exported at', new Date().toISOString()], [], ['Inputs']];
  const values = collectDashboard(dashboard);
  Object.entries(values).forEach(([key, value]) => {
    if (key === 'cashFlows') return;
    rows.push([key, value]);
  });
  if (dashboard === 'secondary') {
    rows.push([], ['Cash flows'], ['Date','Description','Amount']);
    getCashFlowRows().forEach((cf) => rows.push([cf.date, cf.desc, cf.amount]));
    rows.push([], ['Outputs'], ['Premium / discount', el('premiumDiscountValue')?.textContent], ['Classification', el('premiumDiscountLabel')?.textContent]);
    Array.from(document.querySelectorAll('#comparisonBody tr')).forEach((tr) => rows.push(Array.from(tr.children).map((td) => td.textContent)));
  }
  if (dashboard === 'primary') {
    rows.push([], ['Outputs']);
    Array.from(document.querySelectorAll('#pMemoBody tr')).forEach((tr) => rows.push(Array.from(tr.children).map((td) => td.textContent)));
  }
  if (dashboard === 'fund') {
    rows.push([], ['Outputs']);
    Array.from(document.querySelectorAll('#fMemoBody tr')).forEach((tr) => rows.push(Array.from(tr.children).map((td) => td.textContent)));
  }
  const csv = rows.map((row) => row.map((cell) => {
    const textValue = String(cell ?? '');
    return /[",\n]/.test(textValue) ? `"${textValue.replaceAll('"', '""')}"` : textValue;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${dashboard}-dashboard-export.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tab}`));
  document.querySelectorAll('.nav-link[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  setText('printTitle', `${DASHBOARD_TITLES[tab]} Report`);
}

function wireEvents() {
  document.querySelectorAll('.nav-link[data-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  document.querySelectorAll('input[data-model], select[data-model]').forEach((node) => {
    node.addEventListener('input', () => { saveActiveDashboard(); recalculateAll(); });
    node.addEventListener('change', () => { saveActiveDashboard(); recalculateAll(); });
  });
  el('addCashFlowBtn')?.addEventListener('click', () => { addCashFlowRow(); saveActiveDashboard(); recalculateSecondary(); });
  el('resetDefaultsBtn')?.addEventListener('click', () => resetDashboardToSaved(activeTab));
  el('resetBuiltInBtn')?.addEventListener('click', () => resetDashboardToBaseline(activeTab));
  el('clearAllBtn')?.addEventListener('click', () => clearDashboard(activeTab));
  el('downloadCsvBtn')?.addEventListener('click', () => exportCsvForDashboard(activeTab));
  el('printPdfBtn')?.addEventListener('click', () => {
    setText('printTimestamp', `Generated ${new Date().toLocaleString()}`);
    window.print();
  });
}

function boot() {
  ['secondary','primary','fund'].forEach((dashboard) => applyDashboard(dashboard, getSaved(dashboard)));
  wireEvents();
  switchTab('instructions');
  recalculateAll();
}

boot();
