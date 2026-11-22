// GET /api/pengumuman — daftar pengumuman masjid (antrean + yang tayang).
// Query opsional: ?status=menunggu|tayang|draft|selesai (tanpa filter = semua).
// Tabel: pengumuman (+ pengurus untuk nama/peran/nomor pengirim).
"use strict";

const { supabase, getMasjidId, getPengurusMap } = require("../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../lib/http");

const STATUS_VALID = ["draft", "menunggu", "tayang", "selesai"];

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);

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
    const pengumuman = (data || []).map((p) => {
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
    });

    ok(res, {
      pengumuman,
      menunggu: pengumuman.filter((p) => p.status === "menunggu").length,
      tayang: pengumuman.filter((p) => p.status === "tayang").length,
    });
  } catch (err) {
    gagal(res, err);
  }
};
