# RBAC & Multi-Branch Implementation Guide

## Overview

This document describes the Dynamic Role-Based Access Control (RBAC) and Multi-Branch architecture implemented in Sprint 6.

### Architecture Principles

1. **Single Backend**: One Express server handles all branches
2. **Single AI Service**: One FastAPI service processes all data
3. **Single Frontend**: One React app (future Vue/Angular/Svelte can use same API)
4. **Dynamic RBAC**: Permissions are managed in database, not hardcoded
5. **Branch Isolation**: All queries filtered by `branch_id`
6. **Framework Agnostic**: Backend API works with any frontend framework

---

## Database Models

### 1. Branch (`Branches`)

```javascript
{
  _id: ObjectId,
  nama: String,           // "Pusat", "Bandung", etc.
  alamat: String,
  telepon: String,
  status: "aktif" | "nonaktif",
  created_at: Date,
  updated_at: Date
}
```

### 2. Permission (`Permissions`)

```javascript
{
  _id: ObjectId,
  code: String,           // "transaction.create", "dashboard.view"
  nama: String,           // "Buat Transaksi", "Lihat Dashboard"
  deskripsi: String,
  modul: String,          // "transaction", "dashboard", "product"
  created_at: Date,
  updated_at: Date
}
```

### 3. Role (`Roles`)

```javascript
{
  _id: ObjectId,
  nama: String,           // "Super Admin", "Manager", "Kasir"
  deskripsi: String,
  tipe: "pusat" | "cabang" | "sistem",
  status: "aktif" | "nonaktif",
  permissions: [ObjectId],  // Array of Permission IDs
  created_at: Date,
  updated_at: Date
}
```

### 4. User (`Users`) - Updated

```javascript
{
  _id: ObjectId,
  nama_lengkap: String,
  username: String,
  password: String,       // hashed
  role: String,           // Legacy field for backward compatibility
  branch_id: ObjectId,    // NULL for super-admin/admin, required for others
  status: "aktif" | "nonaktif",
  googleId: String,
  created_at: Date,
  updated_at: Date
}
```

---

## Middleware Stack

### 1. `verifyToken()` - Authentication

Verifies JWT and extracts user data into `req.user`:

```javascript
req.user = {
  id: "...",
  username: "...",
  role: "...",
  branch_id: "...",     // ObjectId or null
  permissions: ["transaction.create", "dashboard.view", ...]
}
```

### 2. `requirePermission(permissionCode)` - Authorization

Checks if user has specific permission:

```javascript
router.post(
  "/transaction",
  verifyToken,
  requirePermission("transaction.create"),
  createTransaction,
);
```

### 3. `requireBranch()` - Branch Validation

Ensures user has `branch_id` if they're not super-admin/admin:

```javascript
router.get("/transaction", verifyToken, requireBranch(), getTransactions);
```

### 4. `verifyBranchAccess()` - Branch Ownership

Verifies user can access specific branch resource:

```javascript
router.get(
  "/transaction/:branchId/:id",
  verifyToken,
  requireBranch(),
  verifyBranchAccess("branchId"),
  getTransaction,
);
```

---

## Helper Functions (rbacHelper.js)

### buildBranchFilter(user, field = "branch_id")

Returns MongoDB filter object based on user role/branch:

```javascript
// Super Admin/Admin - no filter (access all)
buildBranchFilter(superAdmin) → {}

// Manager - filter by their branch
buildBranchFilter(manager) → { branch_id: manager.branch_id }
```

### canAccessBranch(user, branchId)

Returns boolean whether user can access branch:

```javascript
if (!canAccessBranch(req.user, resourceBranchId)) {
  return res.status(403).json({ message: "Access denied" });
}
```

### hasPermission(user, permissionCode)

Returns boolean whether user has permission:

```javascript
if (!hasPermission(req.user, "transaction.delete")) {
  return res.status(403).json({ message: "Permission denied" });
}
```

### validateAndInjectBranch(req, required = false)

Validates and auto-injects `branch_id` into request body:

```javascript
const result = validateAndInjectBranch(req);
if (!result.isValid) {
  return res.status(403).json({ error: result.error });
}
// req.body.branch_id is now injected
```

---

## Usage Examples

### Example 1: Simple Permission Check

```javascript
import verifyToken from "../middleware/verifyToken.js";
import requirePermission from "../middleware/requirePermission.js";

router.delete(
  "/transaction/:id",
  verifyToken,
  requirePermission("transaction.delete"),
  deleteTransaction,
);
```

### Example 2: Branch-Aware Query

```javascript
import { buildBranchFilter } from "../utils/rbacHelper.js";

export const getTransactions = async (req, res) => {
  try {
    const branchFilter = buildBranchFilter(req.user);
    const transactions = await Transaksi.find(branchFilter);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Example 3: Data Modification with Branch Injection

```javascript
import { validateAndInjectBranch } from "../utils/rbacHelper.js";

export const createTransaction = async (req, res) => {
  try {
    const validation = validateAndInjectBranch(req);
    if (!validation.isValid) {
      return res.status(403).json({ error: validation.error });
    }

    // req.body.branch_id is now set correctly
    const transaksi = new Transaksi(req.body);
    await transaksi.save();
    res.status(201).json(transaksi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Example 4: Aggregation with Branch Filter

```javascript
import { buildBranchMatchStage } from "../utils/rbacHelper.js";

export const getDashboardStats = async (req, res) => {
  try {
    const matchStage = buildBranchMatchStage(req.user);

    const stats = await Transaksi.aggregate([
      matchStage,
      { $match: { status: "selesai" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total_harga" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## Default Roles & Permissions

### Super Admin

- **Access**: All branches
- **Permissions**: All (defined in seed script)
- **Branch Assignment**: NULL

### Admin

- **Access**: All branches
- **Permissions**: All except system management
- **Branch Assignment**: NULL

### Manager

- **Access**: Own branch only
- **Permissions**: Dashboard, Reports, Transactions (read/create), Forecasts, Stock management
- **Branch Assignment**: Required (specific branch)

### Kasir

- **Access**: Own branch only
- **Permissions**: Transactions (create/read/print), Stock view
- **Branch Assignment**: Required (specific branch)

### Chef

- **Access**: Own branch only
- **Permissions**: Transactions (read), Stock view
- **Branch Assignment**: Required (specific branch)

### Security

- **Access**: Own branch only
- **Permissions**: Security logs, Dashboard view
- **Branch Assignment**: Required (specific branch)

---

## Setup Instructions

### 1. Initialize RBAC Database

```bash
cd backend
node scripts/seedRBACFoundation.js
```

This will create:

- 4 Branches (Pusat, Bandung, Jakarta, Bekasi)
- 30+ Permissions
- 6 Default Roles with permissions assigned

### 2. Update Existing Users

Migrate existing users to a branch (usually Pusat for central office staff):

```bash
node scripts/migrateUsersToRBAC.js
```

### 3. Update JWT Generation

When generating JWT, include `branch_id` and `permissions`:

```javascript
// In auth controller
const permissions =
  user.role === "super-admin"
    ? ["*"] // All permissions
    : []; // Load from database later

const token = jwt.sign(
  {
    id: user._id,
    username: user.username,
    role: user.role,
    branch_id: user.branch_id,
    permissions: permissions,
  },
  process.env.JWT_SECRET,
  { expiresIn: "24h" },
);
```

---

## Migration Strategy

### Phase 1: Add branch_id to existing data

1. Create migration script to assign all existing records to "Pusat" branch
2. Handle NULL branch_id gracefully (backward compatibility)

### Phase 2: Update all endpoints

1. Add branch filtering to queries
2. Add permission checks to mutations
3. Test for data isolation

### Phase 3: Frontend updates

1. Store branch_id in context after login
2. Add branch selector for super-admin
3. Hide/show menu items based on permissions

---

## Testing Checklist

- [ ] Super Admin can access all branches
- [ ] Admin can access all branches
- [ ] Manager can only see own branch
- [ ] Kasir cannot access manager endpoints
- [ ] Cross-branch access returns 403
- [ ] Permission checks work correctly
- [ ] Branch filter applied to all queries
- [ ] New transactions assigned to user's branch
- [ ] Reports filtered by branch
- [ ] Dashboard shows correct branch data
- [ ] AI Service receives filtered data only

---

## Future Enhancements

1. **Dynamic Permission Assignment**: Admin can create custom roles and assign permissions
2. **Branch Switching**: Super Admin can switch context to any branch
3. **Audit Logging**: Track who accessed what data and when
4. **Multi-branch Analytics**: Aggregate data across branches with proper filtering
5. **Mobile App Support**: Same API works with native mobile apps (iOS/Android)
6. **GraphQL API**: Alternative query language while keeping REST as default

---

## Troubleshooting

### "Permission denied" when user should have access

Check:

1. Is JWT token being generated with correct permissions?
2. Are permissions loaded from database or hardcoded?
3. Is the permission code correct (e.g., "transaction.create" vs "transaction:create")?

### "Cannot access branch" error

Check:

1. Does user have branch_id in database?
2. Is branch_id populated in JWT token?
3. Is the requested resource's branch_id matching user's branch_id?

### Data appearing from multiple branches

Check:

1. Is branch filter being applied to all queries?
2. Are old records without branch_id being included?
3. Are NULL branch_id records filtered correctly?

---

## API Documentation

See `docs/API.md` for endpoint documentation with RBAC requirements.
