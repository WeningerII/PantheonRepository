// Explicit, cited corpus edits. Identity links never imply parentage.
function applyRelationshipSupplement(peopleMap, patches) {
  const cited = value => Array.isArray(value.sources) && value.sources.length > 0 &&
    value.sources.every(s => s && typeof s.reference === 'string' && s.reference.trim());
  // Validate the entire batch before changing any record.
  for (const [id, patch] of Object.entries(patches)) {
    if (!peopleMap[id]) throw new Error(`Unknown relationship subject: ${id}`);
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
