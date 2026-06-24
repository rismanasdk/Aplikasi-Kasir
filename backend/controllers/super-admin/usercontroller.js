// controllers/super-admin/usercontroller.js
// Re-export admin user controller - super-admin punya akses penuh user management
export {
  getUsers,
  addUser,
  updateUser,
  deleteUser
} from "../admin/usercontroller.js";
