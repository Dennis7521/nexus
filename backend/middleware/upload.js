const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
}

// uploads base directory - use env var for Railway volumes, fallback to local
const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// Ensure uploads directories exist
const profilePicturesDir = path.join(uploadsBaseDir, 'profile-pictures');
const transcriptsDir = path.join(uploadsBaseDir, 'transcripts');

if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}

if (!fs.existsSync(transcriptsDir)) {
  fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Configure storage for profile pictures (temporary for Cloudinary upload)
const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilePicturesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + '-' + uniqueSuffix + ext);
  }
});

// Upload to Cloudinary function
const uploadToCloudinary = async (filePath, folder = 'profile-pictures') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    });
    
    // Delete local file after successful upload
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.error('Could not delete local temp file:', unlinkErr.message);
    }
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Configure storage for transcripts
const transcriptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, transcriptsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + '-' + uniqueSuffix + ext);
  }
});

// File filter - only allow images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// File filter - only allow PDFs
const pdfFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Create multer upload instance for profile pictures
const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFileFilter
});

// Create multer upload instance for transcripts
const uploadTranscript = multer({
  storage: transcriptStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: pdfFileFilter
});

module.exports = {
  uploadProfilePicture,
  uploadTranscript,
  uploadToCloudinary,
  cloudinary
};
