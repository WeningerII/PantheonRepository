const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectAccountModel } = require('../app/account-model.js');

const person = (id, type = 'mortal', parentIds = [], extra = {}) => ({ id, type, parentIds, ...extra });
const account = (id, parents, extra = {}) => ({ id, label: id,
  parents: parents.map(personId => ({ personId, kind: 'parent' })), sources: [{ reference: 'Source A' }], ...extra });
const graph = records => new Map(records.map(p => [p.id, p]));
const grouped = { lineageGroup: 'source-line', kind: 'claimed-genealogy' };

test('selected parents replace baseline ancestry in topology, classification and candidate powers', () => {
  const records = graph([
    person('N0', 'deity', [], { faculties: [{ id: 'faculty-a', inheritability: 'full' }] }),
    person('N1'), person('N2'), person('N3'),
    person('N4', 'mortal', ['N2', 'N3'], { parentageAccounts: [account('A0', ['N0', 'N1'])] }),
  ]);
  const model = projectAccountModel(records, { N4: 'A0' });
  assert.deepEqual(model.byId.get('N4').parentIds, ['N0', 'N1']);
  assert.deepEqual(model.childrenOf.get('N0'), ['N4']);
  assert.equal(model.childrenOf.has('N2'), false);
  assert.equal(model.divinityInfo('N4').fraction, .5);
  assert.equal(model.divinityInfo('N4').tier, 'demigod');
  assert.equal(model.inheritedPowers('N4')[0].facultyId, 'faculty-a');
  assert.deepEqual(records.get('N4').parentIds, ['N2', 'N3']);
  const reset = projectAccountModel(records, { N4: '' });
  assert.equal(reset.active, false);
  assert.deepEqual(reset.inheritedPowers('N4'), []);
});

test('one source selection follows only reachable matching accounts and explicit overrides win', () => {
  const records = graph([
    person('N0', 'deity'), person('N1'), person('N2'),
    person('N3', 'mortal', [], { parentageAccounts: [account('A0', ['N0', 'N1'], grouped)] }),
    person('N4', 'mortal', ['N2'], { parentageAccounts: [account('A1', ['N3', 'N1'], grouped)] }),
    person('N5', 'mortal', [], { parentageAccounts: [account('A2', ['N0'], grouped)] }),
  ]);
  const model = projectAccountModel(records, { N4: 'A1' });
  assert.deepEqual(model.selections, { N4: 'A1', N3: 'A0' });
  assert.equal(model.divinityInfo('N4').fraction, .25);
  assert.equal(model.divinityInfo('N4').tier, 'quartigod');
  assert.equal(model.divinityInfo('N4').claimed, true);
  assert.equal(model.accounts.has('N5'), false);
  for (const choices of [{ N4: 'A1', N3: '' }, { N3: '', N4: 'A1' }]) {
    const overridden = projectAccountModel(records, choices);
    assert.deepEqual(overridden.byId.get('N3').parentIds, []);
    assert.equal(overridden.divinityInfo('N4').fraction, 0);
  }
});

test('missing co-parents remain unknown while deep claimed divine ancestry survives', () => {
  const records = [person('N0', 'deity')];
  for (let n = 1; n <= 30; n++) records.push(person(`N${n}`, 'mortal', [], {
    parentageAccounts: [account('A0', [`N${n - 1}`], grouped)],
  }));
  const model = projectAccountModel(graph(records), { N30: 'A0' });
  const info = model.divinityInfo('N30');
  assert.equal(model.accounts.size, 30);
  assert.equal(info.fraction, null);
  assert.equal(info.tier, null);
  assert.equal(info.hasDivineAncestry, true);
  assert.equal(info.minimumFraction, 2 ** -30);
  assert.equal(info.maximumFraction, 1);
  assert.deepEqual(info.unresolvedReasons, ['unnamed-co-parent']);
  assert.equal(info.claimed, true);
});

test('a complete distant pedigree retains a nonzero scion classification without rounding away ancestry', () => {
  const records = [person('N0', 'deity'), person('M0')];
  for (let n = 1; n <= 30; n++) records.push(person(`N${n}`, 'mortal', [], {
    parentageAccounts: [account('A0', [`N${n - 1}`, 'M0'], grouped)],
  }));
  const info = projectAccountModel(graph(records), { N30: 'A0' }).divinityInfo('N30');
  assert.equal(info.fraction, 2 ** -30);
  assert.equal(info.tier, 'scion');
});

test('cycles and unresolved endpoints preserve uncertainty without losing a known divine path', () => {
  const records = graph([person('N0', 'deity'), person('N1', 'mortal', ['N2']),
    person('N2', 'mortal', ['N1']), person('N3', 'mortal', [], {
      parentageAccounts: [account('A0', ['N0', 'N2', 'MISSING'])],
    })]);
  const info = projectAccountModel(records, { N3: 'A0' }).divinityInfo('N3');
  assert.equal(info.fraction, null);
  assert.equal(info.hasDivineAncestry, true);
  assert.ok(info.unresolvedReasons.includes('cyclic-parentage'));
  assert.ok(info.unresolvedReasons.includes('unresolved-parent'));
});

test('uncreated, unknown and cultural associations do not import other genealogies', () => {
  const records = graph([person('N0', 'deity'), person('N1', null, [], {
    relations: [{ kind: 'equated-with', personId: 'N0' }, { kind: 'beloved-of', personId: 'N0' }],
    parentageAccounts: [account('A0', [])],
  })]);
  const info = projectAccountModel(records, { N1: 'A0' }).divinityInfo('N1');
  assert.equal(info.fraction, null);
  assert.equal(info.hasDivineAncestry, false);
  assert.deepEqual(info.unresolvedReasons, ['uncreated-fraction-unspecified']);
});

test('selected inheritance excludes removed ancestors, own faculties, nonheritable powers and expired candidates', () => {
  const records = graph([
    person('N0', 'deity', [], { faculties: [{ id: 'faculty-a', inheritability: 'full' }] }),
    person('N1', 'deity', [], { faculties: [
      { id: 'faculty-b', inheritability: 'partial' }, { id: 'faculty-c', inheritability: 'none' },
      { id: 'faculty-d', inheritability: 'full' },
    ] }),
    person('N2', 'mortal', ['N0'], { faculties: [{ id: 'faculty-d', inheritability: 'none' }],
      parentageAccounts: [account('A0', ['N1'], grouped)] }),
    person('N3', 'mortal', ['N2']), person('N4', 'mortal', ['N3']), person('N5', 'mortal', ['N4']),
  ]);
  const model = projectAccountModel(records, { N2: 'A0' });
  assert.deepEqual(model.inheritedPowers('N2').map(p => p.facultyId), ['faculty-b']);
  assert.equal(model.inheritedPowers('N3').find(p => p.facultyId === 'faculty-b').level, 'trace');
  assert.ok(model.inheritedPowers('N2')[0].claimed);
  assert.deepEqual(model.inheritedPowers('N5'), []);
});

test('later divine honors do not silently change parent status at conception', () => {
  const records = graph([
    person('N0', 'mortal', [], { tradition: 'T0', lifecycle: [
      { typeStatus: 'mortal', era: 'E0', eraOrdering: 0 },
      { typeStatus: 'deity', era: 'E1', eraOrdering: 2 },
    ] }), person('N1'),
    person('N2', 'mortal', [], { temporal: { era: 'E0' }, lifecycle: [{ era: 'E0', eraOrdering: 1 }],
      parentageAccounts: [account('A0', ['N0', 'N1'])] }),
    person('N3', 'mortal', [], { temporal: { era: 'E2' }, lifecycle: [{ era: 'E2', eraOrdering: 3 }],
      parentageAccounts: [account('A0', ['N0', 'N1'])] }),
    person('N4', 'mortal', [], { temporal: { era: 'E1' }, lifecycle: [{ era: 'E1', eraOrdering: 10 }],
      parentageAccounts: [account('A0', ['N0', 'N1'])] }),
  ]);
  const model = projectAccountModel(records, { N2: 'A0', N3: 'A0', N4: 'A0' }, { eraOrder: { T0: ['E0', 'E1', 'E2'] } });
  assert.equal(model.divinityInfo('N2').fraction, 0);
  assert.equal(model.divinityInfo('N3').fraction, .5);
  assert.equal(model.divinityInfo('N4').fraction, null);
  assert.ok(model.divinityInfo('N4').unresolvedReasons.includes('conception-status-uncertain'));
});

test('same-generation inherited candidates keep the strongest path independently of parent order', () => {
  for (const parents of [['N0', 'N1'], ['N1', 'N0']]) {
    const records = graph([
      person('N0', 'deity', [], { faculties: [{ id: 'faculty-a', inheritability: 'partial' }] }),
      person('N1', 'deity', [], { faculties: [{ id: 'faculty-a', inheritability: 'full' }] }),
      person('N2', 'mortal', [], { parentageAccounts: [account('A0', parents)] }),
    ]);
    const powers = projectAccountModel(records, { N2: 'A0' }).inheritedPowers('N2');
    assert.equal(powers.length, 1);
    assert.equal(powers[0].level, 'full');
    assert.equal(powers[0].fromAncestorId, 'N1');
  }
});

test('identifier renaming preserves selected topology and account arithmetic', () => {
  const records = [person('N0', 'deity'), person('N1'), person('N2', 'mortal', [], {
    parentageAccounts: [account('A0', ['N0', 'N1'], grouped)],
  })];
  const renamed = records.map(p => ({ ...p, id: `X${p.id}`,
    parentIds: p.parentIds.map(id => `X${id}`), parentageAccounts: p.parentageAccounts?.map(a => ({ ...a,
      parents: a.parents.map(r => ({ ...r, personId: `X${r.personId}` })),
    })),
  }));
  const a = projectAccountModel(graph(records), { N2: 'A0' });
  const b = projectAccountModel(graph(renamed), { XN2: 'A0' });
  assert.equal(a.divinityInfo('N2').fraction, b.divinityInfo('XN2').fraction);
  assert.equal(a.divinityInfo('N2').tier, b.divinityInfo('XN2').tier);
  assert.deepEqual(b.byId.get('XN2').parentIds.map(id => id.slice(1)), a.byId.get('N2').parentIds);
});

test('incompatible source groups remain visibly unresolved until their shared ancestor is explicitly selected', () => {
  const records = graph([
    person('N0', 'deity', [], { faculties: [{ id: 'faculty-a', inheritability: 'full' }] }), person('N1'),
    person('N2', 'mortal', [], { parentageAccounts: [account('A0', ['N0', 'N1'], grouped),
      account('A1', ['N1'], { lineageGroup: 'other-line' })] }),
    person('N3', 'mortal', [], { parentageAccounts: [account('A0', ['N2', 'N1'], grouped)] }),
    person('N4', 'mortal', [], { parentageAccounts: [account('A0', ['N2', 'N1'], { lineageGroup: 'other-line' })] }),
  ]);
  const model = projectAccountModel(records, { N3: 'A0', N4: 'A0' });
  assert.equal(model.conflicts.length, 1);
  assert.equal(model.conflicts[0].id, 'N2');
  assert.equal(model.divinityInfo('N3').fraction, null);
  assert.ok(model.divinityInfo('N3').unresolvedReasons.includes('conflicting-account-groups'));
  assert.deepEqual(model.inheritedPowers('N3'), []);
  const resolved = projectAccountModel(records, { N3: 'A0', N4: 'A0', N2: 'A0' });
  assert.deepEqual(resolved.conflicts, []);
  assert.equal(resolved.divinityInfo('N3').fraction, .25);
});

test('maps supplied across execution realms remain navigable', () => {
  const vm = require('node:vm');
  const records = vm.runInNewContext('new Map([["N0", {id:"N0",type:"deity",parentIds:[]}]])');
  assert.equal(projectAccountModel(records).divinityInfo('N0').fraction, 1);
});
