// Helper HTTP kecil untuk Vercel Serverless Functions (Node, tanpa framework).
"use strict";

function kirim(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function ok(res, obj) {
  kirim(res, 200, obj);
}

function dibuat(res, obj) {
  kirim(res, 201, obj);
}

function gagal(res, err) {
  const status = err && err.status ? err.status : 500;
  const pesan =
    (err && err.message) || "Terjadi kesalahan di server";
  kirim(res, status, { error: pesan });
}

// Batasi method; kembalikan false bila method tidak diizinkan (res sudah dikirim).
function hanyaMethod(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    kirim(res, 405, { error: "Method " + req.method + " tidak diizinkan" });
    return false;
  }
  return true;
}

// Baca body JSON (Vercel tidak mem-parse body untuk fungsi Node polos bila
// content-type tidak dikenali; fungsi ini aman untuk keduanya).
function bacaJson(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === "object") return resolve(req.body);
      if (typeof req.body === "string" && req.body.length > 0) {
        try {
          return resolve(JSON.parse(req.body));
        } catch (e) {
          const err = new Error("Body bukan JSON yang valid");
          err.status = 400;
          return reject(err);
        }
      }
    }
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1024 * 1024) {
        const err = new Error("Body terlalu besar");
        err.status = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        const err = new Error("Body bukan JSON yang valid");
        err.status = 400;
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function salahInput(pesan) {
  const e = new Error(pesan);
  e.status = 400;
  return e;
}

function tidakKetemu(pesan) {
  const e = new Error(pesan || "Data tidak ditemukan");
  e.status = 404;
  return e;
}

function konflik(pesan) {
  const e = new Error(pesan);
  e.status = 409;
  return e;
}

module.exports = { ok, dibuat, gagal, hanyaMethod, bacaJson, salahInput, tidakKetemu, konflik };
