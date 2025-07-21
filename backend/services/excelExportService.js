const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Load LGU template config
const templateConfigPath = path.join(__dirname, '../config/lguExcelTemplates.json');
let lguTemplates = {};
if (fs.existsSync(templateConfigPath)) {
  lguTemplates = JSON.parse(fs.readFileSync(templateConfigPath, 'utf-8'));
}

class ExcelExportService {
  constructor() {
    this.workbook = null;
  }

  // Create grouped RPMES workbook (Forms 1-4 or Forms 5-11)
  async createGroupedRPMESWorkbook(project, formGroup, existingForms = []) {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Build Watch LGU';
    this.workbook.lastModifiedBy = 'Build Watch LGU';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();

    const isInputGroup = formGroup === 'input';
    const formNumbers = isInputGroup ? [1, 2, 3, 4] : [5, 6, 7, 8, 9, 10, 11];

    // Create worksheets for each form in the group
    for (const formNo of formNumbers) {
      const templateKey = `Form ${formNo}`;
      const template = lguTemplates.templates[templateKey];
      
      if (template) {
        const worksheet = this.workbook.addWorksheet(templateKey);
        await this.applyTemplateStructure(worksheet, template);
        
        // Find existing form data for this form number
        const existingForm = existingForms.find(f => this.getFormNo(f.formType) === formNo.toString());
        if (existingForm) {
          await this.populateFormData(worksheet, existingForm, project, template);
        } else {
          // Create empty form structure for forms not yet submitted
          await this.createEmptyFormStructure(worksheet, template, formNo);
        }
      }
    }

    return this.workbook;
  }

  // Apply LGU template structure to worksheet
  async applyTemplateStructure(worksheet, template) {
    // Set page setup
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.orientation = 'portrait';
    worksheet.pageSetup.margins = {
      top: 0.75,
      left: 0.75,
      bottom: 0.75,
      right: 0.75,
      header: 0.3,
      footer: 0.3
    };

    // Set column widths based on template
    if (template.structure && template.structure.dimensions) {
      const maxCol = template.structure.dimensions.maxColumn || 15;
      for (let col = 1; col <= maxCol; col++) {
        worksheet.getColumn(col).width = 18;
      }
    }

    // Set row heights
    if (template.structure && template.structure.dimensions) {
      const maxRow = template.structure.dimensions.maxRow || 50;
      for (let row = 1; row <= maxRow; row++) {
        worksheet.getRow(row).height = 22;
      }
    }

    // Apply merged cells
    if (template.structure && template.structure.mergedCells) {
      template.structure.mergedCells.forEach(merge => {
        try {
          worksheet.mergeCells(merge.range);
        } catch (error) {
          console.warn(`Could not merge cells ${merge.range}:`, error.message);
        }
      });
    }

    // Apply headers and static content
    if (template.structure && template.structure.headers) {
      template.structure.headers.forEach(header => {
        const cell = worksheet.getCell(header.coordinate);
        cell.value = header.value;
        
        // Apply LGU formatting
        cell.font = {
          name: 'Arial',
          size: 12,
          bold: true,
          color: { argb: 'FF000000' }
        };
        
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        };

        // Apply borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
    }
  }

  // Populate form data in the correct cells
  async populateFormData(worksheet, form, project, template) {
    const formData = form.formData || {};
    
    // Map form data to appropriate cells based on template structure
    if (template.structure && template.structure.dataStructure) {
      let dataRow = 5; // Start after headers
      
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const cell = worksheet.getCell(dataRow, 2); // Column B for data
          cell.value = value;
          
          // Apply data cell formatting
          cell.font = {
            name: 'Arial',
            size: 11,
            color: { argb: 'FF000000' }
          };
          
          cell.alignment = {
            vertical: 'top',
            wrapText: true
          };
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          
          dataRow++;
        }
      });
    }

    // Add project information in designated cells
    this.addProjectInfo(worksheet, project, form);
  }

  // Create empty form structure for forms not yet submitted
  async createEmptyFormStructure(worksheet, template, formNo) {
    // Add form title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `RPMES FORM ${formNo}`;
    titleCell.font = {
      name: 'Arial',
      size: 14,
      bold: true,
      color: { argb: 'FF000000' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A1:D1');

    // Add form description based on form number
    const descriptions = {
      1: 'PROJECT IDENTIFICATION AND BASIC INFORMATION',
      2: 'PROJECT OBJECTIVES AND EXPECTED OUTPUTS',
      3: 'PROJECT IMPLEMENTATION DETAILS',
      4: 'PROJECT MONITORING AND EVALUATION',
      5: 'PROJECT PROGRESS REPORT',
      6: 'PROJECT COMPLETION REPORT',
      7: 'PROJECT IMPACT ASSESSMENT',
      8: 'FINANCIAL REPORT',
      9: 'ENVIRONMENTAL COMPLIANCE REPORT',
      10: 'SOCIAL IMPACT REPORT',
      11: 'PROJECT SUSTAINABILITY REPORT'
    };

    const descCell = worksheet.getCell('A2');
    descCell.value = descriptions[formNo] || '';
    descCell.font = {
      name: 'Arial',
      size: 12,
      bold: true,
      color: { argb: 'FF000000' }
    };
    descCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A2:D2');

    // Add placeholder for form data
    const placeholderCell = worksheet.getCell('A4');
    placeholderCell.value = 'Form data will be populated when submitted';
    placeholderCell.font = {
      name: 'Arial',
      size: 11,
      italic: true,
      color: { argb: 'FF666666' }
    };
  }

  // Add project information
  addProjectInfo(worksheet, project, form) {
    // Add project details in footer area
    const footerRow = 30;
    
    worksheet.getCell(`A${footerRow}`).value = 'Project:';
    worksheet.getCell(`B${footerRow}`).value = project.name;
    worksheet.getCell(`A${footerRow + 1}`).value = 'Fiscal Year:';
    worksheet.getCell(`B${footerRow + 1}`).value = form.reportingYear || new Date().getFullYear();
    worksheet.getCell(`A${footerRow + 2}`).value = 'Generated:';
    worksheet.getCell(`B${footerRow + 2}`).value = new Date().toLocaleDateString('en-PH');
  }

  // Get form number from form type
  getFormNo(formType) {
    const match = formType.match(/(\d+)/);
    return match ? match[1] : '';
  }

  // Generate grouped filename according to LGU specification
  generateGroupedFilename(project, formGroup) {
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '-');
    const fiscalYear = new Date().getFullYear();
    const formRange = formGroup === 'input' ? '1-4' : '5-11';
    
    return `RPMES-Forms-${formRange}-${projectName}-${fiscalYear}.xlsx`;
  }

  // Export grouped forms for a project
  async exportGroupedForms(project, formGroup, existingForms = []) {
    const workbook = await this.createGroupedRPMESWorkbook(project, formGroup, existingForms);
    const filename = this.generateGroupedFilename(project, formGroup);
    
    return {
      workbook,
      filename
    };
  }
}

module.exports = ExcelExportService; 