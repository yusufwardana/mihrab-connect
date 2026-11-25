// Uji fail-closed + intake end-to-end service WhatsApp (tanpa kredensial Meta
// sungguhan, tanpa jaringan sungguhan).
// - fetch global di-stub: Supabase -> PostgREST palsu di memori,
//   Graph API -> respons sukses palsu (panggilan direkam).
// - Dijalankan: npm test
"use strict";

const assert = require("node:assert");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");

process.env.SUPABASE_URL = "http://supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

// ---------- PostgREST palsu ----------

const db = {
  masjid: [
    {
      id: "masjid-1",
      nama: "Masjid Jami' Abdul Latief Al Furqon",
      alamat: "Ploso, Mlopoharjo, Wuryantoro, Wonogiri 57661",
      koordinat_lat: -7.89367,
      koordinat_lng: 110.84866,
      logo_url: null,
      foto_url: null,
      kontak: null,
      created_at: "2026-11-22T10:00:00.000Z",
    },
  ],
  pengurus: [
    { id: "pengurus-ketua", masjid_id: "masjid-1", nama: "Sarino", peran: "ketua", no_whatsapp: "089876543210", whatsapp_terdaftar: true, created_at: "2026-11-22T10:00:00.000Z" },
    { id: "pengurus-bendahara", masjid_id: "masjid-1", nama: "Gondes", peran: "bendahara", no_whatsapp: "089876543210", whatsapp_terdaftar: true, created_at: "2026-11-22T10:01:00.000Z" },
    { id: "pengurus-marbot", masjid_id: "masjid-1", nama: "Paijo", peran: "marbot", no_whatsapp: "089876543210", whatsapp_terdaftar: true, created_at: "2026-11-22T10:02:00.000Z" },
  ],
  pengumuman: [],
  log_aktivitas: [],
  murotal_settings: [
    { masjid_id: "masjid-1", surah: "Ar-Rahman", qari: "Contoh Qari", durasi_menit: 10, volume: 70, aktif: true },
  ],
};

const graphCalls = [];

function nilaiEq(v) {
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function tanganiPostgrest(u, method, options) {
  const url = new URL(u);
  const tabel = url.pathname.replace("/rest/v1/", "").split("/")[0];
  const rows = db[tabel];
  if (!rows) return new Response("tabel tidak dikenal", { status: 404 });
  const headers = new Headers(options.headers || {});
  const accept = headers.get("accept") || "";
  const prefer = headers.get("prefer") || "";
  const mauObjek = accept.includes("application/vnd.pgrst.object+json");

  if (method === "GET") {
    let hasil = rows.slice();
    for (const [k, v] of url.searchParams.entries()) {
      if (["select", "order", "limit", "offset"].includes(k)) continue;
      if (v.startsWith("eq.")) {
        const nilai = nilaiEq(decodeURIComponent(v.slice(3)));
        hasil = hasil.filter((r) => {
          if (typeof r[k] === "boolean") return r[k] === nilai;
          return String(r[k]) === String(nilai);
        });
      }
    }
    const order = url.searchParams.get("order");
    if (order) {
      const [kolom, arah] = order.split(".");
      hasil.sort((a, b) =>
        arah === "desc"
          ? String(b[kolom]).localeCompare(String(a[kolom]))
          : String(a[kolom]).localeCompare(String(b[kolom]))
      );
    }
    const limit = url.searchParams.get("limit");
    if (limit) hasil = hasil.slice(0, parseInt(limit, 10));
    if (mauObjek) {
      if (!hasil.length) return new Response("{}", { status: 406, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(hasil[0]), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(hasil), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (method === "POST") {
    let body = {};
    try {
      body = JSON.parse(options.body || "{}");
    } catch {
      return new Response("body bukan JSON", { status: 400 });
    }
    const baris = (Array.isArray(body) ? body : [body]).map((b) => ({
      ...b,
      id: b.id || crypto.randomUUID(),
      created_at: b.created_at || new Date().toISOString(),
    }));
    rows.push(...baris);
    if (prefer.includes("return=minimal")) {
      return new Response(null, { status: 201 });
    }
    if (mauObjek) {
      return new Response(JSON.stringify(baris[0]), { status: 201, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(baris), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  if (method === "PATCH") {
    let patch = {};
    try {
      patch = JSON.parse(options.body || "{}");
    } catch {
      return new Response("body bukan JSON", { status: 400 });
    }
    let hasil = rows.slice();
    for (const [k, v] of url.searchParams.entries()) {
      if (["select", "order", "limit", "offset"].includes(k)) continue;
      if (v.startsWith("eq.")) {
        const nilai = nilaiEq(decodeURIComponent(v.slice(3)));
        hasil = hasil.filter((r) => String(r[k]) === String(nilai));
      }
    }
    hasil.forEach((r) => Object.assign(r, patch));
    if (prefer.includes("return=minimal")) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(hasil), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response("method tidak dikenal", { status: 405 });
}

const fetchAsli = global.fetch;
global.fetch = async (url, options = {}) => {
  const u = typeof url === "string" ? url : url.toString();
  if (u.startsWith("https://graph.facebook.com/")) {
    let body = {};
    try {
      body = JSON.parse(options.body || "{}");
    } catch {
      body = {};
    }
    graphCalls.push({ url: u, body });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.balasan123" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (u.startsWith(process.env.SUPABASE_URL + "/rest/v1/")) {
    return tanganiPostgrest(u, (options.method || "GET").toUpperCase(), options);
  }
  throw new Error("Jaringan sungguhan tidak boleh dipanggil di uji ini: " + u);
};

const handler = require("../api/whatsapp");

// ---------- mock req/res ----------

function buatReq({ method, headers = {}, query = {}, bodyBuffer = null }) {
  const stream = new Readable({ read() {} });
  if (bodyBuffer) stream.push(bodyBuffer);
  stream.push(null);
  stream.method = method;
  stream.headers = headers;
  stream.query = query;
  stream.url = "/api/whatsapp";
  return stream;
}

function buatRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(data) {
      this.body += data || "";
      if (this._selesai) this._selesai();
    },
  };
  res.selesai = new Promise((r) => {
    res._selesai = r;
  });
  return res;
}

async function panggil(req) {
  const res = buatRes();
  await handler(req, res);
  await res.selesai;
  let json = null;
  try {
    json = JSON.parse(res.body);
  } catch {
    json = null;
  }
  return { status: res.statusCode, headers: res.headers, body: res.body, json };
}

function tandaTangan(raw, secret) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function buatEvent(pesan, dari = "6289876543210") {
  const value = {
    messaging_product: "whatsapp",
    metadata: { display_phone_number: "6281234567890", phone_number_id: "999" },
    contacts: [{ profile: { name: "Sarino" }, wa_id: dari }],
  };
  if (pesan) value.messages = [pesan];
  else value.statuses = [{ id: "wamid.x", status: "delivered", recipient_id: dari }];
  return { object: "whatsapp_business_account", entry: [{ id: "123", changes: [{ field: "messages", value }] }] };
}

function pesanTeks(isi, id = "wamid.msg1", dari = "6289876543210") {
  return { from: dari, id, timestamp: "1732000000", type: "text", text: { body: isi } };
}

async function panggilWebhook(event, secret) {
  const raw = Buffer.from(JSON.stringify(event), "utf8");
  const headers = { "content-type": "application/json" };
  if (secret !== undefined) headers["x-hub-signature-256"] = tandaTangan(raw, secret);
  return panggil(buatReq({ method: "POST", headers, query: {}, bodyBuffer: raw }));
}

// ---------- kasus uji ----------

let lolos = 0;
let gagalUji = 0;
async function uji(nama, fn) {
  try {
    await fn();
    lolos++;
    console.log("  PASS " + nama);
  } catch (e) {
    gagalUji++;
    console.log("  FAIL " + nama + " — " + e.message);
  }
}

(async () => {
  console.log("Uji fail-closed + intake WhatsApp (stub fetch, tanpa jaringan):");

  // --- verifikasi webhook (GET) ---
  await uji("GET verify tanpa env META_VERIFY_TOKEN -> 403", async () => {
    delete process.env.META_VERIFY_TOKEN;
    const r = await panggil(
      buatReq({ method: "GET", query: { "hub.mode": "subscribe", "hub.verify_token": "x", "hub.challenge": "1" } })
    );
    assert.strictEqual(r.status, 403);
    assert.match(r.body, /META_VERIFY_TOKEN/);
  });

  await uji("GET verify token cocok -> 200 + challenge teks polos", async () => {
    process.env.META_VERIFY_TOKEN = "test-verify";
    const r = await panggil(
      buatReq({ method: "GET", query: { "hub.mode": "subscribe", "hub.verify_token": "test-verify", "hub.challenge": "CHALLENGE123" } })
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body, "CHALLENGE123");
    assert.match(r.headers["content-type"], /text\/plain/);
  });

  await uji("GET verify token salah -> 403", async () => {
    const r = await panggil(
      buatReq({ method: "GET", query: { "hub.mode": "subscribe", "hub.verify_token": "salah", "hub.challenge": "1" } })
    );
    assert.strictEqual(r.status, 403);
  });

  // --- webhook (POST) tanpa kredensial ---
  await uji("POST webhook tanpa env META_APP_SECRET -> 403", async () => {
    delete process.env.META_APP_SECRET;
    const r = await panggilWebhook(buatEvent(pesanTeks("halo")), undefined);
    assert.strictEqual(r.status, 403);
    assert.match(r.body, /META_APP_SECRET/);
  });

  await uji("POST webhook secret diset tapi tanpa signature -> 401", async () => {
    process.env.META_APP_SECRET = "test-secret";
    const r = await panggilWebhook(buatEvent(pesanTeks("halo")), undefined);
    assert.strictEqual(r.status, 401);
  });

  await uji("POST webhook signature salah -> 401", async () => {
    const raw = Buffer.from(JSON.stringify(buatEvent(pesanTeks("halo"))), "utf8");
    const r = await panggil(
      buatReq({
        method: "POST",
        headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan(raw, "secret-salah") },
        bodyBuffer: raw,
      })
    );
    assert.strictEqual(r.status, 401);
  });

  // --- webhook valid: event tanpa pesan ---
  await uji("POST webhook valid, event statuses saja -> 200 diproses 0", async () => {
    const r = await panggilWebhook(buatEvent(null), "test-secret");
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { diterima: true, diproses: 0, ditolak: 0, duplikat: 0 });
  });

  // --- intake teks dari nomor terdaftar ---
  // Kredensial Meta (palsu) diaktifkan di sini supaya balasan benar-benar
  // terkirim lewat stub Graph API. Sebelum titik ini balasan fail-closed
  // (kirimWhatsApp mengembalikan ok:false tanpa memanggil fetch).
  process.env.META_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "999";
  await uji("POST teks dari nomor terdaftar -> menunggu, pengirim_id null, balasan terkirim", async () => {
    const sebelum = graphCalls.length;
    const r = await panggilWebhook(buatEvent(pesanTeks("Pengumuman pertama", "wamid.msg1")), "test-secret");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.diproses, 1);
    assert.strictEqual(db.pengumuman.length, 1);
    assert.strictEqual(db.pengumuman[0].status, "menunggu");
    assert.strictEqual(db.pengumuman[0].sumber, "whatsapp");
    assert.strictEqual(db.pengumuman[0].pengirim_id, null);
    assert.strictEqual(db.pengumuman[0].isi, "Pengumuman pertama");
    assert.strictEqual(graphCalls.length, sebelum + 1);
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /menunggu persetujuan ketua/);
  });

  await uji("POST pesan sama (wamid sama) -> dedup, tidak insert ganda, tidak ada balasan baru", async () => {
    const sebelum = graphCalls.length;
    const r = await panggilWebhook(buatEvent(pesanTeks("Pengumuman pertama", "wamid.msg1")), "test-secret");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.diproses, 0);
    assert.strictEqual(r.json.duplikat, 1);
    assert.strictEqual(db.pengumuman.length, 1);
    assert.strictEqual(graphCalls.length, sebelum);
  });

  await uji("POST teks dari nomor TIDAK terdaftar -> ditolak, tidak disimpan, balasan penolakan", async () => {
    const sebelum = graphCalls.length;
    const r = await panggilWebhook(
      buatEvent(pesanTeks("Saya bukan pengurus", "wamid.msg2", "6281111111111")),
      "test-secret"
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.ditolak, 1);
    assert.strictEqual(db.pengumuman.length, 1);
    assert.ok(db.log_aktivitas.some((l) => l.aksi === "Menolak kiriman WhatsApp"));
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /tidak terdaftar/);
    assert.strictEqual(graphCalls.length, sebelum + 1);
  });

  await uji("POST perintah kas -> ditolak keras + log, tidak disimpan", async () => {
    const r = await panggilWebhook(
      buatEvent(pesanTeks("Catat kas infaq Rp 50.000 hari ini", "wamid.msg3")),
      "test-secret"
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.ditolak, 1);
    assert.strictEqual(db.pengumuman.length, 1);
    assert.ok(db.log_aktivitas.some((l) => l.aksi === "Menolak perintah kas via WhatsApp"));
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /dashboard/);
  });

  await uji("POST 'cek status' -> balasan berisi status kiriman terakhir", async () => {
    const r = await panggilWebhook(buatEvent(pesanTeks("cek status", "wamid.msg4")), "test-secret");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.diproses, 1);
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /Pengumuman pertama/);
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /menunggu/);
  });

  await uji("POST 'stop murotal' -> aktif=false + log + balasan", async () => {
    const r = await panggilWebhook(
      buatEvent(pesanTeks("tolong stop murotal hari ini", "wamid.msg5")),
      "test-secret"
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(db.murotal_settings[0].aktif, false);
    assert.ok(db.log_aktivitas.some((l) => l.aksi === "Mematikan murotal via WhatsApp"));
    assert.match(graphCalls[graphCalls.length - 1].body.text.body, /dimatikan/);
  });

  await uji("POST foto + caption -> caption jadi isi, media id di log", async () => {
    const r = await panggilWebhook(
      buatEvent({ from: "6289876543210", id: "wamid.msg6", timestamp: "1732000000", type: "image", image: { id: "media123", caption: "Foto kegiatan" } }),
      "test-secret"
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.diproses, 1);
    const p = db.pengumuman.find((x) => x.isi === "Foto kegiatan");
    assert.ok(p, "pengumuman foto tidak tersimpan");
    assert.strictEqual(p.status, "menunggu");
    assert.ok(db.log_aktivitas.some((l) => String(l.detail || "").includes("media id media123")));
  });

  await uji("POST berita duka -> jenis Berita Duka, tetap menunggu", async () => {
    const r = await panggilWebhook(
      buatEvent(pesanTeks("Innalillahi, Bapak Ahmad meninggal dunia", "wamid.msg7")),
      "test-secret"
    );
    assert.strictEqual(r.status, 200);
    const p = db.pengumuman.find((x) => x.isi.includes("Bapak Ahmad"));
    assert.ok(p);
    assert.strictEqual(p.jenis, "Berita Duka");
    assert.strictEqual(p.status, "menunggu");
  });

  await uji("POST via ?aksi=kiriman (rewrite /whatsapp/kiriman) -> sama seperti webhook", async () => {
    const raw = Buffer.from(JSON.stringify(buatEvent(pesanTeks("Lewat rewrite", "wamid.msg8"))), "utf8");
    const r = await panggil(
      buatReq({
        method: "POST",
        headers: { "content-type": "application/json", "x-hub-signature-256": tandaTangan(raw, "test-secret") },
        query: { aksi: "kiriman" },
        bodyBuffer: raw,
      })
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.diproses, 1);
  });

  // --- status kiriman ---
  await uji("GET ?aksi=status id dikenal -> 200 status menunggu", async () => {
    const id = db.pengumuman[0].id;
    const r = await panggil(buatReq({ method: "GET", query: { aksi: "status", id } }));
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.status, "menunggu");
    assert.strictEqual(r.json.judul, "Pengumuman pertama");
  });

  await uji("GET ?aksi=status id tidak dikenal -> 404", async () => {
    const r = await panggil(buatReq({ method: "GET", query: { aksi: "status", id: "tidak-ada" } }));
    assert.strictEqual(r.status, 404);
  });

  // --- notifikasi ---
  await uji("POST notifikasi tanpa env WHATSAPP_INTERNAL_SECRET -> 503", async () => {
    delete process.env.WHATSAPP_INTERNAL_SECRET;
    const raw = Buffer.from(JSON.stringify({ to: "089876543210", pesan: "halo" }), "utf8");
    const r = await panggil(
      buatReq({ method: "POST", headers: { "content-type": "application/json" }, query: { aksi: "notifikasi" }, bodyBuffer: raw })
    );
    assert.strictEqual(r.status, 503);
    assert.match(r.body, /WHATSAPP_INTERNAL_SECRET/);
  });

  await uji("POST notifikasi secret salah -> 401", async () => {
    process.env.WHATSAPP_INTERNAL_SECRET = "test-internal";
    const raw = Buffer.from(JSON.stringify({ to: "089876543210", pesan: "halo" }), "utf8");
    const r = await panggil(
      buatReq({ method: "POST", headers: { "content-type": "application/json", "x-internal-secret": "salah" }, query: { aksi: "notifikasi" }, bodyBuffer: raw })
    );
    assert.strictEqual(r.status, 401);
  });

  await uji("POST notifikasi secret benar tapi kredensial Meta belum ada -> 502, log tetap ditulis", async () => {
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const raw = Buffer.from(JSON.stringify({ to: "089876543210", pesan: "Pengumuman sudah tayang" }), "utf8");
    const r = await panggil(
      buatReq({ method: "POST", headers: { "content-type": "application/json", "x-internal-secret": "test-internal" }, query: { aksi: "notifikasi" }, bodyBuffer: raw })
    );
    assert.strictEqual(r.status, 502);
    assert.ok(db.log_aktivitas.some((l) => l.aksi === "Mengirim notifikasi WhatsApp" && String(l.detail || "").includes("GAGAL")));
  });

  await uji("POST notifikasi {pengumuman_id, pesan} kredensial lengkap -> 200 terkirim", async () => {
    process.env.META_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "999";
    const raw = Buffer.from(JSON.stringify({ pengumuman_id: db.pengumuman[0].id, pesan: "Pengumuman sudah tayang di TV" }), "utf8");
    const sebelum = graphCalls.length;
    const r = await panggil(
      buatReq({ method: "POST", headers: { "content-type": "application/json", "x-internal-secret": "test-internal" }, query: { aksi: "notifikasi" }, bodyBuffer: raw })
    );
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.terkirim, 1);
    assert.strictEqual(graphCalls.length, sebelum + 1);
    assert.strictEqual(graphCalls[graphCalls.length - 1].body.to, "6289876543210");
  });

  console.log("\n" + lolos + " lolos, " + gagalUji + " gagal.");
  global.fetch = fetchAsli;
  process.exit(gagalUji ? 1 : 0);
})().catch((e) => {
  console.error("Uji crash:", e);
  global.fetch = fetchAsli;
  process.exit(1);
});
