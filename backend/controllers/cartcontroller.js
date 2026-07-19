import Cart from "../models/cart.js";
import Barang from "../models/databarang.js";

// Get cart user
export const getCart = async (req, res) => {
  try {
    // prefer to match both userId and branch_id when available
    const query = { userId: req.user.id };
    if (req.user.branch_id) query.branch_id = req.user.branch_id;
    const cart = await Cart.findOne(query);
    res.json(cart || { items: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambah item ke cart
export const addToCart = async (req, res) => {
  try {
    const { barangId, quantity } = req.body;

    const barang = await Barang.findById(barangId);
    if (!barang) return res.status(404).json({ message: "Barang tidak ditemukan" });

    // find existing cart for the user and branch (if branch set)
    const findQuery = { userId: req.user.id };
    if (req.user.branch_id) findQuery.branch_id = req.user.branch_id;

    let cart = await Cart.findOne(findQuery);
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [], branch_id: req.user.branch_id || null });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.barangId.toString() === barangId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;

      // kalau quantity hasilnya 0 atau kurang, hapus item itu
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    } else if (quantity > 0) {
      cart.items.push({
        barangId,
        name: barang.nama_barang,
        price: barang.hargaFinal ?? barang.harga_jual,
        quantity,
        image: barang.gambar_url,
      });
    }

    // kalau cart kosong setelah update -> hapus dokumen
    if (cart.items.length === 0) {
      // delete only the specific cart document
      await Cart.deleteOne({ _id: cart._id });
      return res.json({ message: "Keranjang dihapus karena kosong" });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hapus 1 item dari cart
export const removeFromCart = async (req, res) => {
  try {
    const { barangId } = req.params;

    const findQuery = { userId: req.user.id };
    if (req.user.branch_id) findQuery.branch_id = req.user.branch_id;
    const cart = await Cart.findOne(findQuery);
    if (!cart) return res.status(404).json({ message: "Keranjang kosong" });

    cart.items = cart.items.filter(
      (item) => item.barangId.toString() !== barangId
    );

    // kalau udah kosong, hapus dokumen langsung
    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.json({ message: "Keranjang dihapus karena kosong" });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const findQuery = { userId: req.user.id };
    if (req.user.branch_id) findQuery.branch_id = req.user.branch_id;
    await Cart.deleteOne(findQuery);
    res.json({ message: "Keranjang dikosongkan" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
