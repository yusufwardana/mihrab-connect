// POST /api/auth/logout — keluar: hapus cookie sesi.
// Tidak butuh sesi yang sah (keluar harus selalu berhasil).
"use strict";

const { ok, gagal, hanyaMethod } = require("../../lib/http");
const { cookieHapus } = require("../../lib/auth");

module.exports = async (req, res) => {
  try {
    if (!hanyaMethod(req, res, ["POST"])) return;
    res.setHeader("Set-Cookie", cookieHapus());
    ok(res, { ok: true });
  } catch (err) {
    gagal(res, err);
  }
};
