/**
 * Simplified card processor with enhanced OCR optimization
 */
import Tesseract from 'tesseract.js';

// Default fallback values for this specific card
const DEFAULT_NAME = 'Unknown';
const DEFAULT_ID = '1';
const DEFAULT_YEAR = 'Class of Unknown';

/**
 * Enhance image contrast for better OCR
 */
function enhanceContrast(imageData, level = 1.5) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      // Enhance contrast
      const factor = level;
      const intercept = 128 * (1 - factor);
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * data[i] + intercept;
        data[i+1] = factor * data[i+1] + intercept;
        data[i+2] = factor * data[i+2] + intercept;
      }
      
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageData;
  });
}

/**
 * Threshold image to black and white
 */
function thresholdImage(imageData, threshold = 128) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        const val = avg > threshold ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = val;
      }
      
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageData;
  });
}

/**
 * Extract predefined regions from image
 */
function extractRegions(imageData) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Define regions for Windward School ID cards
      // These measurements are based on the example image
      // and are percentages of the overall card dimensions
      const regionDefs = {
        // Left area - photo
        photo: {
          x: 0.2,       // 20% from left
          y: 0.2,       // 20% from top
          width: 0.3,   // 30% of card width
          height: 0.5   // 50% of card height
        },
        // Bottom area with name
        name: {
          x: 0.2,       // 20% from left
          y: 0.7,       // 70% from top
          width: 0.6,   // 60% of card width
          height: 0.08  // 8% of card height
        },
        // Bottom area with ID
        id: {
          x: 0.2,       // 20% from left
          y: 0.78,      // 78% from top
          width: 0.3,   // 30% of card width
          height: 0.08  // 8% of card height
        },
        // Bottom area with class year
        year: {
          x: 0.2,       // 20% from left
          y: 0.86,      // 86% from top
          width: 0.4,   // 40% of card width
          height: 0.08  // 8% of card height
        },
        // Right area with barcode
        barcode: {
          x: 0.6,       // 60% from left
          y: 0.65,      // 65% from top
          width: 0.35,  // 35% of card width
          height: 0.3   // 30% of card height
        }
      };
      
      const regions = {};
      
      // Extract each region
      for (const [name, region] of Object.entries(regionDefs)) {
        const x = Math.floor(canvas.width * region.x);
        const y = Math.floor(canvas.height * region.y);
        const width = Math.floor(canvas.width * region.width);
        const height = Math.floor(canvas.height * region.height);
        
        const regionCanvas = document.createElement('canvas');
        regionCanvas.width = width;
        regionCanvas.height = height;
        const regionCtx = regionCanvas.getContext('2d');
        
        regionCtx.drawImage(
          canvas,
          x, y, width, height,
          0, 0, width, height
        );
        
        regions[name] = regionCanvas.toDataURL('image/jpeg', 0.95);
      }
      
      // Also add the full card
      regions.fullCard = imageData;
      
      resolve(regions);
    };
    img.src = imageData;
  });
}

/**
 * Recognize text with optimal settings for each field type
 */
async function recognizeText(imageData, fieldType) {
  try {
    // Apply specific preprocessing based on field type
    let processedImage;
    
    if (fieldType === 'name') {
      // For name, use higher contrast
      processedImage = await enhanceContrast(imageData, 1.7);
    } else if (fieldType === 'id') {
      // For ID, use binary thresholding to isolate digits
      const contrastImage = await enhanceContrast(imageData, 1.8);
      processedImage = await thresholdImage(contrastImage, 150);
    } else if (fieldType === 'year') {
      // For class year, use moderate contrast
      processedImage = await enhanceContrast(imageData, 1.5);
    } else if (fieldType === 'barcode') {
      // For barcode, use binary thresholding with lower threshold
      const contrastImage = await enhanceContrast(imageData, 2.0);
      processedImage = await thresholdImage(contrastImage, 120);
    } else {
      // Default enhancement
      processedImage = await enhanceContrast(imageData, 1.4);
    }
    
    // Configure Tesseract options based on field type
    const config = {};
    
    if (fieldType === 'id' || fieldType === 'barcode') {
      config.tessedit_char_whitelist = '0123456789';
    } else if (fieldType === 'name') {
      // Allow letters, spaces, and some punctuation for names
      config.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -\'';
    }
    
    // Special PSM modes for different field types
    if (fieldType === 'id') {
      config.tessedit_pageseg_mode = '7'; // Treat as single line of text
    } else if (fieldType === 'barcode') {
      config.tessedit_pageseg_mode = '6'; // Assume a single uniform block of text
    } else if (fieldType === 'name') {
      config.tessedit_pageseg_mode = '7'; // Treat as single line of text
    }
    
    // Perform OCR with configured settings
    const result = await Tesseract.recognize(processedImage, 'eng', {
      ...config,
      logger: m => console.log(`OCR ${fieldType}: ${m.status}`)
    });
    
    // Clean and normalize the recognized text
    let text = result.data.text.trim();
    
    // Apply field-specific post-processing
    if (fieldType === 'name') {
      // Remove extra spaces, fix capitalization
      text = text.replace(/\s+/g, ' ').trim();
      
      // Proper capitalization for names (first letter of each word uppercase)
      text = text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
      
      // If name is nonsense, use default
      if (!/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text)) {
        console.log(`Name '${text}' appears invalid, using default`);
        text = DEFAULT_NAME;
      }
    } else if (fieldType === 'id') {
      // Extract only digits
      const digits = text.replace(/\D/g, '');
      
      // Validate ID format
      if (/^\d{5,8}$/.test(digits)) {
        text = digits;
      } else {
        console.log(`ID '${digits}' appears invalid, using default`);
        text = DEFAULT_ID;
      }
    } else if (fieldType === 'year') {
      // Look for class year pattern
      const yearMatch = text.match(/class\s+of\s+(\d{4})/i);
      if (yearMatch) {
        text = `Class of ${yearMatch[1]}`;
      } else {
        // Look for just a 4-digit year
        const digitMatch = text.match(/\d{4}/);
        if (digitMatch) {
          text = `Class of ${digitMatch[0]}`;
        } else {
          console.log(`Year '${text}' appears invalid, using default`);
          text = DEFAULT_YEAR;
        }
      }
    } else if (fieldType === 'barcode') {
      // Clean up barcode to just digits
      const digits = text.replace(/\D/g, '');
      if (digits.length > 4) {
        text = digits;
      } else {
        // If barcode extraction failed, use ID
        text = DEFAULT_ID;
      }
    }
    
    return text;
  } catch (error) {
    console.error(`OCR Error (${fieldType}):`, error);
    
    // Return defaults on error
    if (fieldType === 'name') return DEFAULT_NAME;
    if (fieldType === 'id') return DEFAULT_ID;
    if (fieldType === 'year') return DEFAULT_YEAR;
    if (fieldType === 'barcode') return DEFAULT_ID;
    
    return '';
  }
}

/**
 * Generate a simple barcode image
 */
function generateBarcodeImage(value) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 320;
  canvas.height = 100;
  
  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw barcode lines
  ctx.fillStyle = 'black';
  
  // Convert value to digits
  const digits = String(value).padStart(6, '0').split('').map(d => parseInt(d, 10));
  
  // Draw barcode pattern
  const startX = 20;
  const barHeight = 70;
  let x = startX;
  
  // Draw start marker
  ctx.fillRect(x, 15, 2, barHeight);
  x += 4;
  
  // Draw digit patterns
  for (const digit of digits) {
    // Create unique pattern for each digit
    const barCount = 4 + (digit % 3);
    
    for (let i = 0; i < barCount; i++) {
      const barWidth = 1 + (i % 3);
      ctx.fillRect(x, 15, barWidth, barHeight);
      x += barWidth + 2;
    }
    
    // Space between digits
    x += 4;
  }
  
  // Draw end marker
  ctx.fillRect(x, 15, 2, barHeight);
  
  // Add text
  ctx.font = '16px monospace';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText(value, canvas.width / 2, 95);
  
  return canvas.toDataURL('image/png');
}

/**
 * Main function to extract all card data
 */
export async function extractCardData(imageData, updateProgress) {
  try {
    // Step 1: Extract regions directly (skip edge detection for simplicity)
    updateProgress?.("Extracting card regions...");
    const regions = await extractRegions(imageData);
    
    // Step 2: Process each region with optimal settings
    
    // Extract name
    updateProgress?.("Recognizing name...");
    const name = await recognizeText(regions.name, 'name');
    console.log('Name extracted:', name);
    
    // Extract ID number
    updateProgress?.("Recognizing ID number...");
    const cardId = await recognizeText(regions.id, 'id');
    console.log('ID extracted:', cardId);
    
    // Extract class year
    updateProgress?.("Recognizing class year...");
    const year = await recognizeText(regions.year, 'year');
    console.log('Year extracted:', year);
    
    // Extract barcode
    updateProgress?.("Recognizing barcode...");
    const barcode = await recognizeText(regions.barcode, 'barcode');
    console.log('Barcode extracted:', barcode);
    
    // Generate barcode image
    updateProgress?.("Generating barcode image...");
    const barcodeImage = generateBarcodeImage(barcode || cardId);
    
    // Prepare final data
    const extractedData = {
      name,
      cardId,
      year,
      photo: regions.photo,
      barcode: barcode || cardId,
      barcodeImage,
      confidence: {
        name: name === DEFAULT_NAME ? 'low' : 'high',
        cardId: cardId === DEFAULT_ID ? 'low' : 'high',
        year: year === DEFAULT_YEAR ? 'low' : 'high'
      },
      // Only add suggestions for fields with low confidence
      suggestedName: name === DEFAULT_NAME ? DEFAULT_NAME : null,
      suggestedId: cardId === DEFAULT_ID ? DEFAULT_ID : null,
      suggestedYear: year === DEFAULT_YEAR ? DEFAULT_YEAR : null
    };
    
    updateProgress?.("Extraction complete!");
    return extractedData;
    
  } catch (error) {
    console.error('Error extracting card data:', error);
    updateProgress?.("Error in extraction, using fallback data");
    
    // Return fallback data on error
    return {
      name: DEFAULT_NAME,
      cardId: DEFAULT_ID,
      year: DEFAULT_YEAR,
      photo: imageData,
      barcode: DEFAULT_ID,
      barcodeImage: generateBarcodeImage(DEFAULT_ID),
      confidence: {
        name: 'low',
        cardId: 'low',
        year: 'low'
      },
      suggestedName: DEFAULT_NAME,
      suggestedId: DEFAULT_ID,
      suggestedYear: DEFAULT_YEAR
    };
  }
}

// Export functions
export { generateBarcodeImage };