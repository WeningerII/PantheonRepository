/*
 * wiki-http.cjs — the one HTTP client for every Wikimedia call (Commons API,
 * Wikidata API, file downloads). Shared by scripts/ingest-images.cjs and
 * scripts/lib/wikidata.cjs so the etiquette rules live in exactly one place:
 * a descriptive, contactable User-Agent (mandatory — the APIs 403 without
 * one), serial-friendly 429 backoff honoring Retry-After, bounded redirects,
 * and a hard timeout. Runs only in CI — the dev sandbox has no network route
 * to Wikimedia.
 */
'use strict';
const https = require('https');

const UA = 'ListOfGods-ImageIngest/1.0 (https://listofgods.com; weningerii@gmail.com) node-https';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// `extra` adds per-host request headers. Some approved sources require their
// own identifying header and reject anonymous clients outright — the Art
// Institute of Chicago's IIIF image server answers 403 without AIC-User-Agent,
// which silently failed every AIC image download in the first museum ingest.
function get(url, as, redirects = 0, retries429 = 0, extra = null) {
  return new Promise((resolve, reject) => {
    const hdrs = Object.assign({ 'User-Agent': UA, 'Api-User-Agent': UA, 'Accept-Encoding': 'identity' }, extra || {});
    const req = https.get(url, { headers: hdrs }, (res) => {
      const { statusCode, headers } = res;
      if (statusCode === 429) {
        // Bounded: a persistently rate-limited host must surface as an error
        // the caller can degrade on (one stalled source must not stall a
        // whole sweep shard into its job timeout).
        if (retries429 >= 4) { res.resume(); return reject(new Error(`HTTP 429 (giving up after ${retries429} retries) for ${url}`)); }
        const wait = (parseInt(headers['retry-after'], 10) || 5) * 1000;
        res.resume();
        return sleep(wait).then(() => get(url, as, redirects, retries429 + 1, extra).then(resolve, reject));
      }
      if (statusCode >= 300 && statusCode < 400 && headers.location && redirects < 5) {
        res.resume();
        const next = new URL(headers.location, url).toString();
        return get(next, as, redirects + 1, retries429, extra).then(resolve, reject);
      }
      if (statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${statusCode} for ${url}`)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (as === 'buffer') return resolve({ buf, contentType: headers['content-type'] || '' });
        try { resolve(JSON.parse(buf.toString('utf8'))); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout ' + url)));
  });
}
const getJSON = (url, extra = null) => get(url, 'json', 0, 0, extra);

module.exports = { get, getJSON, sleep, UA };
