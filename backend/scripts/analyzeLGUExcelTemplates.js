const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class LGUExcelAnalyzer {
    constructor() {
        this.inputFile = path.join(__dirname, '../../MSWDO-2025-RPMES-Input-Forms-1-4 (1).xlsx');
        this.outputFile = path.join(__dirname, '../../RPMES-Output-Forms-5-11.xlsx');
        this.analysisResults = {};
    }

    async analyzeWorkbook(filePath, fileType) {
        console.log("\n" + "=".repeat(60));
        console.log("ANALYZING: " + path.basename(filePath));
        console.log("=".repeat(60));

        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            
            console.log("✅ Workbook loaded successfully");
            console.log("📋 Sheets: " + workbook.worksheets.map(ws => ws.name).join(', '));
            
            const workbookAnalysis = {
                filename: path.basename(filePath),
                fileType: fileType,
                sheets: {},
                summary: {
                    totalSheets: workbook.worksheets.length,
                    totalMergedCells: 0,
                    totalHeaders: 0
                }
            };

            for (const worksheet of workbook.worksheets) {
                if (worksheet.name.toLowerCase().includes('backend')) continue; // Skip Backend sheet
                const sheetAnalysis = await this.analyzeWorksheet(worksheet);
                workbookAnalysis.sheets[worksheet.name] = sheetAnalysis;
                workbookAnalysis.summary.totalMergedCells += sheetAnalysis.mergedCells.length;
                workbookAnalysis.summary.totalHeaders += sheetAnalysis.headers.length;
            }

            this.analysisResults[fileType] = workbookAnalysis;
            
            // Save detailed analysis to JSON
            const outputFile = path.join(__dirname, "../analysis/" + fileType + "_template_analysis.json");
            fs.mkdirSync(path.dirname(outputFile), { recursive: true });
            fs.writeFileSync(outputFile, JSON.stringify(workbookAnalysis, null, 2));
            
            console.log("📄 Analysis saved to: " + outputFile);
            return workbookAnalysis;

        } catch (error) {
            console.error("❌ Error analyzing " + path.basename(filePath) + ":", error.message);
            return null;
        }
    }

    async analyzeWorksheet(worksheet) {
        console.log("\n--- Analyzing " + worksheet.name + " ---");
        
        const analysis = {
            sheetName: worksheet.name,
            dimensions: {
                maxRow: worksheet.rowCount,
                maxColumn: worksheet.columnCount,
                actualMaxRow: 0,
                actualMaxColumn: 0
            },
            mergedCells: [],
            headers: [],
            dataStructure: [],
            formatting: {
                fonts: new Set(),
                fills: new Set(),
                borders: new Set(),
                alignments: new Set()
            }
        };

        // Correctly extract merged cells using worksheet._merges
        if (worksheet._merges) {
            for (const mergeRange of Object.keys(worksheet._merges)) {
                analysis.mergedCells.push({
                    range: mergeRange,
                    startCell: mergeRange.split(':')[0],
                    endCell: mergeRange.split(':')[1]
                });
            }
        }

        console.log("📊 Dimensions: " + worksheet.rowCount + " rows x " + worksheet.columnCount + " columns");
        console.log("🔗 Merged Cells: " + analysis.mergedCells.length);

        // Analyze first 30 rows for structure
        const maxRowsToAnalyze = Math.min(30, worksheet.rowCount);
        let actualMaxRow = 0;
        let actualMaxColumn = 0;

        for (let row = 1; row <= maxRowsToAnalyze; row++) {
            const rowData = [];
            let rowHasData = false;

            for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
                const cell = worksheet.getCell(row, col);
                
                if (cell.value !== null && cell.value !== undefined && cell.value.toString().trim() !== '') {
                    rowHasData = true;
                    actualMaxRow = Math.max(actualMaxRow, row);
                    actualMaxColumn = Math.max(actualMaxColumn, col);

                    const cellInfo = {
                        row: row,
                        col: col,
                        coordinate: cell.address,
                        value: cell.value.toString(),
                        type: typeof cell.value,
                        isHeader: false,
                        formatting: {
                            font: this.extractFontInfo(cell),
                            fill: this.extractFillInfo(cell),
                            border: this.extractBorderInfo(cell),
                            alignment: this.extractAlignmentInfo(cell)
                        }
                    };

                    // Check if it's a header (bold font or specific patterns)
                    if (cell.font && cell.font.bold) {
                        cellInfo.isHeader = true;
                        analysis.headers.push(cellInfo);
                    }

                    rowData.push(cellInfo);

                    // Collect formatting information
                    this.collectFormattingInfo(cell, analysis.formatting);
                }
            }

            if (rowHasData) {
                analysis.dataStructure.push({
                    rowNumber: row,
                    cells: rowData,
                    cellCount: rowData.length
                });
            }
        }

        analysis.dimensions.actualMaxRow = actualMaxRow;
        analysis.dimensions.actualMaxColumn = actualMaxColumn;

        console.log("📝 Data Rows Analyzed: " + analysis.dataStructure.length);
        console.log("🏷️ Headers Found: " + analysis.headers.length);
        console.log("🎨 Font Styles: " + analysis.formatting.fonts.size);
        console.log("🎨 Fill Styles: " + analysis.formatting.fills.size);

        return analysis;
    }

    extractFontInfo(cell) {
        if (!cell.font) return null;
        
        return {
            name: cell.font.name,
            size: cell.font.size,
            bold: cell.font.bold,
            italic: cell.font.italic,
            underline: cell.font.underline,
            color: cell.font.color ? cell.font.color.argb : null
        };
    }

    extractFillInfo(cell) {
        if (!cell.fill) return null;
        
        return {
            type: cell.fill.type,
            pattern: cell.fill.pattern,
            fgColor: cell.fill.fgColor ? cell.fill.fgColor.argb : null,
            bgColor: cell.fill.bgColor ? cell.fill.bgColor.argb : null
        };
    }

    extractBorderInfo(cell) {
        if (!cell.border) return null;
        
        return {
            top: cell.border.top ? { style: cell.border.top.style, color: cell.border.top.color?.argb } : null,
            left: cell.border.left ? { style: cell.border.left.style, color: cell.border.left.color?.argb } : null,
            bottom: cell.border.bottom ? { style: cell.border.bottom.style, color: cell.border.bottom.color?.argb } : null,
            right: cell.border.right ? { style: cell.border.right.style, color: cell.border.right.color?.argb } : null
        };
    }

    extractAlignmentInfo(cell) {
        if (!cell.alignment) return null;
        
        return {
            horizontal: cell.alignment.horizontal,
            vertical: cell.alignment.vertical,
            wrapText: cell.alignment.wrapText,
            shrinkToFit: cell.alignment.shrinkToFit,
            indent: cell.alignment.indent
        };
    }

    collectFormattingInfo(cell, formatting) {
        if (cell.font) {
            const fontKey = JSON.stringify(this.extractFontInfo(cell));
            formatting.fonts.add(fontKey);
        }
        
        if (cell.fill) {
            const fillKey = JSON.stringify(this.extractFillInfo(cell));
            formatting.fills.add(fillKey);
        }
        
        if (cell.border) {
            const borderKey = JSON.stringify(this.extractBorderInfo(cell));
            formatting.borders.add(borderKey);
        }
        
        if (cell.alignment) {
            const alignmentKey = JSON.stringify(this.extractAlignmentInfo(cell));
            formatting.alignments.add(alignmentKey);
        }
    }

    async analyzeAllTemplates() {
        console.log("🔍 LGU Excel Template Analysis");
        console.log("=".repeat(50));

        // Analyze Input Forms
        if (fs.existsSync(this.inputFile)) {
            await this.analyzeWorkbook(this.inputFile, 'input');
        } else {
            console.log("❌ Input file not found: " + this.inputFile);
        }

        // Analyze Output Forms
        if (fs.existsSync(this.outputFile)) {
            await this.analyzeWorkbook(this.outputFile, 'output');
        } else {
            console.log("❌ Output file not found: " + this.outputFile);
        }

        // Generate summary
        this.generateSummary();
        
        // Generate template configuration for export service
        this.generateExportConfig();
    }

    generateSummary() {
        console.log("\n" + "=".repeat(60));
        console.log("ANALYSIS SUMMARY");
        console.log("=".repeat(60));

        if (this.analysisResults.input) {
            console.log("📋 Input Forms Analysis:");
            const input = this.analysisResults.input;
            console.log("  📄 File: " + input.filename);
            console.log("  📊 Total Sheets: " + input.summary.totalSheets);
            console.log("  🔗 Total Merged Cells: " + input.summary.totalMergedCells);
            console.log("  🏷️ Total Headers: " + input.summary.totalHeaders);
            
            Object.entries(input.sheets).forEach(([sheetName, sheet]) => {
                console.log("    - " + sheetName + ": " + sheet.dimensions.actualMaxRow + " rows, " + sheet.dimensions.actualMaxColumn + " cols, " + sheet.mergedCells.length + " merged cells");
            });
        }

        if (this.analysisResults.output) {
            console.log("\n📋 Output Forms Analysis:");
            const output = this.analysisResults.output;
            console.log("  📄 File: " + output.filename);
            console.log("  📊 Total Sheets: " + output.summary.totalSheets);
            console.log("  🔗 Total Merged Cells: " + output.summary.totalMergedCells);
            console.log("  🏷️ Total Headers: " + output.summary.totalHeaders);
            
            Object.entries(output.sheets).forEach(([sheetName, sheet]) => {
                console.log("    - " + sheetName + ": " + sheet.dimensions.actualMaxRow + " rows, " + sheet.dimensions.actualMaxColumn + " cols, " + sheet.mergedCells.length + " merged cells");
            });
        }
    }

    generateExportConfig() {
        console.log("\n" + "=".repeat(60));
        console.log("GENERATING EXPORT CONFIGURATION");
        console.log("=".repeat(60));

        const exportConfig = {
            templates: {},
            commonStyles: {
                fonts: {},
                fills: {},
                borders: {},
                alignments: {}
            }
        };

        // Process input forms
        if (this.analysisResults.input) {
            Object.entries(this.analysisResults.input.sheets).forEach(([sheetName, sheet]) => {
                exportConfig.templates[sheetName] = {
                    type: 'input',
                    structure: this.extractTemplateStructure(sheet),
                    formatting: this.extractTemplateFormatting(sheet)
                };
            });
        }

        // Process output forms
        if (this.analysisResults.output) {
            Object.entries(this.analysisResults.output.sheets).forEach(([sheetName, sheet]) => {
                exportConfig.templates[sheetName] = {
                    type: 'output',
                    structure: this.extractTemplateStructure(sheet),
                    formatting: this.extractTemplateFormatting(sheet)
                };
            });
        }

        // Save export configuration
        const configFile = path.join(__dirname, "../config/lguExcelTemplates.json");
        fs.mkdirSync(path.dirname(configFile), { recursive: true });
        fs.writeFileSync(configFile, JSON.stringify(exportConfig, null, 2));
        
        console.log("✅ Export configuration saved to: " + configFile);
        console.log("📊 Templates configured: " + Object.keys(exportConfig.templates).length);
    }

    extractTemplateStructure(sheet) {
        return {
            dimensions: sheet.dimensions,
            mergedCells: sheet.mergedCells,
            headers: sheet.headers.map(h => ({
                coordinate: h.coordinate,
                value: h.value,
                row: h.row,
                col: h.col
            })),
            dataStructure: sheet.dataStructure.slice(0, 10) // First 10 rows for structure
        };
    }

    extractTemplateFormatting(sheet) {
        return {
            fonts: Array.from(sheet.formatting.fonts),
            fills: Array.from(sheet.formatting.fills),
            borders: Array.from(sheet.formatting.borders),
            alignments: Array.from(sheet.formatting.alignments)
        };
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new LGUExcelAnalyzer();
    analyzer.analyzeAllTemplates()
        .then(() => {
            console.log("\n🎉 Template analysis completed successfully!");
            console.log("📁 Check the analysis/ and config/ directories for detailed results.");
        })
        .catch(error => {
            console.error("❌ Analysis failed:", error);
            process.exit(1);
        });
}

module.exports = LGUExcelAnalyzer; 