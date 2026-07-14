import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBarangFetchMode } from './barangFetchConfig.js';

test('uses the public catalog for guest visitors', () => {
  assert.equal(resolveBarangFetchMode({ token: null, roleCode: '' }), 'public');
});

test('uses the public catalog for regular users without staff roles', () => {
  assert.equal(resolveBarangFetchMode({ token: 'demo-token', roleCode: 'user' }), 'public');
});

test('uses the authorized catalog for staff roles', () => {
  assert.equal(resolveBarangFetchMode({ token: 'demo-token', roleCode: 'admin' }), 'authorized');
});
