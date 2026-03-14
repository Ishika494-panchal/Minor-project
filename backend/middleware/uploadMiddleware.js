const multer = require('multer');
const path = require('path');
const fs = require('fs');

const submissionsDir = path.join(__dirname, '..', 'uploads', 'submissions');
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, submissionsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const zipOnlyFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext !== '.zip') {
    return cb(new Error('Only .zip files are allowed'));
  }
  cb(null, true);
};

const uploadProjectZip = multer({
  storage,
  fileFilter: zipOnlyFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

module.exports = { uploadProjectZip };
