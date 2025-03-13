/**
 * Advanced card processor with specialized text recognition for student IDs
 */
import Tesseract from 'tesseract.js';

// Enhanced preprocessing tailored for different regions
function preprocessImage(imageData, options = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply different preprocessing techniques based on the region type
      if (options.type === 'text') {
        // High contrast processing for text
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale with custom weighting
          const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          
          // Apply adaptive thresholding for better text extraction
          // Use a more aggressive threshold for text
          const threshold = options.darkText ? 100 : 170;
          const value = gray > threshold ? 255 : 0;
          
          data[i] = data[i+1] = data[i+2] = value;
        }
      } else if (options.type === 'barcode') {
        // Specialized processing for barcodes
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale with emphasis on contrast
          const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          
          // Use multiple thresholds to ensure barcode detection
          // This helps with different lighting conditions
          const value = gray > 130 ? 255 : 0;
          
          data[i] = data[i+1] = data[i+2] = value;
        }
        
        // Apply additional processing to enhance barcode features
        // This simulates what specialized barcode readers do
        // First pass: horizontal enhancement
        for (let y = 0; y < canvas.height; y++) {
          let lastValue = 0;
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            if (x > 0) {
              // Enhance horizontal lines by connecting nearby dark pixels
              if (data[idx] === 0 && lastValue === 0) {
                // Fill any small gaps
                const leftIdx = (y * canvas.width + (x-1)) * 4;
                if (x > 1) {
                  const leftLeftIdx = (y * canvas.width + (x-2)) * 4;
                  if (data[leftLeftIdx] === 0 && data[leftIdx] === 255) {
                    data[leftIdx] = data[leftIdx+1] = data[leftIdx+2] = 0;
                  }
                }
              }
            }
            lastValue = data[idx];
          }
        }
      } else if (options.type === 'photo') {
        // Enhance photo quality
        for (let i = 0; i < data.length; i += 4) {
          // Boost colors slightly
          data[i] = Math.min(255, data[i] * 1.1);
          data[i+1] = Math.min(255, data[i+1] * 1.1);
          data[i+2] = Math.min(255, data[i+2] * 1.1);
          
          // Increase contrast a bit
          for (let j = 0; j < 3; j++) {
            data[i+j] = data[i+j] < 128 ? 
              Math.max(0, data[i+j] - 10) : 
              Math.min(255, data[i+j] + 10);
          }
        }
      }
      
      // Put processed image data back to canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageData;
  });
}

// More accurate card detection based on color patterns of Windward school IDs
async function detectCardEdges(imageData) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Analyze color patterns to find card boundaries
      // Specifically looking for the blue and orange/yellow colors
      const blueThreshold = {
        minB: 150,
        maxR: 100,
        maxG: 130
      };
      
      const orangeThreshold = {
        minR: 200,
        minG: 150,
        maxB: 100
      };
      
      let bluePoints = [];
      let orangePoints = [];
      
      // Scan the image to collect blue and orange points
      const scanStep = Math.max(1, Math.floor(canvas.width / 50)); // Adjust based on image size
      
      for (let x = 0; x < canvas.width; x += scanStep) {
        for (let y = 0; y < canvas.height; y += scanStep) {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          
          // Check for blue (Windward School blue header)
          if (pixel[2] > blueThreshold.minB && 
              pixel[0] < blueThreshold.maxR && 
              pixel[1] < blueThreshold.maxG) {
            bluePoints.push({x, y});
          }
          
          // Check for orange/yellow (side banner)
          if (pixel[0] > orangeThreshold.minR && 
              pixel[1] > orangeThreshold.minG && 
              pixel[2] < orangeThreshold.maxB) {
            orangePoints.push({x, y});
          }
        }
      }
      
      // Determine card boundaries if enough colored points found
      let cardBounds = {
        left: 0,
        top: 0,
        right: canvas.width,
        bottom: canvas.height
      };
      
      if (bluePoints.length > 10 && orangePoints.length > 10) {
        // Find extremes for blue (typically top/right of card)
        const blueLeft = Math.min(...bluePoints.map(p => p.x));
        const blueRight = Math.max(...bluePoints.map(p => p.x));
        const blueTop = Math.min(...bluePoints.map(p => p.y));
        const blueBottom = Math.max(...bluePoints.map(p => p.y));
        
        // Find extremes for orange (typically left side of card)
        const orangeLeft = Math.min(...orangePoints.map(p => p.x));
        const orangeRight = Math.max(...orangePoints.map(p => p.x));
        const orangeTop = Math.min(...orangePoints.map(p => p.y));
        const orangeBottom = Math.max(...orangePoints.map(p => p.y));
        
        // Combine to get card boundaries
        cardBounds.left = Math.max(0, Math.min(orangeLeft, blueLeft) - 5);
        cardBounds.right = Math.min(canvas.width, Math.max(orangeRight, blueRight) + 5);
        cardBounds.top = Math.max(0, Math.min(orangeTop, blueTop) - 5);
        cardBounds.bottom = Math.min(canvas.height, Math.max(orangeBottom, blueBottom) + 5);
      }
      
      // Calculate width and height
      cardBounds.width = cardBounds.right - cardBounds.left;
      cardBounds.height = cardBounds.bottom - cardBounds.top;
      
      // Create a cropped card image
      const cardCanvas = document.createElement('canvas');
      const cardCtx = cardCanvas.getContext('2d');
      
      cardCanvas.width = cardBounds.width;
      cardCanvas.height = cardBounds.height;
      
      // Extract just the card region
      cardCtx.drawImage(
        canvas, 
        cardBounds.left, cardBounds.top, cardBounds.width, cardBounds.height,
        0, 0, cardBounds.width, cardBounds.height
      );
      
      // Return the cropped card image and boundaries
      resolve({
        cardImage: cardCanvas.toDataURL('image/jpeg', 0.95),
        bounds: cardBounds
      });
    };
    img.src = imageData;
  });
}

// Precise region extraction based on Windward School ID layout
async function extractCardRegions(cardImage) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Precise Windward School ID card layout
      // These regions are calibrated based on the example images
      const regions = {
        // Photo region - left side of card
        photo: {
          x: Math.floor(img.width * 0.03),
          y: Math.floor(img.height * 0.20),
          width: Math.floor(img.width * 0.35),
          height: Math.floor(img.height * 0.50)
        },
        
        // Name region - centered, lower portion
        name: {
          x: Math.floor(img.width * 0.05),
          y: Math.floor(img.height * 0.72),
          width: Math.floor(img.width * 0.90),
          height: Math.floor(img.height * 0.08)
        },
        
        // ID number - lower left
        idNumber: {
          x: Math.floor(img.width * 0.05),
          y: Math.floor(img.height * 0.80),
          width: Math.floor(img.width * 0.25),
          height: Math.floor(img.height * 0.08)
        },
        
        // Class year - lower center
        classYear: {
          x: Math.floor(img.width * 0.05),
          y: Math.floor(img.height * 0.88),
          width: Math.floor(img.width * 0.40),
          height: Math.floor(img.height * 0.08)
        },
        
        // Barcode region - right side
        barcode: {
          x: Math.floor(img.width * 0.60),
          y: Math.floor(img.height * 0.70),
          width: Math.floor(img.width * 0.35),
          height: Math.floor(img.height * 0.20)
        },
        
        // Orange sidebar with year
        sidebar: {
          x: 0,
          y: 0,
          width: Math.floor(img.width * 0.15),
          height: img.height
        },
        
        // School name/logo in blue header
        header: {
          x: Math.floor(img.width * 0.40),
          y: 0,
          width: Math.floor(img.width * 0.60),
          height: Math.floor(img.height * 0.30)
        }
      };
      
      // Extract each region
      const extractedRegions = {};
      
      const extractRegion = (region, name) => {
        const regionCanvas = document.createElement('canvas');
        regionCanvas.width = region.width;
        regionCanvas.height = region.height;
        const regionCtx = regionCanvas.getContext('2d');
        
        regionCtx.drawImage(
          canvas,
          region.x, region.y, region.width, region.height,
          0, 0, region.width, region.height
        );
        
        extractedRegions[name] = regionCanvas.toDataURL('image/jpeg', 0.95);
      };
      
      // Extract all regions
      Object.entries(regions).forEach(([name, region]) => {
        extractRegion(region, name);
      });
      
      // Also include the full card image
      extractedRegions.fullCard = cardImage;
      
      resolve(extractedRegions);
    };
    img.src = cardImage;
  });
}

// Enhanced OCR with specialized settings for different text types
async function performOCR(imageData, options = {}) {
  try {
    // Apply appropriate preprocessing based on content type
    const processedImage = await preprocessImage(imageData, {
      type: options.type || 'text',
      darkText: options.darkText || false
    });
    
    // Configure OCR options based on content type
    const ocrConfig = {
      lang: 'eng',
      tessedit_char_whitelist: options.whitelist || undefined
    };
    
    // Add OCR customization for specific content types
    if (options.type === 'digit') {
      ocrConfig.tessedit_char_whitelist = '0123456789';
      ocrConfig.tessedit_pageseg_mode = '7'; // Treat as single line
    } else if (options.type === 'name') {
      ocrConfig.tessedit_pageseg_mode = '7'; // Treat as single line
      // Allow only text characters in names
      ocrConfig.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -\'';
    }
    
    // Perform OCR
    const { data } = await Tesseract.recognize(processedImage, 'eng', ocrConfig);
    
    // Post-process the recognized text based on content type
    let text = data.text.trim();
    
    if (options.type === 'name') {
      // Clean up name: remove extra spaces, correct capitalization
      text = text.replace(/\s+/g, ' ').trim();
      
      // Proper capitalization for names
      text = text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    } else if (options.type === 'digit') {
      // Extract numeric digits only
      text = text.replace(/[^0-9]/g, '');
    } else if (options.type === 'classYear') {
      // Look for "Class of YYYY" pattern
      const yearPattern = /class\s+of\s+(\d{4})/i;
      const match = text.match(yearPattern);
      
      if (match) {
        text = `Class of ${match[1]}`;
      } else {
        // If pattern not found, look for just 4 digits (year)
        const yearDigits = text.match(/\d{4}/);
        if (yearDigits) {
          text = `Class of ${yearDigits[0]}`;
        }
      }
    }
    
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    return '';
  }
}

// Specialized barcode extraction with multiple techniques
async function extractBarcode(barcodeImage) {
  try {
    // First approach: Use specialized barcode preprocessing
    const processedImage = await preprocessImage(barcodeImage, { 
      type: 'barcode' 
    });
    
    // Run OCR configured for barcode/digits
    const { data } = await Tesseract.recognize(
      processedImage,
      'eng',
      {
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '6' // Assume uniform block of text
      }
    );
    
    // Extract numeric digits
    let barcode = data.text.replace(/[^0-9]/g, '');
    
    // Check if we got a reasonable result (at least 5 digits)
    if (barcode.length >= 5) {
      return barcode;
    }
    
    // Second approach: Try with different preprocessing settings
    const processedImage2 = await preprocessImage(barcodeImage, {
      type: 'text',
      darkText: true
    });
    
    const { data: data2 } = await Tesseract.recognize(
      processedImage2,
      'eng',
      {
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '6'
      }
    );
    
    barcode = data2.text.replace(/[^0-9]/g, '');
    
    if (barcode.length >= 5) {
      return barcode;
    }
    
    // Third approach: Use the original image
    const { data: data3 } = await Tesseract.recognize(
      barcodeImage,
      'eng',
      {
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '6'
      }
    );
    
    barcode = data3.text.replace(/[^0-9]/g, '');
    
    // If all approaches fail, return empty string
    return barcode;
  } catch (error) {
    console.error('Barcode extraction error:', error);
    return '';
  }
}

// Generate a PDF417-style barcode image 
function generateBarcodeImage(barcodeValue) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 320;
  canvas.height = 120;
  
  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw PDF417-style barcode
  ctx.fillStyle = 'black';
  
  // Draw complex barcode pattern
  const digits = String(barcodeValue).split('');
  const rowHeight = 8;
  const startX = 40;
  let x, y;
  
  // Draw data pattern in multiple rows (PDF417 style)
  for (let row = 0; row < 8; row++) {
    y = 15 + (row * rowHeight);
    x = startX;
    
    // Start pattern for each row
    ctx.fillRect(x, y, 2, rowHeight - 1);
    x += 4;
    
    // Draw pattern based on digits and row
    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i], 10);
      
      // Create a unique pattern for each digit
      for (let j = 0; j < 4; j++) {
        const width = ((digit + j + row) % 4) + 1;
        
        if ((digit + j + row) % 3 !== 1) {
          ctx.fillRect(x, y, width, rowHeight - 1);
        }
        
        x += width + 1;
      }
    }
    
    // End pattern for each row
    ctx.fillRect(x, y, 2, rowHeight - 1);
  }
  
  // Add text below barcode
  ctx.font = '14px monospace';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText(barcodeValue, canvas.width / 2, 105);
  
  return canvas.toDataURL('image/png');
}

// Main function to extract all card data
export async function extractCardData(imageData) {
  try {
    console.log('Starting card data extraction');
    
    // Step 1: Detect card edges and normalize
    const { cardImage } = await detectCardEdges(imageData);
    console.log('Card edges detected');
    
    // Step 2: Extract regions from the normalized card
    const regions = await extractCardRegions(cardImage);
    console.log('Card regions extracted');
    
    // Step 3: Process each region with specialized settings
    
    // Extract name with specialized name processing
    const name = await performOCR(regions.name, { type: 'name' });
    console.log('Name extracted:', name);
    
    // Extract ID number with digit-specific processing
    const cardId = await performOCR(regions.idNumber, { type: 'digit' });
    console.log('ID extracted:', cardId);
    
    // Extract class year with pattern recognition
    const year = await performOCR(regions.classYear, { type: 'classYear' });
    console.log('Year extracted:', year);
    
    // Extract barcode with specialized barcode processing
    const barcode = await extractBarcode(regions.barcode);
    console.log('Barcode extracted:', barcode);
    
    // Generate barcode image for display
    const barcodeImage = generateBarcodeImage(barcode || cardId);
    
    // Extract and enhance photo
    const enhancedPhoto = await preprocessImage(regions.photo, {
      type: 'photo'
    });
    
    // Return the extracted data
    return {
      name,
      cardId,
      year,
      photo: enhancedPhoto || regions.photo,
      barcode,
      barcodeImage
    };
  } catch (error) {
    console.error('Error extracting card data:', error);
    return {
      name: '',
      cardId: '',
      year: '',
      photo: imageData,
      barcode: '',
      barcodeImage: ''
    };
  }
}

// Export the barcode generator for use in other components
export { generateBarcodeImage };