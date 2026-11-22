// POST /api/pengumuman/:id/tolak — penolakan ketua.
// CATATAN SKEMA: kolom status pengumuman hanya mengizinkan
// draft|menunggu|tayang|selesai (check constraint di supabase-schema.sql),
// jadi tidak ada nilai "ditolak" di database. Penolakan dicatat sebagai
// status "selesai" (terminal, tidak pernah tayang) + baris log_aktivitas
// "Menolak kiriman". Frontend membedakan: selesai + disetujui_pada kosong
// berarti ditolak; selesai + disetujui_pada terisi berarti masa tayang habis.
// Bila nanti ingin status "ditolak" yang eksplisit, perlu migrasi:
//   alter table pengumuman drop constraint pengumuman_status_check;
//   alter table pengumuman add constraint pengumuman_status_check
//     check (status in ('draft','menunggu','tayang','selesai','ditolak'));
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
      throw konflik("Hanya pengumuman berstatus menunggu yang bisa ditolak (saat ini: " + p.status + ")");
    }

    const ketua = await getKetua(sb, masjidId);
    if (!ketua) throw konflik("Belum ada pengurus dengan peran ketua di database");

    const { data: updated, error: updErr } = await sb
      .from("pengumuman")
      .update({ status: "selesai" })
      .eq("id", id)
      .select("id, isi, jenis, status, disetujui_oleh, disetujui_pada, created_at")
      .single();
    if (updErr) throw updErr;

    await tulisLog(sb, {
      masjidId,
      pengurusId: ketua.id,
      aksi: "Menolak kiriman",
      detail:
        "pengumuman:" + id + " | " + (p.jenis || "pengumuman") + ': "' +
        (p.isi || "").slice(0, 120) + '" — ditolak ketua, tidak tayang',
    });

    ok(res, { pengumuman: updated });
  } catch (err) {
    gagal(res, err);
  }
};
