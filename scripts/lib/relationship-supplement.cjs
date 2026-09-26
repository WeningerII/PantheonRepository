// Explicit, cited corpus edits. Identity links never imply parentage.
function applyRelationshipSupplement(peopleMap, patches) {
  const cited = value => Array.isArray(value.sources) && value.sources.length > 0 &&
    value.sources.every(s => s && typeof s.reference === 'string' && s.reference.trim());
  // Validate the entire batch before changing any record.
  for (const [id, patch] of Object.entries(patches)) {
    if (!peopleMap[id]) throw new Error(`Unknown relationship subject: ${id}`);
    if ((patch.classificationCorrections || []).length > 1) throw new Error(`Duplicate classification correction: ${id}`);
    for (const correction of patch.classificationCorrections || []) {
      if (!correction.id || !correction.reason || !cited(correction) ||
          !['deity','numen','demigod','quartigod','scion','mortal'].includes(correction.type))
        throw new Error(`Invalid classification correction: ${id}`);
      const old = (peopleMap[id].classificationCorrections || []).find(c => c.id === correction.id);
      if (old ? JSON.stringify(old.decision) !== JSON.stringify(correction) : peopleMap[id].type !== correction.expected)
        throw new Error(`Classification correction baseline changed: ${id}`);
    }
    if ((patch.parentageCorrections || []).length > 1) throw new Error(`Duplicate parentage correction: ${id}`);
    for (const correction of patch.parentageCorrections || []) {
      if (!correction.id || !correction.reason || !Array.isArray(correction.expected) ||
          !Array.isArray(correction.parents) || !cited(correction)) throw new Error(`Invalid parentage correction: ${id}`);
      const old = (peopleMap[id].parentageCorrections || []).find(c => c.id === correction.id);
      if (old ? JSON.stringify(old.decision) !== JSON.stringify(correction) :
          JSON.stringify([...(peopleMap[id].parentIds || [])].sort()) !== JSON.stringify([...correction.expected].sort()))
        throw new Error(`Parentage correction baseline changed: ${id}`);
      const targets = new Set();
      for (const p of correction.parents) {
        if (!peopleMap[p.personId] || p.personId === id || targets.has(p.personId) ||
            !['father','mother','parent'].includes(p.kind) || !cited(p)) throw new Error(`Invalid corrected parent: ${id}`);
        targets.add(p.personId);
      }
      if (targets.size > 2 || (patch.parents || []).length) throw new Error(`Conflicting corrected parents: ${id}`);
    }
    const revisions = new Set();
    for (const revision of patch.relationRevisions || []) {
      const key = JSON.stringify([revision.personId, revision.fromKind]);
      if (revisions.has(key) || !peopleMap[revision.personId] || revision.personId === id ||
          !revision.fromKind || !revision.kind || !revision.notes || !cited(revision) ||
          ['father', 'mother', 'parent'].includes(revision.fromKind) ||
          ['father', 'mother', 'parent'].includes(revision.kind))
        throw new Error(`Invalid relationship revision: ${id}`);
      revisions.add(key);
      const matches = (peopleMap[id].relations || []).filter(r => r.personId === revision.personId &&
        (r.kind === revision.fromKind || (r.kind === revision.kind &&
          (r.revisions || []).some(h => JSON.stringify(h.decision) === JSON.stringify(revision)))));
      if (matches.length !== 1) throw new Error(`Relationship revision baseline changed: ${id}`);
    }
    const parents = new Set(peopleMap[id].parentIds || []);
    for (const claim of [...(patch.parents || []), ...(patch.relations || [])]) {
      if (!peopleMap[claim.personId] || claim.personId === id || !claim.kind || !cited(claim))
        throw new Error(`Invalid or uncited relationship: ${id} -> ${claim.personId}`);
    }
    for (const claim of patch.parents || []) {
      if (!['father', 'mother', 'parent'].includes(claim.kind))
        throw new Error(`Invalid parent role: ${id}`);
      parents.add(claim.personId);
    }
    if (parents.size > 2 && (patch.parents || []).length)
      throw new Error(`Conflicting parentage requires a separate account: ${id}`);
    for (const variant of patch.variants || []) {
      if (!variant.id || !variant.claim || !variant.description || !cited(variant)) throw new Error(`Uncited variant: ${id}`);
      const old = (peopleMap[id].variants || []).find(v => v.id === variant.id);
      if (old && JSON.stringify(old) !== JSON.stringify(variant)) throw new Error(`Variant already differs: ${id}`);
    }
    const nameKeys = new Set();
    for (const link of patch.nameLinks || []) {
      const nameKey = JSON.stringify([link.value, link.tradition]);
      if (nameKeys.has(nameKey)) throw new Error(`Duplicate name target: ${id}`);
      nameKeys.add(nameKey);
      if (!link.value || !link.tradition || !cited(link) ||
          !['resolved', 'same-record', 'unresolved', 'disputed'].includes(link.status) ||
          (link.status === 'resolved' ? !link.personId : !['disputed'].includes(link.status) && !!link.personId) ||
          (link.personId && (!peopleMap[link.personId] || link.personId === id)))
        throw new Error(`Invalid name target: ${id}`);
      const old = (peopleMap[id].nameLinks || []).find(n => n.value === link.value && n.tradition === link.tradition);
      if (old && JSON.stringify(old) !== JSON.stringify(link)) throw new Error(`Name target already differs: ${id}`);
    }
    for (const d of patch.descriptions || []) {
      if (!d.text || !cited(d)) throw new Error(`Uncited description: ${id}`);
    }
    if ((patch.descriptions || []).length > 1) throw new Error(`Conflicting descriptions: ${id}`);
    const accountIds = new Set();
    const accountGroups = new Set();
    for (const account of patch.parentageAccounts || []) {
      if (!account.id || accountIds.has(account.id) || !account.label || !cited(account) || !Array.isArray(account.parents))
        throw new Error(`Invalid parentage account: ${id}`);
      accountIds.add(account.id);
      if (account.kind !== undefined && !['claimed-genealogy', 'biological'].includes(account.kind))
        throw new Error(`Invalid parentage account kind: ${id}`);
      if (account.lineageGroup !== undefined) {
        if (typeof account.lineageGroup !== 'string' || !account.lineageGroup.trim() ||
            accountGroups.has(account.lineageGroup) ||
            (peopleMap[id].parentageAccounts || []).some(a => a.id !== account.id && a.lineageGroup === account.lineageGroup))
          throw new Error(`Invalid or ambiguous lineage group: ${id}`);
        accountGroups.add(account.lineageGroup);
      }
      const parentIds = new Set();
      for (const parent of account.parents) {
        if (!peopleMap[parent.personId] || parent.personId === id || parentIds.has(parent.personId) ||
            !['father', 'mother', 'parent'].includes(parent.kind) || !cited(parent))
          throw new Error(`Invalid account parent: ${id}`);
        parentIds.add(parent.personId);
      }
      const old = (peopleMap[id].parentageAccounts || []).find(a => a.id === account.id);
      if (old && JSON.stringify(old) !== JSON.stringify(account)) throw new Error(`Parentage account already differs: ${id}`);
    }
    for (const resolution of patch.resolve || []) {
      if (!peopleMap[resolution.personId] || resolution.personId === id || !resolution.externalName || !resolution.tradition || !cited(resolution))
        throw new Error(`Invalid external reference resolution: ${id}`);
      if (!(peopleMap[id].relations || []).some(r =>
        (r.externalRef?.name === resolution.externalName && r.externalRef?.tradition === resolution.tradition) ||
        r.personId === resolution.personId)) throw new Error(`External reference changed: ${id}`);
    }
  }
  const addRelation = (p, claim) => {
    p.relations = p.relations || [];
    const old = p.relations.find(r => r.kind === claim.kind && r.personId === claim.personId);
    if (!old) p.relations.push(JSON.parse(JSON.stringify(claim)));
    else {
      old.sources = old.sources || [];
      for (const s of claim.sources) if (!old.sources.some(x => x.reference === s.reference && x.url === s.url))
        old.sources.push({ ...s });
    }
  };
  for (const [id, patch] of Object.entries(patches)) {
    const p = peopleMap[id];
    for (const correction of patch.classificationCorrections || []) {
      p.classificationCorrections ||= [];
      if (p.classificationCorrections.some(c => c.id === correction.id)) continue;
      p.classificationCorrections.push({id:correction.id, previous:p.type, decision:JSON.parse(JSON.stringify(correction))});
      p.type = correction.type;
      p.variants ||= [];
      p.variants.push({id:correction.id,claim:'classification correction',description:correction.reason,sources:JSON.parse(JSON.stringify(correction.sources))});
    }
    for (const correction of patch.parentageCorrections || []) {
      p.parentageCorrections ||= [];
      if (p.parentageCorrections.some(c => c.id === correction.id)) continue;
      p.parentageCorrections.push({id:correction.id,previous:{parentIds:[...(p.parentIds || [])],parentRoles:{...p.parentRoles},
        relations:JSON.parse(JSON.stringify((p.relations || []).filter(r => ['father','mother','parent'].includes(r.kind))))},decision:JSON.parse(JSON.stringify(correction))});
      p.parentIds = correction.parents.map(r => r.personId);
      p.parentRoles = Object.fromEntries(correction.parents.map(r => [r.personId,r.kind]));
      p.relations = (p.relations || []).filter(r => !['father','mother','parent'].includes(r.kind));
      for (const parent of correction.parents) addRelation(p,parent);
      p.variants ||= [];
      p.variants.push({id:correction.id,claim:'parentage correction',description:correction.reason,sources:JSON.parse(JSON.stringify(correction.sources))});
    }
    for (const revision of patch.relationRevisions || []) {
      const r = (p.relations || []).find(r => r.personId === revision.personId && r.kind === revision.fromKind);
      if (!r || (r.revisions || []).some(h => JSON.stringify(h.decision) === JSON.stringify(revision))) continue;
      const previous = JSON.parse(JSON.stringify(r));
      delete previous.revisions;
      r.revisions = [...(r.revisions || []), { previous, decision: JSON.parse(JSON.stringify(revision)) }];
      r.kind = revision.kind;
      r.notes = revision.notes;
      r.sources = [...(r.sources || [])];
      for (const source of revision.sources) if (!r.sources.some(s => JSON.stringify(s) === JSON.stringify(source)))
        r.sources.push(JSON.parse(JSON.stringify(source)));
    }
    for (const claim of patch.parents || []) {
      p.parentIds = p.parentIds || [];
      if (!p.parentIds.includes(claim.personId)) p.parentIds.push(claim.personId);
      p.parentRoles = { ...p.parentRoles, [claim.personId]: claim.kind };
      addRelation(p, claim);
    }
    for (const claim of patch.relations || []) addRelation(p, claim);
    for (const variant of patch.variants || []) {
      p.variants = p.variants || [];
      if (!p.variants.some(v => v.id === variant.id)) p.variants.push(JSON.parse(JSON.stringify(variant)));
    }
    for (const d of patch.descriptions || []) {
      p.notes = d.text;
      p.sources = p.sources || [];
      if (!p.sources.some(s => s.claim === d.text)) p.sources.push({ claim: d.text, citations: JSON.parse(JSON.stringify(d.sources)), weight: d.sources.every(s => s.kind === 'primary') ? 'primary' : 'secondary' });
    }
    for (const key of ['nameLinks', 'parentageAccounts']) for (const value of patch[key] || []) {
      p[key] = p[key] || [];
      const exists = p[key].some(old => key === 'nameLinks'
        ? old.value === value.value && old.tradition === value.tradition : old.id === value.id);
      if (!exists) p[key].push(JSON.parse(JSON.stringify(value)));
    }
    for (const resolution of patch.resolve || []) {
      for (const r of p.relations || []) {
        if (r.externalRef?.name !== resolution.externalName || r.externalRef?.tradition !== resolution.tradition) continue;
        r.personId = resolution.personId;
        delete r.externalRef;
        r.sources = [...(r.sources || []), ...resolution.sources];
      }
    }
  }
  return peopleMap;
}
module.exports = { applyRelationshipSupplement };
