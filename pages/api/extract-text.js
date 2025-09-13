import formidable from 'formidable';
import fs from 'fs';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import xml2js from 'xml2js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// PowerPoint slide extraction function
async function extractPowerPointText(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const contents = await zip.loadAsync(data);
    
    let extractedText = '';
    let slideCount = 0;
    const slides = [];
    
    // Get slide files
    const slideFiles = Object.keys(contents.files).filter(name => 
      name.includes('ppt/slides/slide') && name.endsWith('.xml')
    ).sort();
    
    for (const slideFile of slideFiles) {
      try {
        const slideContent = await contents.files[slideFile].async('text');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(slideContent);
        
        let slideText = '';
        slideCount++;
        
        // Extract text from various elements
        const extractTextFromElement = (element) => {
          if (!element) return '';
          
          let text = '';
          if (Array.isArray(element)) {
            element.forEach(item => {
              text += extractTextFromElement(item) + ' ';
            });
          } else if (typeof element === 'object') {
            if (element['a:t']) {
              // Text content
              if (Array.isArray(element['a:t'])) {
                element['a:t'].forEach(t => text += t + ' ');
              } else {
                text += element['a:t'] + ' ';
              }
            }
            // Recursively check other properties
            Object.keys(element).forEach(key => {
              if (key !== 'a:t') {
                text += extractTextFromElement(element[key]) + ' ';
              }
            });
          }
          return text;
        };
        
        slideText = extractTextFromElement(result);
        slideText = slideText.replace(/\s+/g, ' ').trim();
        
        if (slideText) {
          slides.push({
            slideNumber: slideCount,
            content: slideText
          });
          extractedText += `\n--- Slide ${slideCount} ---\n${slideText}\n`;
        }
        
      } catch (slideError) {
        console.warn(`Error processing slide ${slideFile}:`, slideError);
      }
    }
    
    return {
      text: extractedText.trim(),
      metadata: {
        slideCount,
        slides
      }
    };
  } catch (error) {
    console.error('PowerPoint extraction error:', error);
    throw new Error('Failed to extract PowerPoint content');
  }
}

// Excel data extraction function
async function extractExcelData(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    let extractedText = '';
    const sheets = [];
    
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      let sheetText = `\n--- Sheet ${index + 1}: ${sheetName} ---\n`;
      
      // Convert sheet data to readable text
      sheetData.forEach((row, rowIndex) => {
        if (row.length > 0) {
          const rowText = row.join(' | ');
          sheetText += `Row ${rowIndex + 1}: ${rowText}\n`;
        }
      });
      
      sheets.push({
        name: sheetName,
        rowCount: sheetData.length,
        columnCount: Math.max(...sheetData.map(row => row.length)),
        data: sheetData.slice(0, 100) // Limit data for storage
      });
      
      extractedText += sheetText;
    });
    
    return {
      text: extractedText,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheets
      }
    };
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error('Failed to extract Excel content');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    let extractedText = '';
    let imageData = null;
    let metadata = {};

    // Extract text based on file type
    const mimeType = file.mimetype;
    const fileName = file.originalFilename?.toLowerCase() || '';
    
    // Remove all image handling - reject image files
    if (mimeType?.startsWith('image/')) {
      return res.status(400).json({ 
        message: 'Image files are not supported. Please upload PDF, Word, Excel, or PowerPoint documents.' 
      });
    }
    
    if (mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(file.filepath);
      const data = await pdf(buffer);
      extractedText = data.text;
      metadata = {
        pages: data.numpages,
        info: data.info
      };
      
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const buffer = fs.readFileSync(file.filepath);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
      metadata = {
        type: 'document',
        wordCount: result.value.split(/\s+/).length
      };
      
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      // Excel files
      const result = await extractExcelData(file.filepath);
      extractedText = result.text;
      metadata = {
        type: 'spreadsheet',
        ...result.metadata
      };
      
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      fileName.endsWith('.pptx') ||
      fileName.endsWith('.ppt')
    ) {
      // PowerPoint files
      if (fileName.endsWith('.pptx')) {
        const result = await extractPowerPointText(file.filepath);
        extractedText = result.text;
        metadata = {
          type: 'presentation',
          ...result.metadata
        };
      } else {
        // For older .ppt files, provide basic support message
        extractedText = '[PowerPoint file detected - please use .pptx format for full text extraction]';
        metadata = {
          type: 'presentation',
          legacy: true
        };
      }
      
    } else {
      return res.status(400).json({ 
        message: `Unsupported file type: ${mimeType}. Please upload PDF, Word, Excel, or PowerPoint documents.` 
      });
    }

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    res.status(200).json({ 
      extractedText,
      imageData, // Will always be null now
      metadata,
      fileType: getFileCategory(mimeType, fileName)
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    res.status(500).json({ message: 'Failed to extract text', error: error.message });
  }
}

// Helper function to categorize file types (remove image category)
function getFileCategory(mimeType, fileName = '') {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessing') || mimeType === 'application/msword') return 'document';
  if (mimeType.includes('spreadsheet') || mimeType === 'application/vnd.ms-excel') return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType === 'application/vnd.ms-powerpoint') return 'presentation';
  
  // Fallback to file extension
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return 'spreadsheet';
  if (ext.endsWith('.pptx') || ext.endsWith('.ppt')) return 'presentation';
  
  return 'document';
}
