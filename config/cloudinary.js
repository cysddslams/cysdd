// config/cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 🔹 Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Default storage for admin posts (images, videos, pdfs)
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';
    let resource_type = 'image';
    if (mime.startsWith('video/')) resource_type = 'video';
    else if (mime.includes('pdf')) resource_type = 'raw';

    return {
      folder: 'sports-management',
      resource_type,
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// 🔹 Admin upload middleware
const adminPostUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

/**
 * Storage for Coach Certificates (jpg, png, pdf allowed)
 */
const coachCertificateStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';
    let resource_type = 'image';
    if (mime.startsWith('video/')) resource_type = 'video';
    else if (mime.includes('pdf')) resource_type = 'raw';

    return {
      folder: 'coach_certificates',
      resource_type,
      public_id: `coach_${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// 🔹 Coach certificates upload middleware
const coachCertificateUpload = multer({
  storage: coachCertificateStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Storage for Coach Event Registration (Team Profile + Appointment Form)
 */
const coachRegisterStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';
    let folder = 'coach_register';
    let resource_type = 'image';

    if (file.fieldname === 'appointment_form') {
      resource_type = 'raw'; // PDF
      folder = 'coach_register/appointment_forms';
    } else if (file.fieldname === 'teamProfile') {
      resource_type = 'image';
      folder = 'coach_register/team_profiles';
    }

    return {
      folder,
      resource_type,
      public_id: `${file.fieldname}_${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// 🔹 Upload middleware for teamProfile & appointment_form
const coachRegisterUpload = multer({
  storage: coachRegisterStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * Storage for Player Registration Documents
 */
const playerDocsStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';
    let resource_type = 'image';
    let folder = 'player_docs';

    if (mime.startsWith('video/')) resource_type = 'video';
    else if (mime.includes('pdf')) resource_type = 'raw';

    // Different folders by fieldname
    if (file.fieldname === 'PSA') {
      folder = 'player_docs/PSA';
    } else if (file.fieldname === 'waiver') {
      folder = 'player_docs/waivers';
    } else if (file.fieldname === 'med_cert') {
      folder = 'player_docs/medical';
    } else if (file.fieldname === 'COR') {
      folder = 'player_docs/COR';
    } else if (file.fieldname === 'TOR_previous_school') {
      folder = 'player_docs/TOR';
    } else if (file.fieldname === 'COG') {
      folder = 'player_docs/COG';
    } else if (file.fieldname === 'entry_form') {
      folder = 'player_docs/entry_form';
    } else if (file.fieldname === 'COE') {
      folder = 'player_docs/COE';
    } else if (file.fieldname === 'authorization_letter') {
      folder = 'player_docs/authorization_letter';
    } else if (file.fieldname === 'school_id') {
      folder = 'player_docs/school_id';
    } else if (file.fieldname === 'certification_lack_units') {
      folder = 'player_docs/certification_lack_units';
    }

    return {
      folder,
      resource_type,
      public_id: `${file.fieldname}_${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// Multer middleware for all player documents
const playerDocsUpload = multer({
  storage: playerDocsStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (req, file, cb) => {
    // Only allow PDF files for all documents
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for all documents'), false);
    }
  }
});

/**
 * Storage for User Profile Pictures
 */
const userProfileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';
    let resource_type = 'image';

    return {
      folder: 'user_profiles',
      resource_type,
      public_id: `profile_${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
    };
  },
});

// 🔹 Multer middleware for user profile uploads
const userProfileUpload = multer({
  storage: userProfileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});


const coachProfileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'coach_profiles',
      resource_type: 'image',
      public_id: `coach_profile_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' }
      ],
      format: 'webp', // Optimize for web
    };
  },
});

// 🔹 Coach profile upload middleware
const coachProfileUpload = multer({
  storage: coachProfileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures'), false);
    }
  }
});



module.exports = {
  cloudinary,
  adminPostUpload,
  coachCertificateUpload,
  coachRegisterUpload,
   playerDocsUpload,
  userProfileUpload,
  coachProfileUpload,
};



