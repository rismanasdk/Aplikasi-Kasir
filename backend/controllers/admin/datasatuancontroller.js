import DataSatuan from '../../models/datasatuan.js';
import BahanBaku from '../../models/bahanbaku.js';
import Barang from '../../models/databarang.js';
import { buildBranchFilter, validateAndInjectBranch } from '../../utils/rbacHelper.js';

// Get all Data Satuan
export const getAllDataSatuan = async (req, res) => {
	try {
		const items = await DataSatuan.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
		return res.json(items);
	} catch (err) {
		console.error('getAllDataSatuan error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

// Get one by id
export const getDataSatuanById = async (req, res) => {
	try {
		const { id } = req.params;
		const item = await DataSatuan.findById(id);
		if (!item) return res.status(404).json({ message: 'Data Satuan not found' });
		return res.json(item);
	} catch (err) {
		console.error('getDataSatuanById error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

// Create new
export const createDataSatuan = async (req, res) => {
	try {
		validateAndInjectBranch(req, true);
		const { nama, kode, tipe, deskripsi, isActive } = req.body;

		const exists = await DataSatuan.findOne({ ...buildBranchFilter(req.user), $or: [{ nama }, { kode }] });
		if (exists) {
			return res.status(400).json({ message: 'Nama atau kode sudah ada' });
		}

		const newItem = new DataSatuan({ nama, kode, tipe, deskripsi: deskripsi || '', isActive: isActive ?? true, branch_id: req.body.branch_id || req.user?.branch_id || null });
		const saved = await newItem.save();
		return res.status(201).json(saved);
	} catch (err) {
		console.error('createDataSatuan error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

// Update
export const updateDataSatuan = async (req, res) => {
	try {
		const { id } = req.params;
		const { nama, kode, tipe, deskripsi, isActive } = req.body;

		const item = await DataSatuan.findById(id);
		if (!item) return res.status(404).json({ message: 'Data Satuan not found' });

		// check uniqueness if changed
		if (nama && nama !== item.nama) {
			const exists = await DataSatuan.findOne({ ...buildBranchFilter(req.user), nama });
			if (exists) return res.status(400).json({ message: 'Nama sudah ada' });
		}
		if (kode && kode !== item.kode) {
			const exists = await DataSatuan.findOne({ ...buildBranchFilter(req.user), kode });
			if (exists) return res.status(400).json({ message: 'Kode sudah ada' });
		}

		item.nama = nama ?? item.nama;
		item.kode = kode ?? item.kode;
		item.tipe = tipe ?? item.tipe;
		item.deskripsi = deskripsi ?? item.deskripsi;
		if (typeof isActive !== 'undefined') item.isActive = isActive;

		const updated = await item.save();
		return res.json(updated);
	} catch (err) {
		console.error('updateDataSatuan error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

// Delete
export const deleteDataSatuan = async (req, res) => {
	try {
		const { id } = req.params;
		const item = await DataSatuan.findById(id);
		if (!item) return res.status(404).json({ message: 'Data Satuan not found' });
		// Check if this satuan is referenced in BahanBaku or Data-Barang
		const candidates = [item.nama, item.kode, item.nama.toLowerCase(), item.kode.toLowerCase()];

		const usedInBahanBaku = await BahanBaku.findOne({
			$or: [
				{ satuan: { $in: candidates } },
				{ 'bahan.satuan': { $in: candidates } }
			]
		});

		const usedInBarang = await Barang.findOne({
			$or: [
				{ 'bahan_baku.bahan.satuan': { $in: candidates } },
				{ 'bahan_baku.satuan': { $in: candidates } }
			]
		});

		if (usedInBahanBaku || usedInBarang) {
			// If used, only soft-delete (mark inactive)
			item.isActive = false;
			const updated = await item.save();
			return res.json({ message: 'Satuan in use — set to inactive (soft-delete)', item: updated });
		}

		// Not used anywhere — allow hard delete
		await DataSatuan.deleteOne({ _id: item._id });
		return res.json({ message: 'Deleted successfully (hard delete)' });
	} catch (err) {
		console.error('deleteDataSatuan error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

