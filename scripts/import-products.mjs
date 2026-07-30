#!/usr/bin/env node
/**
 * Product importer from jusuaugintinis.lt
 * Run: node --env-file=.env.local scripts/import-products.mjs
 */

import { createClient } from '@supabase/supabase-js';

const BASE = 'https://www.jusuaugintinis.lt';
const DELAY_MS = 400; // polite crawl delay

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Category sources ──────────────────────────────────────────────────────
const SOURCES = [
  // Dog food
  { url: `${BASE}/index.php?route=product/category&path=213_69`,  cat: 'dog-food' }, // High Premium
  { url: `${BASE}/index.php?route=product/category&path=213_205`, cat: 'dog-food' }, // High Premium Plus
  { url: `${BASE}/index.php?route=product/category&path=213_206`, cat: 'dog-food' }, // Ultra Premium
  { url: `${BASE}/index.php?route=product/category&path=213_207`, cat: 'dog-food' }, // Bio Line
  { url: `${BASE}/index.php?route=product/category&path=213_208`, cat: 'dog-food' }, // Premium
  { url: `${BASE}/index.php?route=product/category&path=213_260`, cat: 'dog-food' }, // Baked
  { url: `${BASE}/index.php?route=product/category&path=213_268`, cat: 'dog-food' }, // BEMO no poultry

  // Cat food – dry (Sanabelle subcategories)
  { url: `${BASE}/kaciu-maistas/kitten`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/bosch-sanabelle-adult-poultry-high-premium-jusuaugintinis`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/sensitive`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/kastruotiems-sterilizuotiems-virsvoris-bosch-sanabelle-dakona-jusuaugintinis`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/sanabelle-sterilized-kastruotoms-katems-inkstai-akmenys-spec-dakona-jusuaugintinis`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/hair-skin-oda-kailis-sanabelle-bosch-jusuaugintinis-dakona`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/grande-veisles-dideliu-sanabelle-bosch-jusuaugintinis-dakona-meino-meskenai`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/urinary-sanabelle-bosch-jusuaugintinis-dakona`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/dental-dantys-sanabelle-bosch-jusuaugintinis-dakona`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/no-grain-be-grudis`, cat: 'cat-food' },
  { url: `${BASE}/kaciu-maistas/sanabelle-senior-bosch-senoms-matems-dakona-jususaugintinis-paguvenusioms-senyvoms`, cat: 'cat-food' },
  { url: `${BASE}/index.php?route=product/category&path=215_256`, cat: 'cat-food' }, // Indoor
  { url: `${BASE}/index.php?route=product/category&path=215_257`, cat: 'cat-food' }, // Outdoor

  // Cat food – wet
  { url: `${BASE}/katinukams/bosch-sanabelle-delicious-line`, cat: 'cat-food' },

  // Misc
  { url: `${BASE}/katinukams/kraikai`, cat: 'misc' },
  { url: `${BASE}/katinukams/rinkiniai-rinkinys-dovana-dovana-katems-jusuaugintinis`, cat: 'misc' },
  { url: `${BASE}/sunimsirkatems`, cat: 'misc' }, // supplements (4 pages)
  { url: `${BASE}/high-premium-skanestai-katems-sunims-super-premium-bosch`, cat: 'misc' }, // treats
  { url: `${BASE}/konservai-aukšta-kokybė-šunims-katėms-augintiniams`, cat: 'misc' }, // wet dog food
];

// ─── Lithuanian → English name translation ────────────────────────────────
const TRANSLATIONS = [
  ['DOVANŲ!', '(bonus)'], ['Dovanų!', '(bonus)'], ['dovanų', '(bonus)'],
  ['Rinkinys', 'Bundle'], ['rinkinys', 'bundle'],
  ['su šerniena', 'with boar'],
  ['su paukštiena', 'with poultry'],
  ['su vištiena', 'with chicken'],
  ['su jautiena', 'with beef'],
  ['su antim', 'with duck'],
  ['su lašiša', 'with salmon'],
  ['su triušiena', 'with rabbit'],
  ['su žvėriena', 'with venison'],
  ['su ėriena', 'with lamb'],
  ['be paukštienos', 'without poultry'],
  ['šlapias ėdalas', 'wet food'],
  ['sausainiai', 'biscuits'],
  ['skanėstai', 'treats'],
  ['papildoma apsauga', 'extra protection'],
  ['apsauga nuo erkių', 'tick protection'],
  ['nuo erkių', 'against ticks'],
  ['purškalas', 'spray'],
  ['vitaminai', 'vitamins'],
  ['multivitaminai', 'multivitamins'],
  ['kraikai', 'litter'], ['kraikas', 'litter'],
  ['katėms', 'for cats'], ['šunims', 'for dogs'],
];

function toEnglish(name) {
  let s = name;
  for (const [lt, en] of TRANSLATIONS) s = s.split(lt).join(en);
  return s.trim();
}

function slugify(text) {
  const map = { č:'c',š:'s',ž:'z',ę:'e',ė:'e',į:'i',ū:'u',ą:'a',Č:'c',Š:'s',Ž:'z',Ę:'e',Ė:'e',Į:'i',Ū:'u',Ą:'a' };
  return text
    .replace(/[čšžęėįūąČŠŽĘĖĮŪĄ]/g, c => map[c] || c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; product-importer/1.0)',
      'Accept-Language': 'lt-LT,lt;q=0.9,en;q=0.5',
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ─── Extract product URLs from a category listing page ────────────────────
// OpenCart wraps products in .product-layout or .product-thumb divs.
// Every product image and title link point to the same product URL.
// We grab all internal non-category hrefs and filter by known patterns.
const EXCLUDE_PATTERNS = [
  '/index.php', '/katinukams', '/kaciu-maistas', '/sunimsirkatems',
  '/high-premium-skanestai', '/konservai', '/Akcijos', '/kraikas',
  '/apie-mus', '/atsiskaitymas', '/privatumo-politika', '/kontaktai',
  '/sitemap', '/wishlist', '/login', '/register', '/cart', '/checkout',
  'route=account', 'route=checkout', 'route=information', 'route=product/category',
  'route=product/search', 'route=product/special',
];

function extractProductUrls(html) {
  const urls = new Set();
  const re = /href="(https:\/\/www\.jusuaugintinis\.lt\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (!EXCLUDE_PATTERNS.some(p => u.includes(p)) && u !== BASE && u !== BASE + '/') {
      urls.add(u);
    }
  }
  return [...urls];
}

// ─── Parse a product detail page ─────────────────────────────────────────
function parseProductPage(html) {
  // Name
  const nameM = html.match(/<h1[^>]*>\s*([^<]{2,}?)\s*<\/h1>/);
  if (!nameM) return null;
  const name = nameM[1].replace(/&amp;/g, '&').replace(/&#[0-9]+;/g, '').trim();
  if (!name || name.length < 2) return null;

  // Price – prefer "price-new" (sale), fall back to any €XX.XX near the product panel
  const pricePatterns = [
    /class="price-new[^"]*"[^>]*>[\s\S]{0,30}?(\d[\d\s]*[.,]\d{2})/,
    /class="price[^"]*"[^>]*>[\s\S]{0,50}?(\d[\d\s]*[.,]\d{2})/,
    /id="product-price[^"]*"[^>]*>[\s\S]{0,50}?(\d[\d\s]*[.,]\d{2})/,
    /€\s*(\d[\d\s]*[.,]\d{2})/,
  ];
  let price = 0;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { price = parseFloat(m[1].replace(/\s/g, '').replace(',', '.')); break; }
  }
  if (!price) return null;

  // Best-quality image (500x500 → 458x458 → 180x210 → any cache image)
  const imgPatterns = [
    /src="([^"]*image\/cache\/[^"]*-500x500[^"]*)"/,
    /src="([^"]*image\/cache\/[^"]*-458x458[^"]*)"/,
    /src="([^"]*image\/cache\/[^"]*-180x210[^"]*)"/,
    /src="([^"]*image\/cache\/catalog\/[^"]+\.(jpg|jpeg|png|gif))"/i,
  ];
  let imageUrl = null;
  for (const p of imgPatterns) {
    const m = html.match(p);
    if (m) { imageUrl = m[1]; break; }
  }
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = BASE + '/' + imageUrl.replace(/^\//, '');
  }

  // Description – OpenCart puts it in #tab-description
  const descM = html.match(/id="tab-description"[^>]*>([\s\S]*?)(?=<\/div>\s*<\/div>|id="tab-review|id="tab-specification)/);
  let description = '';
  if (descM) {
    description = descM[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return { name, price, imageUrl, description };
}

// ─── Upload image to Supabase storage ────────────────────────────────────
async function uploadImage(url, slug) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const rawExt = (url.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const mime = { png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] ?? 'image/jpeg';
    const path = `imported/${slug}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(path, buf, { contentType: mime, upsert: true });
    if (upErr) { console.error(`    ✗ image upload: ${upErr.message}`); return null; }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error(`    ✗ image fetch: ${e.message}`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  // Load category IDs
  const { data: cats, error: catErr } = await supabase.from('categories').select('id, slug');
  if (catErr) { console.error('Failed to load categories:', catErr.message); process.exit(1); }
  const catId = Object.fromEntries(cats.map(c => [c.slug, c.id]));
  console.log('✅ Categories loaded:', Object.keys(catId).join(', '));

  const seenUrls = new Set();
  let inserted = 0, skipped = 0, failed = 0;

  for (const source of SOURCES) {
    console.log(`\n📂 ${source.cat.toUpperCase()} ← ${source.url}`);

    for (let page = 1; page <= 20; page++) {
      const sep = source.url.includes('?') ? '&' : '?';
      const pageUrl = page === 1 ? source.url : `${source.url}${sep}page=${page}`;

      let catHtml;
      try { catHtml = await fetchHtml(pageUrl); }
      catch (e) { console.error(`  ✗ category page: ${e.message}`); break; }

      const productUrls = extractProductUrls(catHtml).filter(u => !seenUrls.has(u));
      console.log(`  Page ${page}: ${productUrls.length} new product links`);

      if (productUrls.length === 0) break;

      // Check if there really is a next page (Lithuanian pagination text)
      const hasNextPage = catHtml.includes(`page=${page + 1}`) ||
        new RegExp(`\\(${page + 1}\\s+pus`).test(catHtml);

      for (const pUrl of productUrls) {
        seenUrls.add(pUrl);
        await sleep(DELAY_MS);

        let pHtml;
        try { pHtml = await fetchHtml(pUrl); }
        catch (e) { console.error(`    ✗ ${pUrl}: ${e.message}`); failed++; continue; }

        const product = parseProductPage(pHtml);
        if (!product) { console.log(`    ⚠ no data: ${pUrl}`); skipped++; continue; }

        const nameEn = toEnglish(product.name);
        let slug = slugify(nameEn);
        // Ensure slug uniqueness
        const { data: dup } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
        if (dup) slug = `${slug}-${Date.now()}`;

        // Check full duplicate by name
        const { data: nameDup } = await supabase
          .from('products')
          .select('id')
          .eq('name_lt', product.name)
          .maybeSingle();
        if (nameDup) { console.log(`    ↩ exists: ${product.name}`); skipped++; continue; }

        // Upload image
        let images = [];
        if (product.imageUrl) {
          const pub = await uploadImage(product.imageUrl, slug);
          if (pub) images = [pub];
        }

        const { error: insErr } = await supabase.from('products').insert({
          name_en: nameEn,
          name_lt: product.name,
          description_en: product.description || null,
          description_lt: product.description || null,
          price: product.price,
          stock: 50,
          category_id: catId[source.cat],
          slug,
          images,
          is_active: true,
          is_featured: false,
        });

        if (insErr) {
          console.error(`    ✗ insert ${product.name}: ${insErr.message}`);
          failed++;
        } else {
          console.log(`    ✓ ${nameEn}  €${product.price}`);
          inserted++;
        }
      }

      if (!hasNextPage) break;
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`↩  Skipped:  ${skipped}`);
  console.log(`✗  Failed:   ${failed}`);
  console.log(`${'─'.repeat(50)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
