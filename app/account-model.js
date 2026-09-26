// A selected parentage account is a temporary projection, never a corpus edit.
// The same pure model drives the tree, descent, inheritance and static accounts.
(function (root) {
  'use strict';

  const DECAY = { full: ['full', 'diminished', 'trace'], partial: ['partial', 'trace'] };
  const POWER_RANK = { full: 0, partial: 1, diminished: 2, trace: 3 };
  const claimedAccount = a => a?.kind === 'claimed-genealogy';
  const idOf = entry => typeof entry === 'string' ? entry : entry?.id;
  const tierFor = fraction => fraction === 0 ? 'mortal' : fraction > .75 ? 'deity'
    : fraction >= .375 ? 'demigod' : fraction >= .1875 ? 'quartigod' : 'scion';

  function projectAccountModel(records, choices = {}, options = {}) {
    const source = records && typeof records.get === 'function' && typeof records.entries === 'function'
      ? records : new Map(Object.entries(records || {}));
    const byId = new Map(source), accounts = new Map(), selections = {}, conflicts = [];
    const explicit = new Set(Object.keys(choices));
    const expanded = new Set();

    function visit(id, inheritedGroup, path = new Set()) {
      if (path.has(id)) return;
      const person = source.get(id);
      if (!person) return;
      const ownChoice = explicit.has(id);
      const selected = ownChoice
        ? person.parentageAccounts?.find(a => a.id === choices[id])
        : person.parentageAccounts?.find(a => inheritedGroup && a.lineageGroup === inheritedGroup);
      const prior = accounts.get(id);
      if (prior && selected && prior.id !== selected.id && !ownChoice) {
        conflicts.push({ id, accountIds: [prior.id, selected.id] });
        return;
      }
      if (selected) {
        accounts.set(id, selected);
        selections[id] = selected.id;
        byId.set(id, { ...person, parentIds: [...new Set(selected.parents.map(p => p.personId))],
          parentRoles: Object.fromEntries(selected.parents.map(p => [p.personId, p.kind])) });
      } else if (ownChoice) {
        selections[id] = '';
      }
      const group = selected?.lineageGroup || (ownChoice ? null : inheritedGroup);
      const key = JSON.stringify([id, selected?.id || '', group || '']);
      if (expanded.has(key)) return;
      expanded.add(key);
      const nextPath = new Set(path); nextPath.add(id);
      for (const pid of byId.get(id).parentIds || []) visit(pid, group, nextPath);
    }
    // Explicit choices have priority regardless of traversal or property order.
    for (const id of Object.keys(choices).sort()) visit(id, null);
    const conflicted = new Set(conflicts.map(c => c.id));
    const childrenOf = new Map();
    for (const p of byId.values()) for (const pid of new Set(p.parentIds || [])) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid).push(p.id);
    }

    const unknown = (reason, claimed = false) => ({ minimumFraction: 0, maximumFraction: 1,
      fraction: null, hasDivineAncestry: false, claimed, unresolvedReasons: [reason] });
    const known = (value, basis, extra = {}) => ({ fraction: value, minimumFraction: value,
      maximumFraction: value, hasDivineAncestry: value > 0, claimed: false,
      unresolvedReasons: [], basis, ...extra });
    const eraOrder = options.eraOrder || root?.__PR?.ERA_ORDER || {};

    // Apply a change in status only when conception can be ordered against it.
    // A late cult/apotheosis phase must not silently become divine parentage.
    function conceptionStatus(parent, child) {
      const phases = (parent.lifecycle || []).filter(p => p.typeStatus);
      if (!phases.some(p => p.typeStatus !== parent.type)) return null;
      const eras = eraOrder[parent.tradition] || [];
      const childEra = child.temporal?.era || child.lifecycle?.[0]?.era;
      const childIndex = eras.indexOf(childEra);
      if (childIndex < 0 || phases.some(p => eras.indexOf(p.era) < 0)) return { uncertain: true };
      const sorted = phases.slice().sort((a, b) => eras.indexOf(a.era) - eras.indexOf(b.era)
        || (a.eraOrdering || 0) - (b.eraOrdering || 0));
      let type = parent.type;
      for (const phase of sorted) {
        const phaseIndex = eras.indexOf(phase.era);
        if (phaseIndex > childIndex) continue;
        // eraOrdering sequences one person's life; it is not a shared clock
        // with which to date a different person's conception within an era.
        if (phaseIndex === childIndex && phase.typeStatus !== type) return { uncertain: true };
        type = phase.typeStatus;
      }
      return { type };
    }

    const fractionCache = new Map();
    function walk(id, path = new Set(), forChild = null) {
      const p = byId.get(id), account = accounts.get(id);
      const isClaimed = claimedAccount(account);
      if (!p) return unknown('unresolved-parent');
      if (path.has(id)) return unknown('cyclic-parentage', isClaimed);
      if (conflicted.has(id)) return unknown('conflicting-account-groups', isClaimed);
      const cacheKey = JSON.stringify([id, forChild?.id || null]);
      if (fractionCache.has(cacheKey)) return fractionCache.get(cacheKey);
      let result;
      // Divine/numinous beings remain divine; mortal classification is a leaf
      // baseline, not a barrier that erases an explicitly selected genealogy.
      if (p.type === 'deity' || p.type === 'numen') {
        result = known(1, 'axiom-deity');
      } else {
        const parentIds = [...new Set(p.parentIds || [])];
        if (parentIds.length) {
          const next = new Set(path); next.add(id);
          const contributions = parentIds.map(pid => ({ id: pid, type: byId.get(pid)?.type || null,
            ...walk(pid, next, p) }));
          const denom = Math.max(2, parentIds.length);
          const missing = denom - parentIds.length;
          const minimumFraction = contributions.reduce((v, c) => v + c.minimumFraction, 0) / denom;
          const maximumFraction = (contributions.reduce((v, c) => v + c.maximumFraction, 0) + missing) / denom;
          const reasons = contributions.flatMap(c => c.unresolvedReasons);
          if (missing) reasons.push('unnamed-co-parent');
          result = { fraction: minimumFraction === maximumFraction ? minimumFraction : null,
            minimumFraction, maximumFraction, basis: 'genealogy', denom, contributions,
            hasDivineAncestry: contributions.some(c => c.hasDivineAncestry),
            claimed: isClaimed || contributions.some(c => c.claimed),
            unresolvedReasons: [...new Set(reasons)] };
        } else if (p.type === 'mortal') {
          result = known(0, 'type-baseline');
        } else if (p.type === 'demigod' || p.type === 'quartigod') {
          result = known(p.type === 'demigod' ? .5 : .25, 'type-fallback');
        } else if (p.type === 'scion') {
          result = { ...unknown('unquantified-divine-descent'), maximumFraction: .1875,
            hasDivineAncestry: true, basis: 'type-fallback' };
        } else {
          result = unknown(account?.parents.length === 0 ? 'uncreated-fraction-unspecified' : 'unknown-parentage');
        }
      }
      result.claimed ||= isClaimed;
      if (forChild) {
        const status = conceptionStatus(p, forChild);
        // An unchanged mortal phase must not reinstate the suppressed axiom.
        if (status?.type && status.type !== p.type && ['deity', 'numen', 'mortal'].includes(status.type)) {
          result = known(status.type === 'mortal' ? 0 : 1, 'conception-status', { claimed: result.claimed });
        } else if (status?.uncertain) {
          result = { ...result, fraction: null, minimumFraction: 0, maximumFraction: 1,
            unresolvedReasons: [...new Set([...result.unresolvedReasons, 'conception-status-uncertain'])] };
        }
      }
      if (!result.unresolvedReasons.includes('cyclic-parentage')) fractionCache.set(cacheKey, result);
      return result;
    }

    function divinityInfo(entry) {
      const id = idOf(entry), p = byId.get(id);
      if (!p) return null;
      const result = walk(id), account = accounts.get(id);
      const tier = result.fraction !== null ? (p.type === 'numen' ? 'numen' : tierFor(result.fraction)) : null;
      const ov = (p.variants || []).find(v => v.claim === 'divinityFraction' && typeof v.divinityFraction === 'number');
      return { contributions: [], denom: null, ...result, tier, authoredType: p.type || null,
        override: ov?.divinityFraction ?? null, accountLabel: account?.label || null,
        drift: tier && p.type && tier !== p.type ? { authored: p.type, computed: tier } : null };
    }

    function inheritedPowers(entry) {
      const id = idOf(entry), focus = byId.get(id);
      if (!focus) return [];
      const own = new Set((focus.faculties || []).map(f => f.id));
      const best = new Map(), seen = new Set([id]);
      let frontier = [{ id, claimed: claimedAccount(accounts.get(id)) }];
      // No candidate survives more than three generations under this model.
      for (let generation = 1; generation <= 3 && frontier.length; generation++) {
        const nextById = new Map();
        for (const node of frontier) for (const pid of byId.get(node.id)?.parentIds || []) {
          const parent = byId.get(pid);
          if (!parent || seen.has(pid) || conflicted.has(pid)) continue;
          const claimed = node.claimed || claimedAccount(accounts.get(pid));
          const prior = nextById.get(pid);
          nextById.set(pid, { id: pid, claimed: prior ? prior.claimed && claimed : claimed });
        }
        const next = [...nextById.values()];
        for (const { id: pid, claimed } of next) {
          seen.add(pid);
          const parent = byId.get(pid);
          for (const faculty of parent.faculties || []) {
            const level = DECAY[faculty.inheritability]?.[generation - 1];
            const prior = best.get(faculty.id);
            const wins = !prior || generation < prior.generation || (generation === prior.generation
              && (POWER_RANK[level] < POWER_RANK[prior.level]
                || (level === prior.level && pid.localeCompare(prior.fromAncestorId) < 0)));
            if (level && !own.has(faculty.id) && wins) {
              best.set(faculty.id, { facultyId: faculty.id, fromAncestorId: pid, generation, level, claimed });
            }
          }
        }
        frontier = next;
      }
      return [...best.values()].sort((a, b) => a.generation - b.generation || a.facultyId.localeCompare(b.facultyId));
    }

    function traditionMix(entry) {
      // Tradition is cultural attribution, not genetic ancestry. Keep its
      // presentation independent from an account's parentage arithmetic.
      const p = byId.get(idOf(entry));
      const tradition = p?.primaryTradition || p?.tradition;
      return tradition ? { [tradition]: 1 } : null;
    }

    return { byId, childrenOf, accounts, selections, conflicts, active: accounts.size > 0,
      divinityInfo, inheritedPowers, traditionMix };
  }

  if (root) root.projectAccountModel = projectAccountModel;
  if (typeof module !== 'undefined' && module.exports) module.exports = { projectAccountModel };
})(typeof window === 'undefined' ? null : window);
