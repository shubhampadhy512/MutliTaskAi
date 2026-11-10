import multer from "multer";

const ALLOWED = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 3 }, // 10 MB, max 3 files
    fileFilter: (req, file, cb) => {
        if (ALLOWED.includes(file.mimetype)) cb(null, true);
        else cb(new Error("File type not allowed"));
    },
});