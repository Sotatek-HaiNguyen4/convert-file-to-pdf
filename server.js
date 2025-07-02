const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');



const app = express();
const PORT = 3003;

app.use(cors());


// Cấu hình upload
const upload = multer({ dest: 'uploads/' });

// Public thư mục PDF để FE tải
app.use('/pdfs', express.static(path.join(__dirname, 'output')));

app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = path.resolve(req.file.path);
    const outputDir = path.resolve(__dirname, 'output');
    const uniqueName = uuidv4();
    const targetFileName = `${uniqueName}.pdf`;
    const targetPath = path.join(outputDir, targetFileName);

    // Chạy LibreOffice để convert
    const command = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`;

    exec(command, (error, stdout, stderr) => {
        // Xóa file gốc
        fs.unlinkSync(inputPath);

        if (error) {
            console.error(stderr);
            return res.status(500).json({ error: 'Convert failed', detail: stderr });
        }

        // LibreOffice xuất ra file theo tên gốc => cần rename
        const originalName = path.parse(req.file.originalname).name + '.pdf';
        const convertedPath = path.join(outputDir, originalName);

        // Rename file thành tên ngẫu nhiên
        fs.renameSync(convertedPath, targetPath);

        // Trả về URL
        return res.json({ url: `/pdfs/${targetFileName}` });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
