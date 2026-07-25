/*
 * commons-license.cjs — the PD/CC0 license gate for Wikimedia Commons images.
 *
 * Enforces the owner-set HARD RULE (docs/image-licensing.md, CLAUDE.md): the
 * ONLY acceptable licenses are Public Domain / PD-old / PD-art / CC0. Every
 * attribution- or share-alike-encumbered license (CC BY, CC BY-SA, GFDL) and
 * every non-free / NC / ND / unknown case is REJECTED. Trademark / personality
 * / freedom-of-panorama flags (the `Restrictions` field) reject even a
 * PD-licensed file — a copyright-clean tag does not clear those rights.
 *
 * Pure and side-effect-free: takes the `extmetadata` object from the Commons
 * imageinfo API and returns a verdict. Unit-tested in test/commons-license.test.cjs
 * against captured real-response shapes. Shared by scripts/ingest-images.cjs
 * (the fetch pipeline) so the gate has exactly one implementation.
 */
'use strict';

// extmetadata values are { value, source, hidden? }; value is often an HTML
// string (Artist can carry <a> tags). Read the raw value defensively.
const field = (ext, key) => {
  const f = ext && ext[key];
  if (f == null) return null;
  const v = typeof f === 'object' ? f.value : f;
  return v == null ? null : String(v);
};

// Strip HTML to plain text for display fields (Artist/Credit are HTML).
//
// Commons templates routinely carry a VISUALLY HIDDEN duplicate of the same
// text for i18n/machine consumption, e.g.
//   <a ...>Unknown author</a><span style="display:none">Unknown author</span>
// Blindly stripping tags concatenated both copies, which is how 101 shipped
// credits read "Unknown authorUnknown author" on the page. Drop hidden nodes
// first, then collapse an exact doubling as a backstop for the variants that
// hide themselves some other way.
const dropHidden = (html) => String(html)
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  // any element whose style hides it, plus its content
  .replace(/<([a-z][a-z0-9]*)\b[^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '');

const collapseDoubled = (s) => {
  const t = s.trim();
  if (t.length < 4 || t.length % 2) return t;
  const h = t.length / 2;
  return t.slice(0, h) === t.slice(h) ? t.slice(0, h) : t;
};

const htmlToText = (html) => {
  if (!html) return null;
  const t = dropHidden(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return collapseDoubled(t) || null;
};
// First href in an HTML fragment (e.g. the author's Commons user page).
const firstHref = (html) => {
  if (!html) return null;
  const m = String(html).match(/href\s*=\s*["']([^"']+)["']/i);
  if (!m) return null;
  let u = m[1];
  if (u.startsWith('//')) u = 'https:' + u;
  else if (u.startsWith('/w/') || u.startsWith('/wiki/')) u = 'https://commons.wikimedia.org' + u;
  return /^https?:\/\//.test(u) ? u : null;
};

// A license machine-key (extmetadata.License, e.g. "pd", "cc-zero",
// "cc-by-sa-4.0") is ACCEPTED iff it is public-domain or CC0. Anything with a
// BY / SA / GFDL / NC / ND token, or an unrecognized non-empty key, is out.
const ACCEPT_KEY = /^(cc0|cc-zero|pd|pd-.*|public\s*domain)$/i;
const REJECT_TOKEN = /\b(by|sa|nc|nd|gfdl|fal|ogl|attribution|share|noncommercial|nonfree|non-free|fairuse|fair-use)\b/i;

/**
 * Classify a Commons file from its imageinfo extmetadata.
 * @param {object} ext  imageinfo[0].extmetadata
 * @returns {{accept:boolean, reason:string, license:{key,shortName,url}|null,
 *            author:string|null, authorUrl:string|null, credit:string|null,
 *            restrictions:string|null}}
 */
function classify(ext) {
  ext = ext || {};
  const rawKey = (field(ext, 'License') || '').trim().toLowerCase();
  const shortName = field(ext, 'LicenseShortName');
  const url = field(ext, 'LicenseUrl');
  const copyrighted = (field(ext, 'Copyrighted') || '').trim().toLowerCase(); // "True"/"False"
  const restrictions = (field(ext, 'Restrictions') || '').trim();
  const usage = (field(ext, 'UsageTerms') || '').toLowerCase();
  const author = htmlToText(field(ext, 'Artist'));
  const authorUrl = firstHref(field(ext, 'Artist'));
  const credit = htmlToText(field(ext, 'Credit'));

  const license = { key: rawKey || null, shortName: shortName || null, url: url || null };
  const base = { license, author, authorUrl, credit, restrictions: restrictions || null };

  // 1) Non-copyright restrictions (trademark / personality / FoP) veto EVERYTHING,
  //    even a public-domain file. A copyright license never clears these rights.
  if (restrictions) {
    return { accept: false, reason: `restrictions present: ${restrictions}`, ...base };
  }

  // 2) Explicit public-domain signal: Copyrighted=False is how Commons marks PD.
  const pdByFlag = copyrighted === 'false';

  // 3) Machine-key gate. Accept pd*/cc0; reject anything carrying a BY/SA/GFDL/NC/ND
  //    token; reject unknown non-empty keys.
  if (rawKey) {
    if (REJECT_TOKEN.test(rawKey)) {
      return { accept: false, reason: `encumbered license: ${rawKey}`, ...base };
    }
    if (ACCEPT_KEY.test(rawKey)) {
      return { accept: true, reason: `public-domain/CC0 license: ${rawKey}`, ...base };
    }
    // Unknown key but the PD flag is set — accept on the flag (e.g. some PD
    // templates emit an idiosyncratic key). Otherwise reject: unknown = unsafe.
    if (pdByFlag) return { accept: true, reason: `PD flag with unrecognized key: ${rawKey}`, ...base };
    return { accept: false, reason: `unrecognized/ungated license key: ${rawKey}`, ...base };
  }

  // 4) No machine key. Accept only if the PD flag is set, OR UsageTerms plainly
  //    says public domain / CC0 (and carries no encumbrance token).
  if (pdByFlag && !REJECT_TOKEN.test(usage)) {
    return { accept: true, reason: 'Copyrighted=False (public domain)', ...base };
  }
  if (/public domain|\bcc0\b|creative commons zero/.test(usage) && !REJECT_TOKEN.test(usage)) {
    return { accept: true, reason: `public-domain usage terms: ${usage.slice(0, 40)}`, ...base };
  }

  return { accept: false, reason: 'no license key and no public-domain signal', ...base };
}

module.exports = { classify, htmlToText, firstHref, field };
