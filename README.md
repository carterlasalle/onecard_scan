# OneCard Scan

A web application that allows users to scan student ID cards (OneCards) and create Apple Wallet passes containing the extracted information.

## Features

- Web-based camera interface for scanning student ID cards
- Automatic card alignment detection
- Extracts key information from the card:
  - Student name
  - Barcode/ID number
  - Year/Class
  - Student photo
- Generates an Apple Wallet pass with the extracted information
- Mobile-friendly design optimized for iPhone

## Technology Stack

- Frontend: HTML, CSS, JavaScript, Vue.js
- Image Processing: OpenCV.js, Tesseract.js (OCR)
- Barcode Detection: Dynamsoft Barcode Reader
- Apple Wallet Pass Generation: Pass.js
- Build Tools: Vite, npm/yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/carterlasalle/onecard_scan.git
cd onecard_scan
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Build for production:
```bash
yarn build
```

## Usage

1. Open the web application on your iPhone
2. Grant camera access when prompted
3. Align your student ID card within the guide frame
4. The application will automatically capture the card when properly aligned
5. Review the extracted information
6. Click "Add to Apple Wallet" to create and download the pass

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) for image processing
- [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR
- [Pass.js](https://github.com/tinovyatkin/pass-js) for Apple Wallet pass generation
- [Dynamsoft Barcode Reader](https://www.dynamsoft.com/barcode-reader/overview/) for barcode scanning
