const express = require('express');
const multer = require('multer');
const path = require('path');
const stockController = require('../controllers/stockController');

const upload = multer({ dest: path.join(__dirname, '..', 'storage', 'tmp') });

module.exports = (io) => {
  const router = express.Router();

  router.post('/upload', upload.single('file'), (req, res) => {
    stockController.startUpload(req, res, io);
  });

  router.post('/control/:runId', (req, res) => {
    stockController.controlRun(req, res);
  });

  return router;
};

