// GET/POST/PUT /api/pengumuman — daftar pengumuman masjid (antrean + yang tayang),
// buat pengumuman baru dari dashboard (langsung tayang sebagai ketua),
// dan ubah pengumuman yang masih menunggu/draft.
// GET query opsional: ?status=menunggu|tayang|draft|selesai (tanpa filter = semua).
// POST body: { isi (wajib), jenis (opsional, default "Pengumuman") } ->
//   201 { pengumuman }. Buat dari dashboard langsung berstatus 'tayang'
//   (preseden spek backend §4.3: kiriman dari ketua auto-tayang; dashboard
//   hanya dioperasikan ketua).
// PUT body: { id (wajib), isi?, jenis? } -> 200 { pengumuman }.
//   Hanya status 'menunggu'/'draft' yang boleh diubah; 'tayang'/'selesai' 409.
// Tabel: pengumuman (+ pengurus untuk nama/peran/nomor pengirim), log_aktivitas.
"use strict";

const { supabase, getMasjidId, getKetua, getPengurusMap, tulisLog } = require("../lib/supabase");
const { ok, dibuat, gagal, hanyaMethod, bacaJson, salahInput, konflik } = require("../lib/http");

const STATUS_VALID = ["draft", "menunggu", "tayang", "selesai"];

function judulDariIsi(isi) {
  var t = String(isi || "").split("\n")[0].trim();
  if (!t) return "(tanpa judul)";
  return t.length > 200 ? t.slice(0, 200) : t;
}

function bentukPengumuman(p, pengurusMap) {
  const pengirim = p.pengirim_id ? pengurusMap[p.pengirim_id] || null : null;
  return {
    id: p.id,
    jenis: p.jenis,
    isi: p.isi,
    status: p.status,
    sumber: p.sumber,
    pengirim: pengirim
      ? {
          id: pengirim.id,
          nama: pengirim.nama,
          peran: pengirim.peran,
          no_whatsapp: pengirim.no_whatsapp,
        }
      : null,
    disetujui_oleh: p.disetujui_oleh,
    disetujui_pada: p.disetujui_pada,
    created_at: p.created_at,
  };
}

async function buatPengumuman(req, res, sb, masjidId) {
  const body = await bacaJson(req);
  const isi = String((body && body.isi) || "").trim();
  if (!isi) throw salahInput("Isi pengumuman wajib diisi");
  var jenis = String((body && body.jenis) || "").trim() || "Pengumuman";
  if (jenis.length > 100) throw salahInput("Jenis terlalu panjang (maks 100 karakter)");

  const ketua = await getKetua(sb, masjidId);
  if (!ketua) throw konflik("Belum ada pengurus dengan peran ketua di database");

  const sekarang = new Date().toISOString();
  const { data, error } = await sb
    .from("pengumuman")
    .insert({
      masjid_id: masjidId,
      isi,
      jenis,
      sumber: "dashboard",
      pengirim_id: ketua.id,
      status: "tayang",
      disetujui_oleh: ketua.id,
      disetujui_pada: sekarang,
    })
    .select("id, isi, jenis, status, sumber, pengirim_id, disetujui_oleh, disetujui_pada, created_at")
    .single();
  if (error) throw error;

  await tulisLog(sb, {
    masjidId,
    pengurusId: ketua.id,
    aksi: "Menambah pengumuman",
    detail: jenis + ': "' + judulDariIsi(isi) + '" — dibuat dari dashboard, langsung tayang di Board',
  });

  const pengurusMap = await getPengurusMap(sb, masjidId);
  dibuat(res, { pengumuman: bentukPengumuman(data, pengurusMap) });
}

async function ubahPengumuman(req, res, sb, masjidId) {
  const body = await bacaJson(req);
  const id = String((body && body.id) || "").trim();
  if (!id) throw salahInput("ID pengumuman wajib diisi");
  const adaIsi = body && body.isi !== undefined && body.isi !== null;
  const adaJenis = body && body.jenis !== undefined && body.jenis !== null;
  if (!adaIsi && !adaJenis) {
    throw salahInput("Kirim isi dan/atau jenis yang diubah");
  }
  const patch = {};
  if (adaIsi) {
    const isi = String(body.isi).trim();
    if (!isi) throw salahInput("Isi pengumuman wajib diisi");
    patch.isi = isi;
  }
  if (adaJenis) {
    var jenis = String(body.jenis).trim() || "Pengumuman";
    if (jenis.length > 100) throw salahInput("Jenis terlalu panjang (maks 100 karakter)");
    patch.jenis = jenis;
  }

  const { data: lama, error: cariErr } = await sb
    .from("pengumuman")
    .select("id, status")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .maybeSingle();
  if (cariErr) throw cariErr;
  if (!lama) throw tidakKetemu("Pengumuman tidak ditemukan");
  if (lama.status !== "menunggu" && lama.status !== "draft") {
    throw konflik(
      "Hanya pengumuman berstatus menunggu/draft yang bisa diubah (saat ini: " + lama.status + ")"
    );
  }

  const ketua = await getKetua(sb, masjidId);
  if (!ketua) throw konflik("Belum ada pengurus dengan peran ketua di database");

  const { data, error } = await sb
    .from("pengumuman")
    .update(patch)
    .eq("id", id)
    .select("id, isi, jenis, status, sumber, pengirim_id, disetujui_oleh, disetujui_pada, created_at")
    .single();
  if (error) throw error;

  await tulisLog(sb, {
    masjidId,
    pengurusId: ketua.id,
    aksi: "Mengubah pengumuman",
    detail: data.jenis + ': "' + judulDariIsi(data.isi) + '" — diubah dari dashboard',
  });

  const pengurusMap = await getPengurusMap(sb, masjidId);
  ok(res, { pengumuman: bentukPengumuman(data, pengurusMap) });
}

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET", "POST", "PUT"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    if (req.method === "POST") return buatPengumuman(req, res, sb, masjidId);
    if (req.method === "PUT") return ubahPengumuman(req, res, sb, masjidId);

    let q = sb
      .from("pengumuman")
      .select(
        "id, masjid_id, isi, jenis, sumber, pengirim_id, status, disetujui_oleh, disetujui_pada, created_at"
      )
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: false });
    const status = (req.query && req.query.status) || "";
    if (status) {
      if (!STATUS_VALID.includes(status)) {
        const e = new Error("status tidak dikenal: " + status);
        e.status = 400;
        throw e;
      }
      q = q.eq("status", status);
    }
    const { data, error } = await q;
    if (error) throw error;

    const pengurusMap = await getPengurusMap(sb, masjidId);
    const pengumuman = (data || []).map((p) => bentukPengumuman(p, pengurusMap));

    ok(res, {
      pengumuman,
      menunggu: pengumuman.filter((p) => p.status === "menunggu").length,
      tayang: pengumuman.filter((p) => p.status === "tayang").length,
    });
  } catch (err) {
    gagal(res, err);
  }
};
