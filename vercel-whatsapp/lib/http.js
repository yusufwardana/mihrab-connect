// Helper HTTP kecil untuk Vercel Serverless Functions (Node, tanpa framework).
// Pola sama dengan vercel-admin/lib/http.js, ditambah bacaRawBody untuk
// verifikasi signature webhook Meta (HMAC butuh body mentah, bukan hasil parse).
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

// Baca body MENTAH sebagai Buffer (untuk verifikasi HMAC webhook).
// Bila req.body sudah terisi (string/Buffer/objek), pakai itu; bila objek,
// serialisasi ulang hanya sebagai jalan darurat — signature Meta dihitung
// dari byte mentah, jadi fungsi ini mengandalkan stream mentah dan TIDAK
// boleh ada body parser di depannya (fungsi Node Vercel polos tidak
// mem-parse body, jadi stream selalu mentah di sini).
function bacaRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === "string") return resolve(Buffer.from(req.body, "utf8"));
      if (typeof req.body === "object") {
        return resolve(Buffer.from(JSON.stringify(req.body), "utf8"));
      }
    }
    const chunks = [];
    let total = 0;
    req.on("data", (c) => {
      const buf = Buffer.isBuffer(c) ? c : Buffer.from(c);
      total += buf.length;
      if (total > 1024 * 1024) {
        const err = new Error("Body terlalu besar");
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
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

module.exports = { ok, dibuat, gagal, hanyaMethod, bacaJson, bacaRawBody, salahInput, tidakKetemu, konflik };
