const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const { PKPass } = require('passkit-generator');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from dist directory (after build)
app.use(express.static(path.join(__dirname, '../dist')));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// API endpoint to generate a pass
app.post('/api/generate-pass', async (req, res) => {
  try {
    const { name, cardId, year, photo, barcode } = req.body;

    if (!name || !cardId || !year || !photo || !barcode) {
      return res.status(400).json({ error: 'Missing required card information' });
    }

    // Convert base64 photo to buffer
    const photoData = photo.replace(/^data:image\/\w+;base64,/, '');
    const photoBuffer = Buffer.from(photoData, 'base64');

    // Configure pass
    const pass = new PKPass({
      model: path.join(__dirname, 'pass-models/generic-pass'),
      certificates: {
        wwdr: path.join(__dirname, 'certificates/wwdr.pem'),
        signerCert: path.join(__dirname, 'certificates/signerCert.pem'),
        signerKey: path.join(__dirname, 'certificates/signerKey.pem'),
        signerKeyPassphrase: process.env.SIGNER_KEY_PASSPHRASE
      }
    });

    // Set pass data
    pass.primaryFields.push({
      key: 'name',
      label: 'Name',
      value: name
    });

    pass.secondaryFields.push({
      key: 'id',
      label: 'ID',
      value: cardId
    });

    pass.auxiliaryFields.push({
      key: 'year',
      label: 'Year',
      value: year
    });

    // Add barcode
    pass.barcodes = [{
      message: barcode,
      format: 'PKBarcodeFormatPDF417',
      messageEncoding: 'iso-8859-1'
    }];

    // Add student photo
    pass.addBuffer('thumbnail.png', photoBuffer);
    pass.addBuffer('icon.png', photoBuffer);
    pass.addBuffer('logo.png', photoBuffer);

    // Generate pass file
    const passBuffer = await pass.generate();

    // Save the pass to a temporary file
    const passId = uuidv4();
    const passPath = path.join(__dirname, 'temp', `${passId}.pkpass`);
    
    // Ensure the temp directory exists
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
    }
    
    fs.writeFileSync(passPath, passBuffer);

    // Provide download URL
    const passUrl = `/api/download-pass/${passId}`;

    res.json({ success: true, passUrl });
  } catch (error) {
    console.error('Error generating pass:', error);
    res.status(500).json({ error: 'Failed to generate pass', details: error.message });
  }
});

// API endpoint to download the generated pass
app.get('/api/download-pass/:passId', (req, res) => {
  const passId = req.params.passId;
  const passPath = path.join(__dirname, 'temp', `${passId}.pkpass`);

  if (!fs.existsSync(passPath)) {
    return res.status(404).json({ error: 'Pass not found' });
  }

  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Content-Disposition', 'attachment; filename=student_id.pkpass');
  
  // Stream the file
  const fileStream = fs.createReadStream(passPath);
  fileStream.pipe(res);
  
  // Clean up the file after sending
  fileStream.on('end', () => {
    fs.unlinkSync(passPath);
  });
});

// Serve Vue.js app for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});