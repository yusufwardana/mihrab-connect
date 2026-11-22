// POST /api/pengumuman/:id/setujui — persetujuan ketua.
// menunggu -> tayang, disetujui_oleh = pengurus peran ketua, disetujui_pada = now.
// Menulis baris ke log_aktivitas. Hanya status "menunggu" yang bisa disetujui.
// Tabel: pengumuman, pengurus, log_aktivitas.
"use strict";

const { supabase, getMasjidId, getKetua, tulisLog } = require("../../../lib/supabase");
const { ok, gagal, hanyaMethod, tidakKetemu, konflik } = require("../../../lib/http");

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const id = req.query && req.query.id;
    if (!id) throw tidakKetemu("ID pengumuman tidak ada");

    const { data: p, error } = await sb
      .from("pengumuman")
      .select("id, isi, jenis, status, masjid_id")
      .eq("id", id)
      .eq("masjid_id", masjidId)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw tidakKetemu("Pengumuman tidak ditemukan");
    if (p.status !== "menunggu") {
      throw konflik("Hanya pengumuman berstatus menunggu yang bisa disetujui (saat ini: " + p.status + ")");
    }

    const ketua = await getKetua(sb, masjidId);
    if (!ketua) throw konflik("Belum ada pengurus dengan peran ketua di database");

    const sekarang = new Date().toISOString();
    const { data: updated, error: updErr } = await sb
      .from("pengumuman")
      .update({ status: "tayang", disetujui_oleh: ketua.id, disetujui_pada: sekarang })
      .eq("id", id)
      .select("id, isi, jenis, status, disetujui_oleh, disetujui_pada, created_at")
      .single();
    if (updErr) throw updErr;

    await tulisLog(sb, {
      masjidId,
      pengurusId: ketua.id,
      aksi: "Menyetujui kiriman",
      detail:
        "pengumuman:" + id + " | " + (p.jenis || "pengumuman") + ': "' +
        (p.isi || "").slice(0, 120) + '" — kini tayang di Board',
    });

    ok(res, { pengumuman: updated });
  } catch (err) {
    gagal(res, err);
  }
};
