const express = require('express');
const router = express.Router();

const { isAdmin } = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');


router.post('/', adminController.adminCreateUser);
router.post('/login', adminController.adminLogin);
router.post('/logout', adminController.adminLogout);
router.post('/refresh', adminController.adminRefresh);

// router.post('/users/bots', isAdmin, adminController.getAllUsers);
router.post('/users/:userId/verify', isAdmin, userController.verifyUser);
router.post('/users/:userId/reject', isAdmin, userController.rejectUser);
router.put('/users/:userId/ban', isAdmin, userController.updateUserBanStatus);
router.get('/users', isAdmin, userController.getAllUsers);
router.get('/users/:userId', isAdmin, userController.getUserById);
router.put('/users/:userId', isAdmin, userController.updateUser);
router.delete('/users/:userId', isAdmin, userController.deleteUser);


module.exports = router; 