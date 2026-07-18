import Permission from "../models/permission.js";
import { PERMISSION_DEFINITIONS } from "./../shared/permissionRegistry.js";

export const normalizePermissionCode = (value = "") => value.trim().toLowerCase();

export const deriveModuleFromCode = (code = "") => {
  const normalizedCode = normalizePermissionCode(code);
  const [moduleName] = normalizedCode.split(".");
  return moduleName?.trim() || "";
};

export const normalizePermissionMode = (value = "active") => {
  const mode = String(value || "").trim().toLowerCase();
  return ["active", "deprecated", "hidden"].includes(mode) ? mode : "active";
};

export const normalizePermissionDefinition = (definition = {}) => {
  const code = normalizePermissionCode(definition.code || "");
  return {
    code,
    nama: definition.nama?.trim() ?? "",
    deskripsi: definition.deskripsi?.trim() ?? "",
    modul: definition.modul?.trim() || deriveModuleFromCode(code),
    mode: normalizePermissionMode(definition.mode),
  };
};

export const syncPermissionsFromRegistry = async () => {
  const definitions = PERMISSION_DEFINITIONS.map(normalizePermissionDefinition);
  const registryCodes = new Set(definitions.map((permission) => permission.code));
  const existingPermissions = await Permission.find({}).lean();
  const now = new Date();

  const syncPromises = definitions.map((permission) =>
    Permission.findOneAndUpdate(
      { code: permission.code },
      {
        $set: {
          nama: permission.nama,
          deskripsi: permission.deskripsi,
          modul: permission.modul,
          mode: permission.mode,
          updated_at: now,
        },
        $setOnInsert: {
          code: permission.code,
          created_at: now,
        },
      },
      { new: true, upsert: true }
    )
  );

  await Promise.all(syncPromises);

  const hiddenPromises = existingPermissions
    .filter((permission) => !registryCodes.has(permission.code?.trim().toLowerCase()))
    .filter((permission) => permission.mode !== "hidden")
    .map((permission) =>
      Permission.updateOne(
        { _id: permission._id },
        { $set: { mode: "hidden", updated_at: now } }
      )
    );

  await Promise.all(hiddenPromises);

  return {
    synced: definitions.length,
    hidden: hiddenPromises.length,
  };
};

export const buildPermissionPayload = (input = {}) => {
  const payload = {};

  if (typeof input.code !== "undefined") {
    payload.code = normalizePermissionCode(input.code);
  }

  if (typeof input.nama !== "undefined") {
    payload.nama = input.nama?.trim() ?? "";
  }

  if (typeof input.deskripsi !== "undefined") {
    payload.deskripsi = input.deskripsi?.trim() ?? "";
  }

  if (typeof input.modul !== "undefined") {
    const trimmedModul = input.modul?.trim();
    if (trimmedModul) {
      payload.modul = trimmedModul;
    } else if (payload.code) {
      payload.modul = deriveModuleFromCode(payload.code);
    }
  }

  if (typeof input.mode !== "undefined") {
    payload.mode = normalizePermissionMode(input.mode);
  }

  return payload;
};
