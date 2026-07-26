import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { buildAuthMePayload } from "../auth/authContract.js";
import { buildBranchFilter, validateAndInjectBranch } from "../utils/rbacHelper.js";

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
  assert.equal(payload.role.code, "admin");
  assert.equal(payload.role.name, "Admin");
  assert.deepEqual(payload.permissions, ["product.read", "transaction.create"]);
  assert.deepEqual(payload.branch, { id: "branch-1", name: "Cabang Utama" });
});

test("validateAndInjectBranch overwrites branch overrides with the authenticated branch", () => {
  const req = {
    body: { branch_id: "different-branch" },
    user: {
      branch_id: "branch-1",
      permissions: ["branch.global"],
    },
  };

  const result = validateAndInjectBranch(req, true);

  assert.equal(result.isValid, true);
  assert.equal(req.body.branch_id, "branch-1");
  assert.equal(result.branchId, "branch-1");
});

test("buildBranchFilter matches ObjectId-like branch values and keeps Pusat fallback", () => {
  const branchId = "507f1f77bcf86cd799439011";
  const filter = buildBranchFilter({ branch_id: branchId, branchName: "Pusat", permissions: [] });

  assert.ok(filter.$or);
  assert.equal(filter.$or.length, 3);
  assert.ok(filter.$or[0].$or);
  assert.equal(filter.$or[0].$or.length, 3);
  assert.equal(filter.$or[0].$or[0].branch_id, branchId);
  assert.equal(filter.$or[0].$or[1].branch_id, branchId);
  assert.ok(filter.$or[0].$or[2].branch_id instanceof mongoose.Types.ObjectId);
  assert.equal(filter.$or[0].$or[2].branch_id.toString(), branchId);
});
