const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/events/';
    
    // Determine upload path based on field name
    if (file.fieldname === 'promotional_image') {
      uploadPath += 'promotional';
    } else if (file.fieldname === 'map_image') {
      uploadPath += 'maps';
    } else {
      uploadPath += 'misc';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Middleware for event image uploads
const eventImageUpload = upload.fields([
  { name: 'promotional_image', maxCount: 1 },
  { name: 'map_image', maxCount: 1 }
]);

// Error handling middleware for multer
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Image files must be smaller than 5MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Invalid file field',
        message: 'Unexpected file field in upload'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only image files are allowed (jpg, png, gif, etc.)'
    });
  }
  
  next(error);
};

// Helper function to get file paths from multer result
const getFilePaths = (files) => {
  const filePaths = {};
  
  if (files.promotional_image) {
    filePaths.promotional_image = files.promotional_image[0].path.replace(/\\/g, '/');
  }
  
  if (files.map_image) {
    filePaths.map_image = files.map_image[0].path.replace(/\\/g, '/');
  }
  
  return filePaths;
};

module.exports = {
  eventImageUpload,
  handleUploadErrors,
  getFilePaths
};
