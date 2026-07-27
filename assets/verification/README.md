# Site-verification files

Anything in this directory is copied verbatim to the **root of the deployed
site** by `scripts/build-static.cjs`.

## Why this exists

`.github/workflows/deploy-pages.yml` assembles the published site with:

```
rm -rf _site && mkdir -p _site
cp -R dist/site/. _site/
```

The site is rebuilt from scratch on every deploy, from the build output only.
A file uploaded to the site root by hand — which is what Google Search
Console's "HTML file" verification method asks you to do — therefore survives
exactly until the next push to `main`, at which point ownership verification
silently turns off. This directory is how such a file survives, the same way
the `CNAME` line in that workflow re-asserts the custom domain every time.

## Adding another

Drop the file in. No code change needed. Then re-deploy before pressing
verify, because the file has to be reachable at the site root first.

## Current contents

- `google4270b18d7933f3cd.html` — Google Search Console, URL-prefix property
  `https://www.listofgods.com/`. Google fetches
  `https://www.listofgods.com/google4270b18d7933f3cd.html` and expects the
  single line `google-site-verification: <filename>`.
  **Do not delete it after verification succeeds** — Google re-checks
  periodically and will un-verify the property if it disappears.
