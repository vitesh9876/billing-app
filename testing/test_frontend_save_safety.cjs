const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../frontend/node_modules/typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../frontend/src/components/Dashboard.tsx'), 'utf8');
const ast = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const extracted = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['refreshData', 'handleSavePurchase', 'handleSaveLoan', 'handleSaveOfflineLoan', 'saveRecord', 'applySavedTransaction'].includes(node.name.getText(ast))) {
    extracted[node.name.getText(ast)] = ts.transpileModule(`globalThis.handler = ${node.initializer.getText(ast)}`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  }
  if (ts.isFunctionDeclaration(node) && ['calculateDashboardStats', 'formatBillNoForDisplay'].includes(node.name?.getText(ast))) {
    extracted[node.name.getText(ast)] = ts.transpileModule(`${node.getText(ast)}; globalThis.handler = ${node.name.getText(ast)};`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const tick = () => new Promise(resolve => setImmediate(resolve));
function contextFor(name, values) {
  const ctx = vm.createContext({recordSavesInFlight: {current: new Set()}, mutationRevision: {current: 0}, setSavingRecord() {}, showSaveNotice() {}, crypto: require('node:crypto').webcrypto, ...values, console, Date});
  for (const helper of ['applySavedTransaction', 'saveRecord']) {
    vm.runInContext(extracted[helper].replace('globalThis.handler', 'globalThis.' + helper), ctx);
  }
  vm.runInContext(extracted[name], ctx);
  return ctx;
}
async function checkSave(name) {
  const alerts = [], changes = [], calls = [];
  let resolve;
  const pending = new Promise(r => {resolve = r});
  const base = {
    billingSaveInFlight: {current: false}, billingCustName: 'Test', billingCustPhone: '1234567890',
    selectedCustomerId: 'CUST-TEST', customers: [{id: 'CUST-TEST', name: 'Test'}], transactions: [],
    purchaseItems: [], purchaseCategory: 'Jewelry', loanDetails: {amount: '4000', takenDate: '2026-10-02', endDate: '2027-10-02'},
    loanPledgedItems: [], safeItems: [], sendThankYouSms: false, smsTemplates: [],
    alert: msg => alerts.push(msg), handlePrintTicket: () => changes.push('printed'),
    refreshData: () => changes.push('refreshed'), setPurchaseItems: () => changes.push('reset'),
    setSelectedCustomerId: () => changes.push('reset'), setBillingCustName: () => changes.push('reset'),
    setBillingCustPhone: () => changes.push('reset'), setActiveTab: () => changes.push('navigated'),
    fetch: (url) => {calls.push(url); return pending}
  };
  const ctx = contextFor(name, base);
  const event = {preventDefault() {}};
  ctx.handler(event);
  ctx.handler(event);
  assert.equal(calls.length, 1, `${name}: duplicate pending save blocked`);
  resolve({ok: false, json: async () => ({detail: 'Save failed'})});
  await tick();
  assert.equal(changes.length, 0, `${name}: failed save preserves form and does not print`);
  assert.equal(alerts.length, 1);
  assert.equal(ctx.billingSaveInFlight.current, false);
  // A failed customer save must not create a loan or purchase.
  const customerCalls = [];
  const customerCtx = contextFor(name, {...base, billingSaveInFlight: {current: false}, selectedCustomerId: '', customers: [], fetch: async url => {customerCalls.push(url); return {ok: false, json: async () => ({detail: 'Save failed'})}}});
  customerCtx.handler(event);
  await tick();
  assert.deepEqual(customerCalls, ['/api/v1/records/save'], 'new customer and loan use one atomic request');
}
async function checkRefresh() {
  const waiting = [], applied = [];
  const ctx = contextFor('refreshData', {
    refreshInFlight: {current: false}, refreshPending: {current: false},
    fetch: () => new Promise(resolve => waiting.push(resolve)),
    setCustomers: v => applied.push(v), setTransactions() {}, setSmsTemplates() {},
    setSmsQueue() {}, setSmsDevices() {}, setItemsCatalog() {}, setRemindersStatus() {}
    , setDashboardLoaded() {}
  });
  const first = ctx.handler();
  for (let i=0; i<20; i++) ctx.handler();
  assert.equal(waiting.length, 1, 'update burst has only one active fetch');
  waiting[0]({ok: true, json: async () => ({customers: ['older'], transactions: []})});
  await tick();
  assert.equal(waiting.length, 2, 'one follow-up fetch preserves updates received during first read');
  waiting[1]({ok: true, json: async () => ({customers: ['newer'], transactions: []})});
  await first;
  assert.deepEqual(applied, [['older'], ['newer']]);
  assert.equal(ctx.refreshInFlight.current, false);
}
function checkTotals() {
  const ctx = contextFor('calculateDashboardStats', {});
  const transactions = [
    {type: 'loan', amount: '1000', status: 'Pending'},
    {type: 'loan', amount: 2500, status: 'Pending'},
    {type: 'loan', amount: 9000, status: 'Cleared'},
    {type: 'purchase', amount: '500'},
    {type: 'loan', amount: 'invalid', status: 'Pending'}
  ];
  const stats = ctx.handler(transactions, [{id: 1}]);
  assert.equal(stats.pledgedValue, 3500, 'numeric sum of active loans only');
  assert.equal(stats.totalSales, 500);
  assert.equal(ctx.handler([], []).pledgedValue, 0, 'empty data has a real zero total');
  assert.equal(ctx.handler([...transactions].reverse(), []).pledgedValue, 3500);
  assert.ok(!source.includes('stats.pledgedValue ||'), 'zero is not replaced with sample money');
  const formatter = contextFor('formatBillNoForDisplay', {}).handler;
  assert.equal(formatter('BILL-100-2026'), '100');
  assert.equal(formatter('BILL-100-2026', '★200'), '★200');
}
async function checkOfflineBillEdit() {
  const details = {
    takenDate: '2026-10-02', endDate: '2027-10-02', accumulatedInterest: 650,
    interestPaidUpto: '2026-10-02', interestPayments: [{amountPaid: 100}, {amountPaid: 200}],
    topups: [{extraAmount: 1000}], customHistory: 'Keep me',
    items: [{id: 10, name: 'ring', qty: 1, grossWeight: 3.5, value: 4000}, {id: 20, name: 'chain', qty: 2, grossWeight: 10, value: 8000}]
  };
  let payload;
  const alerts = [];
  const form = {
    custName: 'Test', phone: '1234567890', billNo: '200', starSeries: true, amount: '4000',
    father: '', address: '', idProof: '', mandal: '', interestRate: '3%',
    takenDate: details.takenDate, endDate: details.endDate, interestPaidUpto: details.interestPaidUpto,
    status: 'Pending', clearedDate: '', note: '', yield: '60%', grossWeight: '3.5', netWeight: '', worth: '4000', remarks: '',
    topups: details.topups, newTopUpAmount: '', newRepaymentAmount: ''
  };
  const ctx = contextFor('handleSaveOfflineLoan', {
    offlineSaveInFlight: {current: false}, offlineLoanForm: form, editingTxnId: 'BILL-100-2026',
    transactions: [{id: 'BILL-100-2026', customerId: 'CUST-TEST', amount: 4000, date: '2026-09-01', loanDetails: details}],
    customers: [{id: 'CUST-TEST', name: 'Test', phone: '1234567890'}],
    offlineLoanMetalType: 'Jewelry', offlineLoanPledgedItems: details.items, selectedLoanTxn: null,
    getBillNo: () => '100', alert: msg => alerts.push(msg),
    fetch: async (url, options) => {
      if (url.endsWith('/customers')) return {ok: true};
      payload = JSON.parse(options.body).transaction;
      return {ok: false, json: async () => ({detail: 'Duplicate bill number'})};
    }
  });
  await ctx.handler({preventDefault() {}});
  assert.equal(payload.id, 'BILL-100-2026', 'record identity is unchanged');
  assert.equal(payload.loanDetails.billNumber, '★200');
  assert.equal(payload.date, '2026-09-01', 'original loan date survives a bill edit');
  assert.deepEqual(payload.loanDetails.interestPayments, details.interestPayments);
  assert.deepEqual(payload.loanDetails.topups, details.topups);
  assert.equal(payload.loanDetails.accumulatedInterest, 650);
  assert.equal(payload.loanDetails.customHistory, 'Keep me');
  assert.equal(payload.loanDetails.items[1].grossWeight, 10, 'each item retains its own weight');
  assert.equal(payload.loanDetails.items[1].value, 8000);
  assert.equal(payload.loanDetails.items[1].id, 20);
  assert.ok(alerts[0].includes('Duplicate bill number'));
  assert.equal(ctx.offlineSaveInFlight.current, false);
}
async function checkConfirmedSaveAppearsImmediately() {
  let rows = [{id: 'EXISTING', amount: 100}], customers = [];
  let resolve;
  const pending = new Promise(r => {resolve = r});
  const ctx = contextFor('saveRecord', {
    fetch: () => pending,
    setTransactions: update => {rows = update(rows)},
    setCustomers: update => {customers = update(customers)}
  });
  const saved = {id: 'NEW', amount: 4000};
  const task = ctx.handler(saved, {id: 'CUSTOMER', name: 'Test'});
  assert.equal(rows.length, 1, 'no unconfirmed loan is shown as saved');
  resolve({ok: true, json: async () => ({transaction: saved, customer: {id: 'CUSTOMER', name: 'Test'}})});
  await task;
  assert.equal(rows[0].id, 'NEW', 'confirmed result appears without a dashboard fetch');
  assert.equal(customers[0].id, 'CUSTOMER');
  assert.equal(ctx.mutationRevision.current, 1);
}
async function checkOlderReloadCannotUndoSave() {
  const waiting = [], applied = [];
  const ctx = contextFor('refreshData', {
    refreshInFlight: {current: false}, refreshPending: {current: false},
    fetch: () => new Promise(resolve => waiting.push(resolve)),
    setTransactions: v => applied.push(v), setCustomers() {}, setSmsTemplates() {},
    setSmsQueue() {}, setSmsDevices() {}, setItemsCatalog() {}, setRemindersStatus() {}, setDashboardLoaded() {}
  });
  const task = ctx.handler();
  ctx.mutationRevision.current += 1;
  waiting[0]({ok: true, json: async () => ({customers: [], transactions: ['old']})});
  await tick();
  assert.equal(applied.length, 0, 'pre-save reload must not replace newly saved local data');
  waiting[1]({ok: true, json: async () => ({customers: [], transactions: ['new']})});
  await task;
  assert.deepEqual(applied, [['new']]);
}
(async () => {
  await checkSave('handleSavePurchase');
  await checkSave('handleSaveLoan');
  await checkRefresh();
  await checkConfirmedSaveAppearsImmediately();
  await checkOlderReloadCannotUndoSave();
  checkTotals();
  await checkOfflineBillEdit();
  console.log('Passed: save safety, refresh coalescing, accurate totals, and bill edits preserving record identity, payment history, dates and item values.');
})().catch(err => {console.error(err); process.exitCode = 1});
