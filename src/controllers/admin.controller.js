const adminService = require('../services/admin.service');

exports.adminCreateUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await adminService.createUser(username, password);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await adminService.login(username, password);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.adminLogout = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await adminService.logout(userId);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.adminRefresh = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await adminService.refresh(userId);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};






