const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/me', authController.verifySession, authController.me);
router.post('/logout', authController.verifySession, authController.logout);
router.get('/users', authController.verifySession, authController.getAllUsers);
router.put('/users/permissions', authController.verifySession, authController.updateUserPermissions);

module.exports = router;

