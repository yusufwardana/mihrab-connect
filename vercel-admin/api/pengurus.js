// GET /api/pengurus — daftar pengurus masjid (beserta nomor WhatsApp terdaftar).
// Tabel: pengurus.
"use strict";

const { supabase, getMasjidId } = require("../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../lib/http");

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    const { data, error } = await sb
      .from("pengurus")
      .select("id, nama, peran, no_whatsapp, whatsapp_terdaftar, created_at")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    ok(res, { pengurus: data || [] });
  } catch (err) {
    gagal(res, err);
  }
};
