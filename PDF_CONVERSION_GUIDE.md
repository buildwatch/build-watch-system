# PDF Conversion Guide

## How to Convert HTML to PDF

The `BUILD_WATCH_USER_MANUAL.html` file is optimized for printing to PDF. Follow these steps:

### Method 1: Browser Print-to-PDF (Recommended)

1. **Open the HTML file:**
   - Double-click `BUILD_WATCH_USER_MANUAL.html` to open in your browser
   - Or right-click → Open with → Your preferred browser

2. **Print to PDF:**
   - Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
   - Select "Save as PDF" or "Microsoft Print to PDF" as the printer
   - In print settings:
     - **Paper Size:** Custom (8.5" x 13") or Legal (8.5" x 14")
     - **Margins:** 0.75 inches (or Normal)
     - **Scale:** 100%
     - **Background Graphics:** Enabled (to show colors)
   - Click "Save" or "Print"

3. **Save the PDF:**
   - Choose save location
   - Name it: `BUILD_WATCH_USER_MANUAL.pdf`
   - Click "Save"

### Method 2: Online HTML to PDF Converter

1. Upload `BUILD_WATCH_USER_MANUAL.html` to an online converter:
   - https://www.ilovepdf.com/html-to-pdf
   - https://www.freeconvert.com/html-to-pdf
   - https://html2pdf.com/

2. Configure settings:
   - Paper size: Legal (8.5" x 14") or Custom 8.5" x 13"
   - Margins: 0.75 inches
   - Enable background graphics

3. Convert and download

### Method 3: Using Pandoc (Command Line)

If you have Pandoc installed:

```bash
pandoc BUILD_WATCH_USER_MANUAL.html -o BUILD_WATCH_USER_MANUAL.pdf --pdf-engine=wkhtmltopdf
```

### Method 4: Using Chrome Headless

```bash
chrome --headless --disable-gpu --print-to-pdf=BUILD_WATCH_USER_MANUAL.pdf BUILD_WATCH_USER_MANUAL.html
```

## Print Settings for Booklet

For booklet printing (double-sided):

1. **Print Settings:**
   - Pages: All
   - Layout: Booklet (if available)
   - Double-sided: Yes
   - Binding: Left edge

2. **Page Setup:**
   - Paper: Legal (8.5" x 14") or Custom 8.5" x 13"
   - Orientation: Portrait
   - Margins: 0.75 inches all sides

3. **Print:**
   - Print odd pages first
   - Flip pages
   - Print even pages
   - Bind along left edge

## File Locations

- **Markdown Version:** `BUILD_WATCH_USER_MANUAL.md` (editable source)
- **HTML Version:** `BUILD_WATCH_USER_MANUAL.html` (print-ready)
- **PDF Version:** `BUILD_WATCH_USER_MANUAL.pdf` (to be created)

## Notes

- The HTML file is optimized for long bond paper (8.5" x 13")
- All colors and formatting will be preserved in PDF
- Page breaks are automatically handled
- The manual is designed for double-sided printing and booklet binding


