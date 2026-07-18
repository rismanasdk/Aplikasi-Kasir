import test from "node:test";
import assert from "node:assert/strict";

import { buildPermissionPayload } from "../utils/permissionUtils.js";

test("buildPermissionPayload normalizes code and derives modul when missing", () => {
  const payload = buildPermissionPayload({
    code: "Test.View",
    nama: " Testing ",
    deskripsi: " Ini testing ",
    modul: "",
  });

  assert.equal(payload.code, "test.view");
  assert.equal(payload.nama, "Testing");
  assert.equal(payload.deskripsi, "Ini testing");
  assert.equal(payload.modul, "test");
});

test("buildPermissionPayload keeps an explicit modul", () => {
  const payload = buildPermissionPayload({
    code: "report.view",
    nama: "Lihat Laporan",
    modul: "laporan",
  });

  assert.equal(payload.modul, "laporan");
});