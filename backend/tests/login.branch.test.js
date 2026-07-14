import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { login } from '../auth/Login.js';
import User from '../models/user.js';
import Branch from '../models/branch.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const testUsername = `login-branch-${Date.now()}`;
const testPassword = 'test-password-123';

const connect = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

test('login creates a fallback branch when user has no branch_id', async () => {
  await connect();

  const hashedPassword = await bcrypt.hash(testPassword, 10);
  const insertedUser = await User.collection.insertOne({
    nama_lengkap: 'Login Branch Test',
    username: testUsername,
    password: hashedPassword,
    role: 'user',
    status: 'nonaktif',
    created_at: new Date(),
    updated_at: new Date(),
  });

  const req = { body: { username: testUsername, password: testPassword } };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  try {
    await login(req, res);

    assert.equal(res.statusCode, null);
    assert.equal(res.body.message, 'Login berhasil');
    assert.ok(res.body.token);

    const user = await User.findById(insertedUser.insertedId);
    assert.ok(user.branch_id);

    const branch = await Branch.findById(user.branch_id);
    assert.ok(branch);
    assert.equal(branch.status, 'aktif');
  } finally {
    await User.deleteOne({ _id: insertedUser.insertedId });
    await Branch.deleteMany({ nama: /Login Branch Test|Pusat/i });
    await mongoose.disconnect();
  }
});
