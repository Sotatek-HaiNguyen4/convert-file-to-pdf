const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
app.use(cors());

// Lưu file tạm vào uploads/
const upload = multer({ dest: "uploads/" });

// API 1: Upload và Convert
app.post("/convert", upload.single("file"), async (req, res) => {
    const docxPath = req.file.path;
    const htmlPath = docxPath + ".html";
    const pdfId = uuidv4();
    const pdfPath = path.join(__dirname, "output", pdfId + ".pdf");

    try {
        // Convert DOCX -> HTML
        const { value: htmlContent } = await mammoth.convertToHtml({ path: docxPath });

        await fs.promises.writeFile(htmlPath, htmlContent, "utf8");

        // Puppeteer convert HTML -> PDF
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.goto("file://" + path.resolve(htmlPath), { waitUntil: "networkidle0" });

        await page.pdf({
            path: pdfPath,
            format: "A4",
            printBackground: true,
        });

        await browser.close();

        // Xoá file tạm
        fs.unlinkSync(docxPath);
        fs.unlinkSync(htmlPath);

        // Trả về URL để truy cập PDF
        const pdfUrl = `/pdfs/${pdfId}.pdf`;
        res.json({ success: true, url: pdfUrl });
    } catch (err) {
        console.error(err);
        res.status(500).send("Convert error");
    }
});

// API 2: Serve PDF file
app.use("/pdfs", express.static(path.join(__dirname, "output")));

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
