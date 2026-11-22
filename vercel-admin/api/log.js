// GET /api/log — log aktivitas terakhir (siapa, kapan, dari mana, apa).
// Query opsional: ?limit= (default 50, maks 100).
// Tabel: log_aktivitas (+ pengurus untuk nama pelaku).
"use strict";

const { supabase, getMasjidId, getPengurusMap } = require("../lib/supabase");
const { ok, gagal, hanyaMethod } = require("../lib/http");

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["GET"])) return;
    const sb = supabase();
    const masjidId = await getMasjidId(sb);
    let limit = parseInt((req.query && req.query.limit) || "50", 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    const { data, error } = await sb
      .from("log_aktivitas")
      .select("id, pengurus_id, aksi, detail, sumber, created_at")
      .eq("masjid_id", masjidId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const pengurusMap = await getPengurusMap(sb, masjidId);
    const log = (data || []).map((l) => {
      const p = l.pengurus_id ? pengurusMap[l.pengurus_id] || null : null;
      return {
        id: l.id,
        kapan: l.created_at,
        siapa: p ? p.nama + " (" + p.peran + ")" : "Sistem",
        dari: l.sumber,
        apa: l.detail ? l.aksi + " — " + l.detail : l.aksi,
        aksi: l.aksi,
        detail: l.detail,
      };
    });
    ok(res, { log });
  } catch (err) {
    gagal(res, err);
  }
};
