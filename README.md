# Docx Page Cleaner

A professional web-based tool to remove empty and blank pages from Microsoft Word (.docx) files.

## Features

- **Manual Page Break Removal**: Detects and removes `<w:br w:type="page"/>` tags when they appear in otherwise empty paragraphs.
- **Trailing Paragraph Cleanup**: Strips empty paragraphs from the end of the document that often cause trailing blank pages.
- **Consecutive Space Reduction**: Merges multiple consecutive empty paragraphs into a single one.
- **Formatting Preservation**: Uses a non-destructive XML manipulation approach that preserves styles, images, headers, footers, and document metadata.

## Technical Stack

- **Frontend**: React 19, Tailwind CSS 4, Motion, Lucide Icons.
- **Backend**: Node.js, Express, Multer (for file handling).
- **Processing**: `adm-zip` for DOCX (ZIP) manipulation and `xmldom` for precise XML editing.

## Usage

1. Start the development server: `npm run dev`.
2. Open the application in your browser.
3. Drag and drop a `.docx` file into the upload area.
4. Select your cleaning preferences.
5. Click **Clean Document** and download the processed file.

## Implementation Details

The core logic resides in `src/services/docxCleaner.ts`. It parses the `word/document.xml` file inside the DOCX package and applies heuristic rules to identify "empty" content that contributes to blank pages.
