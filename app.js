
const STORAGE_KEY = 'secondaryDashboardIndustryStandardsV3';

const APP_BASELINE_DEFAULTS = {
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
};

const ids = [
  'dealSize','basePrice','investedCapital','entryDate','exitDate','holdYears','exitMultiple','spvLifeYears','carryBasisGlobal',
  'aLabel','aUpfrontPct','aMgmtPct','aCarryPct','aPrefPct','bLabel','bUpfrontPct','bMgmtPct','bCarryPct','bPrefPct',
  'legalCost','annualComplianceCost','annualAuditTaxCost','roundPrice','secondaryPrice',
  'allocUpfrontInvestor','allocUpfrontSponsor','allocUpfrontClient',
  'allocMgmtInvestor','allocMgmtSponsor','allocMgmtClient',
  'allocCarryInvestor','allocCarrySponsor','allocCarryClient',
  'allocLegalInvestor','allocLegalSponsor','allocLegalClient',
  'allocOngoingInvestor','allocOngoingSponsor','allocOngoingClient'
];

const inputEls = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const page = document.body.dataset.page || 'dashboard';
const cashFlowTableBody = document.getElementById('cashFlowTableBody');
const cashFlowRowTemplate = document.getElementById('cashFlowRowTemplate');

const comparisonBody = document.getElementById('comparisonBody');
const payerBody = document.getElementById('payerBody');
const xirrSummaryBody = document.getElementById('xirrSummaryBody');
const standardsList = document.getElementById('standardsList');

function getSavedStandards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(APP_BASELINE_DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(APP_BASELINE_DEFAULTS),
      ...parsed,
      cashFlows: Array.isArray(parsed.cashFlows) ? parsed.cashFlows : structuredClone(APP_BASELINE_DEFAULTS.cashFlows)
    };
  } catch {
    return structuredClone(APP_BASELINE_DEFAULTS);
  }
}

function saveStandards(standards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(standards));
}

function num(id) {
  const raw = inputEls[id]?.value;
  if (raw === '' || raw === null || raw === undefined) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}
function text(id, fallback) {
  return (inputEls[id]?.value || '').trim() || fallback;
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}
function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}
function preciseCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0);
}
function percent(value) { return `${(value || 0).toFixed(2)}%`; }
function multiple(value) { return `${(value || 0).toFixed(2)}x`; }
function yearsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max((b - a) / (365.25 * 24 * 3600 * 1000), 0);
}
function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + Math.round(years * 365.25));
  return d;
}
function setText(id, value, className = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.className = className;
}
function setHtml(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = value;
}
function allocationPct(prefix, payer) {
  return num(`${prefix}${payer}`) / 100;
}
function validateAllocation(prefix, statusId) {
  const total = num(`${prefix}Investor`) + num(`${prefix}Sponsor`) + num(`${prefix}Client`);
  const statusEl = document.getElementById(statusId);
  if (statusEl) {
    statusEl.textContent = `${total.toFixed(2)}%`;
    statusEl.className = Math.abs(total - 100) < 0.01 ? 'positive' : 'negative';
  }
  return total;
}
function classifySpvLife(years) {
  if (years <= 0) return 'No duration entered';
  if (years <= 1.5) return 'Very short hold / near-term liquidity';
  if (years <= 3) return 'Typical late-stage / pre-IPO';
  if (years <= 5) return 'Typical venture secondary hold';
  return 'Long-duration / structured or slower-liquidity hold';
}
function buildDefaultsFromInputs() {
  const obj = {};
  ids.forEach((id) => {
    if (!inputEls[id]) return;
    obj[id] = inputEls[id].type === 'text' || inputEls[id].tagName === 'SELECT' || inputEls[id].type === 'date'
      ? inputEls[id].value
      : (inputEls[id].value === '' ? '' : Number(inputEls[id].value));
  });
  obj.cashFlows = getCashFlowRows();
  return obj;
}
function applyValues(values) {
  ids.forEach((id) => {
    if (!inputEls[id]) return;
    const value = values[id];
    inputEls[id].value = value ?? '';
  });
  renderCashFlowInputs(values.cashFlows || []);
}
function clearAll() {
  ids.forEach((id) => {
    if (!inputEls[id]) return;
    inputEls[id].value = inputEls[id].tagName === 'SELECT' ? 'hard' : '';
  });
  renderCashFlowInputs([]);
  if (page === 'dashboard') recalculate();
}
function resetToSavedStandards() {
  applyValues(getSavedStandards());
  if (page === 'dashboard') {
    recalculate();
    updateStandardsSummary();
  }
}
function resetSavedStandardsToAppBaseline() {
  saveStandards(structuredClone(APP_BASELINE_DEFAULTS));
  applyValues(getSavedStandards());
  if (page === 'dashboard') {
    recalculate();
    updateStandardsSummary();
  } else {
    flashStatus('settingsSaveStatus', 'App baseline restored as your saved standards.', 'positive');
  }
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
    if (page === 'dashboard') recalculate();
  });
  node.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      if (page === 'dashboard') recalculate();
    });
  });
  cashFlowTableBody.appendChild(node);
}
function computeCarry(profit, investedCapital, holdYears, prefPct, carryPct, hurdleBasis) {
  const hurdleProfit = investedCapital * (prefPct / 100) * holdYears;
  if (profit <= 0 || carryPct <= 0) return 0;
  if (hurdleBasis === 'none') return profit * carryPct / 100;
  if (hurdleBasis === 'soft') return profit > hurdleProfit ? profit * carryPct / 100 : 0;
  const carryBase = Math.max(profit - hurdleProfit, 0);
  return carryBase * carryPct / 100;
}
function xnpv(rate, cashflows) {
  const firstDate = cashflows[0]?.date;
  if (!firstDate) return NaN;
  return cashflows.reduce((acc, cf) => {
    const years = yearsBetween(firstDate, cf.date);
    return acc + (cf.amount / Math.pow(1 + rate, years));
  }, 0);
}
function xirr(cashflows, guess = 0.2) {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((cf) => cf.amount > 0);
  const hasNegative = cashflows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;
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
function computeStructure(label, upfrontPct, mgmtPct, carryPct, prefPct, basis, globals) {
  const {
    dealSize, investedCapital, basePrice, grossExit, holdYears, entryDate, exitDate,
    legalCost, ongoingCost, allocations, interimFlows
  } = globals;
  const upfrontFee = dealSize * (upfrontPct / 100);
  const mgmtFees = investedCapital * (mgmtPct / 100) * holdYears;
  const profit = grossExit - investedCapital;
  const carry = computeCarry(profit, investedCapital, holdYears, prefPct, carryPct, basis);
  const totalFees = upfrontFee + mgmtFees + carry + legalCost + ongoingCost;
  const netProceeds = grossExit - totalFees;
  const netMultiple = investedCapital > 0 ? netProceeds / investedCapital : 0;

  const payerBurden = {
    investor:
      upfrontFee * allocations.upfront.investor +
      mgmtFees * allocations.mgmt.investor +
      carry * allocations.carry.investor +
      legalCost * allocations.legal.investor +
      ongoingCost * allocations.ongoing.investor,
    sponsor:
      upfrontFee * allocations.upfront.sponsor +
      mgmtFees * allocations.mgmt.sponsor +
      carry * allocations.carry.sponsor +
      legalCost * allocations.legal.sponsor +
      ongoingCost * allocations.ongoing.sponsor,
    client:
      upfrontFee * allocations.upfront.client +
      mgmtFees * allocations.mgmt.client +
      carry * allocations.carry.client +
      legalCost * allocations.legal.client +
      ongoingCost * allocations.ongoing.client
  };

  const entryCashFlow = -(
    basePrice +
    payerBurden.investor
  );

  const datedFlows = [];
  if (entryDate) datedFlows.push({ date: entryDate, amount: entryCashFlow, desc: 'Entry cash outflow' });
  interimFlows.forEach((cf) => {
    if (cf.date && Number(cf.amount)) datedFlows.push({ date: parseDate(cf.date), amount: Number(cf.amount), desc: cf.desc || 'Interim flow' });
  });
  if (exitDate) datedFlows.push({ date: exitDate, amount: netProceeds, desc: 'Net exit proceeds' });
  datedFlows.sort((a, b) => a.date - b.date);

  return {
    label, upfrontFee, mgmtFees, carry, totalFees, netProceeds, netMultiple, payerBurden,
    datedFlows, irr: xirr(datedFlows)
  };
}
function winnerLabel(aVal, bVal, lowerIsBetter = true) {
  if (Math.abs(aVal - bVal) < 0.005) return 'Tie';
  const aWins = lowerIsBetter ? aVal < bVal : aVal > bVal;
  return aWins ? 'A' : 'B';
}
function premiumDiscount(roundPrice, secondaryPrice) {
  if (!roundPrice) return { pct: 0, label: 'No round price entered', className: 'neutral' };
  const pct = ((secondaryPrice - roundPrice) / roundPrice) * 100;
  if (Math.abs(pct) < 0.005) return { pct, label: 'At par', className: 'neutral' };
  return {
    pct,
    label: pct > 0 ? 'Premium' : 'Discount',
    className: pct > 0 ? 'warning' : 'positive'
  };
}
function updateStandardsSummary() {
  if (!standardsList) return;
  const s = getSavedStandards();
  const pills = [
    `Deal size ${currency(s.dealSize)}`,
    `Exit multiple ${multiple(Number(s.exitMultiple || 0))}`,
    `SPV life ${Number(s.spvLifeYears || 0).toFixed(2)} yrs`,
    `${s.aLabel}: ${percent(Number(s.aUpfrontPct || 0))} upfront / ${percent(Number(s.aCarryPct || 0))} carry`,
    `${s.bLabel}: ${percent(Number(s.bUpfrontPct || 0))} upfront / ${percent(Number(s.bCarryPct || 0))} carry`,
    `Legal ${currency(s.legalCost)}`,
    `Annual compliance ${currency(s.annualComplianceCost)}`,
    `Annual audit/tax ${currency(s.annualAuditTaxCost)}`,
    `Round ${preciseCurrency(s.roundPrice)}`,
    `Secondary ${preciseCurrency(s.secondaryPrice)}`
  ];
  standardsList.innerHTML = pills.map((pill) => `<span class="pill">${pill}</span>`).join('');
  const status = document.getElementById('standardsStatus');
  if (status) {
    status.textContent = 'Reset loads your saved standards profile from the separate settings page.';
  }
}
function flashStatus(id, text, className = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `notice-box ${className}`.trim();
}
function exportCsv(rows) {
  const csv = rows.map((row) => row.map((cell) => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'secondary-deal-economics-export.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function recalculate() {
  if (page !== 'dashboard') return;

  const entryDate = parseDate(inputEls.entryDate?.value);
  const exitDate = parseDate(inputEls.exitDate?.value);
  const holdYears = yearsBetween(entryDate, exitDate) || num('holdYears');
  const spvLifeYears = num('spvLifeYears') || holdYears;
  const globals = {
    dealSize: num('dealSize'),
    basePrice: num('basePrice'),
    investedCapital: num('investedCapital') || num('basePrice') || num('dealSize'),
    grossExit: (num('investedCapital') || num('basePrice') || num('dealSize')) * num('exitMultiple'),
    holdYears,
    entryDate,
    exitDate: exitDate || (entryDate ? addYears(entryDate, holdYears) : null),
    legalCost: num('legalCost'),
    ongoingCost: (num('annualComplianceCost') + num('annualAuditTaxCost')) * spvLifeYears,
    allocations: {
      upfront: {
        investor: allocationPct('allocUpfront', 'Investor'),
        sponsor: allocationPct('allocUpfront', 'Sponsor'),
        client: allocationPct('allocUpfront', 'Client')
      },
      mgmt: {
        investor: allocationPct('allocMgmt', 'Investor'),
        sponsor: allocationPct('allocMgmt', 'Sponsor'),
        client: allocationPct('allocMgmt', 'Client')
      },
      carry: {
        investor: allocationPct('allocCarry', 'Investor'),
        sponsor: allocationPct('allocCarry', 'Sponsor'),
        client: allocationPct('allocCarry', 'Client')
      },
      legal: {
        investor: allocationPct('allocLegal', 'Investor'),
        sponsor: allocationPct('allocLegal', 'Sponsor'),
        client: allocationPct('allocLegal', 'Client')
      },
      ongoing: {
        investor: allocationPct('allocOngoing', 'Investor'),
        sponsor: allocationPct('allocOngoing', 'Sponsor'),
        client: allocationPct('allocOngoing', 'Client')
      }
    },
    interimFlows: getCashFlowRows()
  };

  const a = computeStructure(
    text('aLabel', 'Structure A'),
    num('aUpfrontPct'),
    num('aMgmtPct'),
    num('aCarryPct'),
    num('aPrefPct'),
    inputEls.carryBasisGlobal?.value || 'hard',
    globals
  );
  const b = computeStructure(
    text('bLabel', 'Structure B'),
    num('bUpfrontPct'),
    num('bMgmtPct'),
    num('bCarryPct'),
    num('bPrefPct'),
    inputEls.carryBasisGlobal?.value || 'hard',
    globals
  );

  validateAllocation('allocUpfront', 'allocUpfrontStatus');
  validateAllocation('allocMgmt', 'allocMgmtStatus');
  validateAllocation('allocCarry', 'allocCarryStatus');
  validateAllocation('allocLegal', 'allocLegalStatus');
  validateAllocation('allocOngoing', 'allocOngoingStatus');

  setText('colALabel', a.label);
  setText('colBLabel', b.label);
  setText('payerColALabel', a.label);
  setText('payerColBLabel', b.label);
  setText('xirrColALabel', a.label);
  setText('xirrColBLabel', b.label);

  const premium = premiumDiscount(num('roundPrice'), num('secondaryPrice'));
  setText('premiumDiscountValue', percent(premium.pct), premium.className);
  setText('premiumDiscountLabel', premium.label, premium.className);

  const comparisonRows = [
    ['Upfront fee', a.upfrontFee, b.upfrontFee, true],
    ['Management fees', a.mgmtFees, b.mgmtFees, true],
    ['Carry', a.carry, b.carry, true],
    ['Total fees', a.totalFees, b.totalFees, true],
    ['Net proceeds to investor', a.netProceeds, b.netProceeds, false],
    ['Net multiple', a.netMultiple, b.netMultiple, false]
  ];
  comparisonBody.innerHTML = comparisonRows.map(([label, av, bv, lower]) => `
    <tr>
      <td>${label}</td>
      <td>${label === 'Net multiple' ? multiple(av) : currency(av)}</td>
      <td>${label === 'Net multiple' ? multiple(bv) : currency(bv)}</td>
      <td>${winnerLabel(av, bv, lower)}</td>
    </tr>
  `).join('');

  payerBody.innerHTML = ['investor', 'sponsor', 'client'].map((payer) => `
    <tr>
      <td>${payer.charAt(0).toUpperCase() + payer.slice(1)}</td>
      <td>${currency(a.payerBurden[payer])}</td>
      <td>${currency(b.payerBurden[payer])}</td>
    </tr>
  `).join('');

  xirrSummaryBody.innerHTML = `
    <tr><td>Investor XIRR</td><td>${a.irr === null ? 'n/a' : percent(a.irr * 100)}</td><td>${b.irr === null ? 'n/a' : percent(b.irr * 100)}</td></tr>
    <tr><td>Entry cash outflow</td><td>${currency(a.datedFlows[0]?.amount || 0)}</td><td>${currency(b.datedFlows[0]?.amount || 0)}</td></tr>
    <tr><td>Exit net proceeds</td><td>${currency(a.datedFlows.at(-1)?.amount || 0)}</td><td>${currency(b.datedFlows.at(-1)?.amount || 0)}</td></tr>
  `;

  const breakEvenMultiple = num('bUpfrontPct') > 0 && num('aCarryPct') > 0
    ? 1 + ((num('bUpfrontPct') / 100) / (num('aCarryPct') / 100))
    : 0;
  setText('breakEvenPill', breakEvenMultiple ? `Break-even multiple vs upfront/carry: ${multiple(breakEvenMultiple)}` : 'Break-even multiple: enter upfront and carry');
  setText('spvLifePill', `SPV life view: ${classifySpvLife(spvLifeYears)}`);

  const printTimestamp = document.getElementById('printTimestamp');
  if (printTimestamp) printTimestamp.textContent = `Generated ${new Date().toLocaleString()}`;
}
function bindInputRecalc() {
  ids.forEach((id) => {
    if (!inputEls[id]) return;
    inputEls[id].addEventListener('input', recalculate);
    inputEls[id].addEventListener('change', recalculate);
  });
}
function initializeDashboardPage() {
  applyValues(getSavedStandards());
  updateStandardsSummary();
  bindInputRecalc();
  recalculate();

  document.getElementById('resetDefaultsBtn')?.addEventListener('click', resetToSavedStandards);
  document.getElementById('resetBuiltInBtn')?.addEventListener('click', () => {
    saveStandards(structuredClone(APP_BASELINE_DEFAULTS));
    resetToSavedStandards();
  });
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAll);
  document.getElementById('addCashFlowBtn')?.addEventListener('click', () => {
    addCashFlowRow();
    recalculate();
  });
  document.getElementById('printPdfBtn')?.addEventListener('click', () => window.print());
  document.getElementById('downloadCsvBtn')?.addEventListener('click', () => {
    const rows = [
      ['Metric', text('aLabel', 'Structure A'), text('bLabel', 'Structure B')],
      ['Upfront fee', num('aUpfrontPct'), num('bUpfrontPct')],
      ['Management fee', num('aMgmtPct'), num('bMgmtPct')],
      ['Carry', num('aCarryPct'), num('bCarryPct')],
      ['Preferred return', num('aPrefPct'), num('bPrefPct')],
      [],
      ['Deal size', num('dealSize')],
      ['Base price', num('basePrice')],
      ['Invested capital', num('investedCapital')],
      ['Exit multiple', num('exitMultiple')],
      ['Round price', num('roundPrice')],
      ['Secondary price', num('secondaryPrice')]
    ];
    exportCsv(rows);
  });
}
function initializeStandardsPage() {
  applyValues(getSavedStandards());
  document.getElementById('addCashFlowBtn')?.addEventListener('click', () => addCashFlowRow());
  document.getElementById('saveStandardsBtn')?.addEventListener('click', () => {
    saveStandards(buildDefaultsFromInputs());
    flashStatus('settingsSaveStatus', 'Saved. Dashboard reset will now use these values.', 'positive');
  });
  document.getElementById('resetStandardsBtn')?.addEventListener('click', resetSavedStandardsToAppBaseline);
  document.getElementById('loadCurrentBtn')?.addEventListener('click', () => {
    applyValues(getSavedStandards());
    flashStatus('settingsSaveStatus', 'Reloaded saved standards.', 'neutral');
  });
}

if (page === 'dashboard') {
  initializeDashboardPage();
} else if (page === 'standards') {
  initializeStandardsPage();
}
