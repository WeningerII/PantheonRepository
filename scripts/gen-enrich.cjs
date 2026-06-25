#!/usr/bin/env node
/*
 * Build the ENRICH_SWEEP block in app/data.js from the corpus-enrichment
 * agents' patch files in data-sources/enrichments/*.json. Each patch is:
 *   { faculties:{id:[...]}, materialCulture:{id:[...]}, domains:{id:[...]},
 *     epithets:{id:[...]}, cult:{id:[...]}, iconography:{id:{attributes,...}} }
 * listing ONLY the new detail-data to add to existing figures. We union them
 * (dedup by the field's natural key) into six id-keyed maps that the seed
 * pipeline merges onto figures via the SAME appliers the hand-maintained
 * supplements use (applyFacultySupplement, mergeMaterialCulture, applyEpithets,
 * applyCult, applyIconography, applyDomainSupplement) — so enrichment flows into
 * detail pages, the powers/items registries, and the tests automatically, and
 * dedups against anything already present. Additive only; no figure is created
 * and no tier/era/relation is touched. Idempotent. Run: node scripts/gen-enrich.cjs
 */
const fs = require('fs');
const path = require('path');
const EDIR = path.join(__dirname, '..', 'data-sources', 'enrichments');
const DATA = path.join(__dirname, '..', 'app', 'data.js');

const maps = { FACULTY_SWEEP: {}, MATERIAL_SWEEP: {}, DOMAIN_SWEEP: {}, EPITHET_SWEEP: {}, CULT_SWEEP: {}, ICONO_SWEEP: {} };
// patch field -> [map name, dedup key]
const LIST = {
  faculties: ['FACULTY_SWEEP', 'id'],
  materialCulture: ['MATERIAL_SWEEP', 'id'],
  domains: ['DOMAIN_SWEEP', 'sphereId'],
  epithets: ['EPITHET_SWEEP', 'original'],
  cult: ['CULT_SWEEP', 'name'],
};

const files = fs.existsSync(EDIR) ? fs.readdirSync(EDIR).filter((f) => f.endsWith('.json')).sort() : [];
let patchCount = 0, badCount = 0;
for (const f of files) {
  let patch;
  try { patch = JSON.parse(fs.readFileSync(path.join(EDIR, f), 'utf8')); } catch (e) { console.log('  ! skip unparseable', f, '-', e.message); badCount++; continue; }
  patchCount++;
  for (const [pf, [mapName, key]] of Object.entries(LIST)) {
    const sub = patch[pf] || {};
    for (const [id, list] of Object.entries(sub)) {
      if (!Array.isArray(list) || !list.length) continue;
      const tgt = (maps[mapName][id] = maps[mapName][id] || []);
      const seen = new Set(tgt.map((x) => x && x[key]));
      for (const it of list) { if (it && it[key] != null && !seen.has(it[key])) { tgt.push(it); seen.add(it[key]); } }
    }
  }
  // iconography is an object per figure with array sections; merge section-wise (dedup by id)
  const ico = patch.iconography || {};
  for (const [id, obj] of Object.entries(ico)) {
    if (!obj || typeof obj !== 'object') continue;
    const tgt = (maps.ICONO_SWEEP[id] = maps.ICONO_SWEEP[id] || {});
    for (const sec of ['attributes', 'sacredAnimals', 'sacredPlants', 'epithetForms', 'colors', 'numbers']) {
      if (!Array.isArray(obj[sec])) continue;
      tgt[sec] = tgt[sec] || [];
      const seen = new Set(tgt[sec].map((x) => x && x.id));
      for (const it of obj[sec]) { if (it && (!it.id || !seen.has(it.id))) { tgt[sec].push(it); if (it.id) seen.add(it.id); } }
    }
  }
}

let block = '/* ENRICH_SWEEP_START */\n';
for (const [name, obj] of Object.entries(maps)) block += `const ${name} = ${JSON.stringify(obj, null, 1)};\n`;
block += '/* ENRICH_SWEEP_END */';

let src = fs.readFileSync(DATA, 'utf8');
if (!/\/\* ENRICH_SWEEP_START \*\/[\s\S]*?\/\* ENRICH_SWEEP_END \*\//.test(src)) {
  console.error('ENRICH_SWEEP sentinel not found in app/data.js — wire it before SEED_PIPELINE first.');
  process.exit(1);
}
src = src.replace(/\/\* ENRICH_SWEEP_START \*\/[\s\S]*?\/\* ENRICH_SWEEP_END \*\//, block);
fs.writeFileSync(DATA, src);

const counts = Object.fromEntries(Object.entries(maps).map(([k, v]) => {
  const figs = Object.keys(v).length;
  const items = Object.values(v).reduce((n, e) => n + (Array.isArray(e) ? e.length : Object.values(e).reduce((a, s) => a + (Array.isArray(s) ? s.length : 0), 0)), 0);
  return [k, `${figs} figs / ${items} entries`];
}));
console.log(`patches: ${patchCount} (${badCount} bad) | enrichment:`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(16)} ${v}`);
