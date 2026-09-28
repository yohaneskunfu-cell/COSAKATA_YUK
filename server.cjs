import express from 'express';
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Endpoint untuk menyimpan data (log / report)
app.post('/api/save-data', (req, res) => {
  const data = req.body;
  console.log("Data diterima dari frontend:", data);
  
  // Contoh penyimpanan sederhana ke file JSON lokal atau database Anda
  // Anda bisa sesuaikan dengan logika database yang ada di folder api/db.js
  
  res.status(200).json({ success: true, message: "Data berhasil disimpan!" });
});

app.listen(PORT, () => {
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});