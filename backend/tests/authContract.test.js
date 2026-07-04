import test from "node:test";
import assert from "node:assert/strict";
import { buildAuthMePayload } from "../auth/authContract.js";

test("buildAuthMePayload returns role, branch, and permissions in a normalized shape", () => {
  const user = {
    _id: "user-1",
    nama_lengkap: "Test User",
    username: "testuser",
    role: "admin",
    role_id: "role-1",
    branch_id: "branch-1",
    profilePicture: "https://example.com/avatar.png",
    status: "aktif",
  };

  const role = {
    _id: "role-1",
    nama: "Admin",
    permissions: [{ code: "product.read" }, { code: "transaction.create" }],
  };

  const branch = {
    _id: "branch-1",
    nama: "Cabang Utama",
  };

  const payload = buildAuthMePayload(user, role, branch);

  assert.equal(payload.user.id, "user-1");
  assert.equal(payload.user.username, "testuser");
  assert.equal(payload.role.id, "role-1");
  assert.equal(payload.role.name, "Admin");
  assert.deepEqual(payload.permissions, ["product.read", "transaction.create"]);
  assert.deepEqual(payload.branch, { id: "branch-1", name: "Cabang Utama" });
});
