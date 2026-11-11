import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// ── Background job state (module-level, survives across requests) ──────────
type JobState = {
  running: boolean;
  done: boolean;
  log: string[];
  inserted: number;
  skipped: number;
  failed: number;
};

const job: JobState = {
  running: false,
  done: false,
  log: [],
  inserted: 0,
  skipped: 0,
  failed: 0,
};

// ── Config ─────────────────────────────────────────────────────────────────
const BASE = "https://www.jusuaugintinis.lt";
const DELAY_MS = 300;

const SOURCES = [
  // Dog food
  { url: `${BASE}/index.php?route=product/category&path=213_69`,  cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_205`, cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_206`, cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_207`, cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_208`, cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_260`, cat: "dog-food" },
  { url: `${BASE}/index.php?route=product/category&path=213_268`, cat: "dog-food" },
  // Cat food – dry
  { url: `${BASE}/kaciu-maistas/kitten`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/bosch-sanabelle-adult-poultry-high-premium-jusuaugintinis`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/sensitive`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/kastruotiems-sterilizuotiems-virsvoris-bosch-sanabelle-dakona-jusuaugintinis`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/sanabelle-sterilized-kastruotoms-katems-inkstai-akmenys-spec-dakona-jusuaugintinis`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/hair-skin-oda-kailis-sanabelle-bosch-jusuaugintinis-dakona`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/grande-veisles-dideliu-sanabelle-bosch-jusuaugintinis-dakona-meino-meskenai`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/urinary-sanabelle-bosch-jusuaugintinis-dakona`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/dental-dantys-sanabelle-bosch-jusuaugintinis-dakona`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/no-grain-be-grudis`, cat: "cat-food" },
  { url: `${BASE}/kaciu-maistas/sanabelle-senior-bosch-senoms-matems-dakona-jususaugintinis-paguvenusioms-senyvoms`, cat: "cat-food" },
  { url: `${BASE}/index.php?route=product/category&path=215_256`, cat: "cat-food" },
  { url: `${BASE}/index.php?route=product/category&path=215_257`, cat: "cat-food" },
  // Cat wet food
  { url: `${BASE}/katinukams/bosch-sanabelle-delicious-line`, cat: "cat-food" },
  // Misc
  { url: `${BASE}/katinukams/kraikai`, cat: "misc" },
  { url: `${BASE}/katinukams/rinkiniai-rinkinys-dovana-dovana-katems-jusuaugintinis`, cat: "misc" },
  { url: `${BASE}/sunimsirkatems`, cat: "misc" },
  { url: `${BASE}/high-premium-skanestai-katems-sunims-super-premium-bosch`, cat: "misc" },
  { url: `${BASE}/konservai-auk%C5%A1ta-kokyb%C4%97-%C5%A1unims-kat%C4%97ms-augintiniams`, cat: "misc" },
];

const TRANSLATIONS: [string, string][] = [
  ["DOVANŲ!", "(bonus)"], ["Dovanų!", "(bonus)"], ["dovanų", "(bonus)"],
  ["Rinkinys", "Bundle"], ["rinkinys", "bundle"],
  ["su šerniena", "with boar"], ["su paukštiena", "with poultry"],
  ["su vištiena", "with chicken"], ["su jautiena", "with beef"],
  ["su antim", "with duck"], ["su lašiša", "with salmon"],
  ["su triušiena", "with rabbit"], ["su žvėriena", "with venison"],
  ["su ėriena", "with lamb"], ["be paukštienos", "without poultry"],
  ["šlapias ėdalas", "wet food"], ["sausainiai", "biscuits"],
  ["skanėstai", "treats"], ["papildoma apsauga", "extra protection"],
  ["apsauga nuo erkių", "tick protection"], ["nuo erkių", "against ticks"],
  ["purškalas", "spray"], ["vitaminai", "vitamins"],
  ["multivitaminai", "multivitamins"], ["kraikai", "litter"], ["kraikas", "litter"],
  ["katėms", "for cats"], ["šunims", "for dogs"],
];

function toEnglish(name: string) {
  let s = name;
  for (const [lt, en] of TRANSLATIONS) s = s.split(lt).join(en);
  return s.trim();
}

function slugify(text: string) {
  const map: Record<string, string> = {
    č:"c",š:"s",ž:"z",ę:"e",ė:"e",į:"i",ū:"u",ą:"a",
    Č:"c",Š:"s",Ž:"z",Ę:"e",Ė:"e",Į:"i",Ū:"u",Ą:"a",
  };
  return text
    .replace(/[čšžęėįūąČŠŽĘĖĮŪĄ]/g, c => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const EXCLUDE = [
  "/index.php", "/katinukams", "/kaciu-maistas", "/sunimsirkatems",
  "/high-premium-skanestai", "/konservai", "/Akcijos",
  "/apie-mus", "/atsiskaitymas", "/privatumo-politika", "/kontaktai",
  "route=account", "route=checkout", "route=information",
  "route=product/category", "route=product/search", "route=product/special",
  "/wishlist", "/login", "/register", "/cart", "/checkout",
];

function extractProductUrls(html: string): string[] {
  const urls = new Set<string>();
  const re = /href="(https:\/\/www\.jusuaugintinis\.lt\/[^"#?]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (!EXCLUDE.some(p => u.includes(p)) && u !== BASE && u !== BASE + "/") {
      urls.add(u);
    }
  }
  return [...urls];
}

function parseProduct(html: string) {
  const nameM = html.match(/<h1[^>]*>\s*([^<]{2,}?)\s*<\/h1>/);
  if (!nameM) return null;
  const name = nameM[1].replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim();
  if (!name || name.length < 2) return null;

  const pricePatterns = [
    /class="price-new[^"]*"[^>]*>[\s\S]{0,30}?(\d[\d\s]*[.,]\d{2})/,
    /class="price[^"]*"[^>]*>[\s\S]{0,50}?(\d[\d\s]*[.,]\d{2})/,
    /€\s*(\d[\d\s]*[.,]\d{2})/,
  ];
  let price = 0;
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m) { price = parseFloat(m[1].replace(/\s/g, "").replace(",", ".")); break; }
  }
  if (!price) return null;

  const imgPatterns = [
    /src="([^"]*image\/cache\/[^"]*-500x500[^"]*)"/,
    /src="([^"]*image\/cache\/[^"]*-458x458[^"]*)"/,
    /src="([^"]*image\/cache\/[^"]*-180x210[^"]*)"/,
    /src="([^"]*image\/cache\/catalog\/[^"]+\.(jpg|jpeg|png|gif))"/i,
  ];
  let imageUrl: string | null = null;
  for (const p of imgPatterns) {
    const m = html.match(p);
    if (m) { imageUrl = m[1]; break; }
  }
  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = BASE + "/" + imageUrl.replace(/^\//, "");
  }

  const descM = html.match(/id="tab-description"[^>]*>([\s\S]*?)(?=<\/div>\s*<\/div>|id="tab-review|id="tab-specification)/);
  let description = "";
  if (descM) {
    description = descM[1]
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n").trim();
  }

  return { name, price, imageUrl, description };
}

async function uploadImage(supabase: ReturnType<typeof createAdminClient>, url: string, slug: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const rawExt = (url.split(".").pop() ?? "jpg").split("?")[0].toLowerCase();
    const ext = ["jpg","jpeg","png","gif","webp"].includes(rawExt) ? rawExt : "jpg";
    const mime: Record<string,string> = { png:"image/png", gif:"image/gif", webp:"image/webp" };
    const path = `imported/${slug}.${ext}`;
    await supabase.storage.from("product-images").upload(path, buf, {
      contentType: mime[ext] ?? "image/jpeg", upsert: true,
    });
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
    return publicUrl;
  } catch { return null; }
}

async function runImport() {
  const supabase = createAdminClient();
  const { data: cats } = await supabase.from("categories").select("id, slug");
  if (!cats) { job.log.push("✗ Failed to load categories"); job.running = false; job.done = true; return; }
  const catId = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  job.log.push(`✅ Categories: ${Object.keys(catId).join(", ")}`);

  const seenUrls = new Set<string>();

  for (const source of SOURCES) {
    job.log.push(`\n📂 ${source.cat.toUpperCase()} ← ${source.url}`);

    for (let page = 1; page <= 20; page++) {
      const sep = source.url.includes("?") ? "&" : "?";
      const pageUrl = page === 1 ? source.url : `${source.url}${sep}page=${page}`;

      let catHtml: string;
      try {
        const r = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "lt-LT,lt" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        catHtml = await r.text();
      } catch (e: unknown) {
        job.log.push(`  ✗ category: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }

      const newUrls = extractProductUrls(catHtml).filter(u => !seenUrls.has(u));
      job.log.push(`  Page ${page}: ${newUrls.length} new products`);
      if (newUrls.length === 0) break;

      const hasNext = catHtml.includes(`page=${page + 1}`);

      for (const pUrl of newUrls) {
        seenUrls.add(pUrl);
        await sleep(DELAY_MS);

        let pHtml: string;
        try {
          const r = await fetch(pUrl, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "lt-LT,lt" } });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          pHtml = await r.text();
        } catch (e: unknown) {
          job.log.push(`    ✗ fetch failed: ${e instanceof Error ? e.message : String(e)}`);
          job.failed++;
          continue;
        }

        const product = parseProduct(pHtml);
        if (!product) { job.log.push(`    ⚠ no data: ${pUrl}`); job.skipped++; continue; }

        const nameEn = toEnglish(product.name);
        let slug = slugify(nameEn);

        const { data: nameDup } = await supabase
          .from("products").select("id").eq("name_lt", product.name).maybeSingle();
        if (nameDup) { job.log.push(`    ↩ exists: ${product.name}`); job.skipped++; continue; }

        const { data: slugDup } = await supabase
          .from("products").select("id").eq("slug", slug).maybeSingle();
        if (slugDup) slug = `${slug}-${Date.now()}`;

        let images: string[] = [];
        if (product.imageUrl) {
          const pub = await uploadImage(supabase, product.imageUrl, slug);
          if (pub) images = [pub];
        }

        const { error } = await supabase.from("products").insert({
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

        if (error) {
          job.log.push(`    ✗ ${product.name}: ${error.message}`);
          job.failed++;
        } else {
          job.log.push(`    ✓ ${nameEn}  €${product.price}`);
          job.inserted++;
        }
      }

      if (!hasNext) break;
      await sleep(DELAY_MS);
    }
  }

  job.log.push(`\n${"─".repeat(40)}`);
  job.log.push(`✅ Inserted: ${job.inserted}`);
  job.log.push(`↩  Skipped:  ${job.skipped}`);
  job.log.push(`✗  Failed:   ${job.failed}`);
  job.log.push(`${"─".repeat(40)}`);
  job.running = false;
  job.done = true;
}

// GET — returns current job status as JSON
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    running: job.running,
    done: job.done,
    inserted: job.inserted,
    skipped: job.skipped,
    failed: job.failed,
    log: job.log.slice(-50), // last 50 lines
    totalLines: job.log.length,
  });
}

// PUT — move products matching a name filter to a target category
// Body: { nameContains: string, categorySlug: string }
export async function PUT(req: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


  const { nameContains, categorySlug } = await req.json();
  if (!nameContains || !categorySlug) {
    return NextResponse.json({ error: "nameContains and categorySlug are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
  if (!cat) return NextResponse.json({ error: `Category '${categorySlug}' not found` }, { status: 404 });

  const { data: products, error: fetchErr } = await supabase
    .from("products")
    .select("id, name_en")
    .ilike("name_en", `%${nameContains}%`);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!products || products.length === 0) {
    return NextResponse.json({ moved: 0, message: `No products matching '${nameContains}'` });
  }

  const { error: updateErr } = await supabase
    .from("products")
    .update({ category_id: cat.id })
    .in("id", products.map(p => p.id));

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ moved: products.length, products: products.map(p => p.name_en) });
}

// POST — starts the import in the background (idempotent: ignores if already running)
export async function POST() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (job.running) {
    return NextResponse.json({ started: false, reason: "Already running" });
  }

  // Reset state
  job.running = true;
  job.done = false;
  job.log = [];
  job.inserted = 0;
  job.skipped = 0;
  job.failed = 0;

  // Fire and forget — does NOT block the HTTP response
  runImport().catch(e => {
    job.log.push(`✗ Fatal: ${e?.message ?? String(e)}`);
    job.running = false;
    job.done = true;
  });

  return NextResponse.json({ started: true });
}
