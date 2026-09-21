const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد الرفع، ولو مش موجود نكرته
const uploadDir = 'uploads/attachments';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعدادات التخزين والأسماء
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // المكان اللي هنحفظ فيه
    },
    filename: function (req, file, cb) {
        // اسم فريد عشان لو ملفين ليهم نفس الاسم ميمسحوش بعض
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// فلترة الملفات المسموحة (صور أو ملفات PDF أو Word بس)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم! مسموح بالصور وملفات الـ PDF و Word فقط.'), false);
    }
};

// تهيئة Multer (بحد أقصى 5 ميجا للملف)
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter
});

module.exports = upload;