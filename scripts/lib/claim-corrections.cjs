// Final-pass, exact-precondition corrections. Authoring data, never identity heuristics.
function applyClaimCorrections(peopleMap, batches) {
  const allowed = new Set(['name','names','notes','parentIds','parentRoles','relations','faculties','materialCulture','iconography','cult','linguistic','lifecycle','domains','epithets','nameLinks','parentageAccounts']);
  const clone = x => JSON.parse(JSON.stringify(x));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const cited = x => Array.isArray(x.sources) && x.sources.length && x.sources.every(s => typeof s?.reference === 'string' && s.reference.trim());
  const staged = {};
  for (const [id, corrections] of Object.entries(batches)) {
    if (!peopleMap[id] || !Array.isArray(corrections)) throw new Error(`Unknown correction subject or invalid batch: ${id}`);
    const p = staged[id] = clone(peopleMap[id]);
    const seen = new Set();
    for (const c of corrections) {
      if (!c.id || seen.has(c.id) || !c.reason || !cited(c) || !Array.isArray(c.path) ||
          !allowed.has(c.path[0]) || !['replace','remove'].includes(c.op) ||
          !Object.prototype.hasOwnProperty.call(c,'expected') ||
          (c.op === 'replace' && !Object.prototype.hasOwnProperty.call(c,'value')) ||
          c.path.some(k => ['__proto__','prototype','constructor'].includes(k) || !(typeof k === 'string' || Number.isInteger(k))))
        throw new Error(`Invalid claim correction: ${id}`);
      seen.add(c.id);
      const prior = (p.corrections || []).find(h => h.id === c.id);
      if (prior) {
        if (!equal(prior.decision,c)) throw new Error(`Correction ID already differs: ${id} ${c.id}`);
        continue;
      }
      let container = p;
      for (const key of c.path.slice(0,-1)) {
        if (!container || typeof container !== 'object' || !Object.prototype.hasOwnProperty.call(container,key))
          throw new Error(`Correction path absent: ${id} ${c.id}`);
        container = container[key];
      }
      const key = c.path[c.path.length-1];
      if (!container || typeof container !== 'object' || !Object.prototype.hasOwnProperty.call(container,key) ||
          (Array.isArray(container) && (!Number.isInteger(key) || key < 0)) || !equal(container[key],c.expected))
        throw new Error(`Correction baseline changed: ${id} ${c.id}`);
      p.corrections ||= [];
      p.corrections.push({id:c.id,previous:clone(container[key]),decision:clone(c)});
      if (c.op === 'replace') container[key] = clone(c.value);
      else if (Array.isArray(container)) container.splice(key,1);
      else delete container[key];
      p.variants ||= [];
      p.variants.push({id:`correction:${c.id}`,claim:'source review correction',description:c.reason,sources:clone(c.sources)});
    }
    // Validate graph-bearing fields after the complete authored sequence.
    if (!Array.isArray(p.parentIds) || new Set(p.parentIds).size !== p.parentIds.length || p.parentIds.some(i => !peopleMap[i] || i === id))
      throw new Error(`Invalid corrected parentage: ${id}`);
    if (!p.name || typeof p.name.primary !== 'string' || !p.name.primary.trim()) throw new Error(`Invalid corrected name: ${id}`);
    for (const r of p.relations || []) if (r.personId && (!peopleMap[r.personId] || r.personId === id)) throw new Error(`Invalid corrected relation: ${id}`);
    for (const n of p.nameLinks || []) if (n.personId && (!peopleMap[n.personId] || n.personId === id)) throw new Error(`Invalid corrected name target: ${id}`);
    for (const a of p.parentageAccounts || []) for (const r of a.parents || []) if (!peopleMap[r.personId] || r.personId === id) throw new Error(`Invalid corrected account target: ${id}`);
  }
  // No original record changes until every subject and operation has passed.
  for (const [id,p] of Object.entries(staged)) peopleMap[id] = p;
  return peopleMap;
}
module.exports = {applyClaimCorrections};
