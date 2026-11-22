// GET /api/auth/pengurus — daftar pengurus untuk dropdown login.
// TANPA auth (sengaja): nama + peran pengurus bukan rahasia, dan layar
// login butuh daftar ini sebelum ada sesi. TIDAK mengembalikan PIN,
// hash, nomor WhatsApp, atau data sensitif lain.
// Tabel: pengurus.
"use strict";

const { supabase, getMasjidId } = require("../../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../../lib/http");

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data, error } = await sb
      .from("pengurus")
      .select("id, nama, peran")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    ok(res, { pengurus: (data || []).map(function (p) { return { id: p.id, nama: p.nama, peran: p.peran }; }) });
  } catch (err) {
    gagal(res, err);
  }
};
