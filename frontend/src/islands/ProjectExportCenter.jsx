import { useState, useEffect } from 'react';

/**
 * ProjectExportCenter - Centralized export functionality for project management modules
 * 
 * @param {Object} props
 * @param {string} props.theme - Theme color ('orange', 'green', 'blue', 'sky')
 * @param {Array} props.data - Data to export
 * @param {Function} props.dataTransformer - Function to transform data for export
 * @param {string} props.exportType - Type of export ('projects', 'submissions', 'approved')
 * @param {string} props.fileNamePrefix - Prefix for exported file names
 */
export default function ProjectExportCenter({
  theme = 'blue',
  data = [],
  dataTransformer,
  exportType = 'projects',
  fileNamePrefix = 'projects'
}) {
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Preparing export...');

  // Theme color mappings
  const themeColors = {
    orange: { primary: 'amber', button: 'from-amber-500 to-amber-600' },
    green: { primary: 'emerald', button: 'from-emerald-500 to-emerald-600' },
    blue: { primary: 'blue', button: 'from-blue-500 to-blue-600' },
    sky: { primary: 'sky', button: 'from-sky-500 to-sky-600' }
  };

  const colors = themeColors[theme] || themeColors.blue;

  // Load jsPDF library dynamically
  const loadJsPDFLibrary = async () => {
    if (window.jsPDF || window.jspdf) {
      return true;
    }

    const scripts = [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ];

    for (const src of scripts) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
        
        // Also try to load autoTable plugin
        if (window.jsPDF || window.jspdf) {
          const autoTableScript = document.createElement('script');
          autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
          document.head.appendChild(autoTableScript);
          return true;
        }
      } catch (e) {
        console.warn(`Failed to load jsPDF from ${src}:`, e);
      }
    }
    return false;
  };

  // Transform data for export
  const transformData = (rawData) => {
    if (dataTransformer && typeof dataTransformer === 'function') {
      return dataTransformer(rawData);
    }
    return rawData;
  };

  // Helper function to format date for Excel
  const formatDateForExcel = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    } catch (e) {
      return 'N/A';
    }
  };

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return String(value).replace(/"/g, '""');
  };

  // Export to Excel/CSV with comprehensive RPMES-style format
  const exportToExcel = async (exportData) => {
    const transformed = transformData(exportData);
    
    // Get current date and time
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = now.toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const reportMonth = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }).toUpperCase();
    
    // Get user/organization info
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const organizationName = userData.implementingOfficeName || userData.office || userData.department || 'MUNICIPAL ENGINEERING OFFICE';
    
    // Build comprehensive CSV content
    let csvLines = [];
    
    // RPMES-style Header Section
    csvLines.push('"REGIONAL PROJECT MONITORING AND EVALUATION SYSTEM (RPMES)"');
    csvLines.push('"PHYSICAL AND FINANCIAL ACCOMPLISHMENT REPORT"');
    csvLines.push(`"As of ${reportMonth}"`);
    csvLines.push('');
    csvLines.push(`"Implementing Agency:","${escapeCSV(organizationName)}"`);
    csvLines.push(`"Report Generated:","${currentDate} at ${currentTime}"`);
    csvLines.push('');
    
    // Main Table Header - RPMES Style
    const mainHeaders = [
      'Program/Project Title',
      'Project Code',
      'Implementing Office',
      'Category',
      'Location/Barangay',
      'Priority',
      'Funding Source',
      'Created Date',
      'Start Date',
      'Target Completion Date',
      'Expected Days of Completion',
      'Actual Completion Date',
      'Total Budget Allocation (₱)',
      'Budget Description',
      'Project Description',
      'Expected Outputs',
      'Target Beneficiaries',
      'Overall Progress (%)',
      'Timeline Progress (%)',
      'Budget Progress (%)',
      'Physical Progress (%)',
      'General Description',
      'Initial Photo Uploading',
      'Status'
    ];
    
    csvLines.push('"' + mainHeaders.join('","') + '"');
    
    // Process each project with comprehensive data
    for (const project of transformed) {
      // Calculate expected days
      let expectedDays = 'N/A';
      if (project.startDate && project.endDate) {
        try {
          const start = new Date(project.startDate);
          const end = new Date(project.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expectedDays = diffDays.toString();
        } catch (e) {
          expectedDays = 'N/A';
        }
      }
      
      // Get EIU/Contractor info if available
      const eiuInfo = project.assignedEIU || project.eiuPersonnel || project.contractor || {};
      const eiuName = eiuInfo.fullName || eiuInfo.name || eiuInfo.companyName || 'N/A';
      const eiuEmail = eiuInfo.email || eiuInfo.username || 'N/A';
      const eiuContact = eiuInfo.contactNumber || eiuInfo.phone || 'N/A';
      const eiuBirthdate = eiuInfo.birthdate ? formatDateForExcel(eiuInfo.birthdate) : 'N/A';
      const eiuGroup = eiuInfo.group || 'N/A';
      const eiuDepartment = eiuInfo.department || 'N/A';
      const eiuSubrole = eiuInfo.subRole || eiuInfo.subrole || 'N/A';
      const eiuCompany = eiuInfo.company || eiuInfo.companyName || 'N/A';
      
      // Build project row
      const projectRow = [
        escapeCSV(project.name || 'N/A'),
        escapeCSV(project.projectCode || 'N/A'),
        escapeCSV(project.implementingOfficeName || project.implementingOffice || organizationName),
        escapeCSV(project.category || 'N/A'),
        escapeCSV(project.location || project.barangay || 'N/A'),
        escapeCSV(project.priority || 'N/A'),
        escapeCSV(project.fundingSource || 'Local Development Fund'),
        formatDateForExcel(project.createdAt || project.createdDate),
        formatDateForExcel(project.startDate),
        formatDateForExcel(project.endDate || project.targetCompletionDate),
        expectedDays,
        formatDateForExcel(project.actualCompletionDate || project.completedDate),
        parseFloat(project.totalBudget || 0).toFixed(2),
        escapeCSV(project.budgetDescription || project.budgetBreakdown || 'N/A'),
        escapeCSV(project.description || project.objectives || 'N/A'),
        escapeCSV(project.expectedOutputs || project.outputs || 'N/A'),
        escapeCSV(project.targetBeneficiaries || project.beneficiaries || 'N/A'),
        parseFloat(project.overallProgress || project.progress?.overall || 0).toFixed(2),
        parseFloat(project.timelineProgress || project.progress?.internalTimeline || project.progress?.timeline || 0).toFixed(2),
        parseFloat(project.budgetProgress || project.progress?.internalBudget || project.progress?.budget || 0).toFixed(2),
        parseFloat(project.physicalProgress || project.progress?.internalPhysical || project.progress?.physical || 0).toFixed(2),
        escapeCSV(project.generalDescription || project.description || 'N/A'),
        escapeCSV(project.initialPhotoUploading || project.initialPhotos || 'N/A'),
        escapeCSV(project.status || 'N/A')
      ];
      
      csvLines.push('"' + projectRow.join('","') + '"');
      
      // Add EIU/Contractor Information Section for this project
      csvLines.push('');
      csvLines.push('"EIU/CONTRACTOR INFORMATION"');
      const eiuHeaders = ['Company Name', 'Email/Username', 'Contact Number', 'Birthdate', 'Group', 'Department', 'Subrole', 'Company'];
      csvLines.push('"' + eiuHeaders.join('","') + '"');
      const eiuRow = [
        escapeCSV(eiuName),
        escapeCSV(eiuEmail),
        escapeCSV(eiuContact),
        eiuBirthdate,
        escapeCSV(eiuGroup),
        escapeCSV(eiuDepartment),
        escapeCSV(eiuSubrole),
        escapeCSV(eiuCompany)
      ];
      csvLines.push('"' + eiuRow.join('","') + '"');
      csvLines.push('');
      
      // Add Milestones Section
      if (project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0) {
        csvLines.push('"MILESTONES SET"');
        const milestoneHeaders = ['Milestone Title', 'Status', 'Weight (%)', 'Budget (₱)', 'Due Date', 'Priority', 'Description'];
        csvLines.push('"' + milestoneHeaders.join('","') + '"');
        
        for (const milestone of project.milestones) {
          const milestoneRow = [
            escapeCSV(milestone.title || milestone.name || 'N/A'),
            escapeCSV(milestone.status || 'N/A'),
            parseFloat(milestone.weight || 0).toFixed(2),
            parseFloat(milestone.budget || milestone.plannedBudget || 0).toFixed(2),
            formatDateForExcel(milestone.dueDate || milestone.targetDate || milestone.deadline),
            escapeCSV(milestone.priority || 'N/A'),
            escapeCSV(milestone.description || 'N/A')
          ];
          csvLines.push('"' + milestoneRow.join('","') + '"');
          
          // Timeline Division for this milestone
          if (milestone.timelineDivision || milestone.timeline) {
            csvLines.push('"  Timeline Division"');
            const timelineDivHeaders = ['Weight (%)', 'Start Date', 'End Date', 'Description'];
            csvLines.push('"    ' + timelineDivHeaders.join('","') + '"');
            const timelineDiv = milestone.timelineDivision || milestone.timeline;
            const timelineRow = [
              parseFloat(timelineDiv.weight || 0).toFixed(2),
              formatDateForExcel(timelineDiv.startDate || timelineDiv.start),
              formatDateForExcel(timelineDiv.endDate || timelineDiv.end),
              escapeCSV(timelineDiv.description || 'N/A')
            ];
            csvLines.push('"    ' + timelineRow.join('","') + '"');
          }
          
          // Budget Division for this milestone
          if (milestone.budgetDivision || milestone.budget) {
            csvLines.push('"  Budget Division"');
            const budgetDivHeaders = ['Weight (%)', 'Budget (₱)', 'Breakdown'];
            csvLines.push('"    ' + budgetDivHeaders.join('","') + '"');
            const budgetDiv = milestone.budgetDivision || milestone.budget;
            const budgetRow = [
              parseFloat(budgetDiv.weight || 0).toFixed(2),
              parseFloat(budgetDiv.budget || budgetDiv.amount || 0).toFixed(2),
              escapeCSV(budgetDiv.breakdown || budgetDiv.description || 'N/A')
            ];
            csvLines.push('"    ' + budgetRow.join('","') + '"');
          }
          
          // Physical Division for this milestone
          if (milestone.physicalDivision || milestone.physical) {
            csvLines.push('"  Physical Division"');
            const physicalDivHeaders = ['Weight (%)', 'Proof Types', 'Description'];
            csvLines.push('"    ' + physicalDivHeaders.join('","') + '"');
            const physicalDiv = milestone.physicalDivision || milestone.physical;
            const proofTypes = Array.isArray(physicalDiv.proofTypes) 
              ? physicalDiv.proofTypes.join('; ') 
              : (physicalDiv.proofTypes || 'N/A');
            const physicalRow = [
              parseFloat(physicalDiv.weight || 0).toFixed(2),
              escapeCSV(proofTypes),
              escapeCSV(physicalDiv.description || 'N/A')
            ];
            csvLines.push('"    ' + physicalRow.join('","') + '"');
          }
        }
        csvLines.push('');
      }
      
      // Add separator between projects
      csvLines.push('');
      csvLines.push('"---"');
      csvLines.push('');
    }
    
    // Add Summary Section
    const totalProjects = transformed.length;
    const totalBudget = transformed.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
    const avgProgress = totalProjects > 0 
      ? transformed.reduce((sum, p) => sum + parseFloat(p.overallProgress || p.progress?.overall || 0), 0) / totalProjects 
      : 0;
    
    csvLines.push('');
    csvLines.push('"SUMMARY"');
    csvLines.push(`"Total Projects:","${totalProjects}"`);
    csvLines.push(`"Total Budget:","₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`);
    csvLines.push(`"Average Progress:","${avgProgress.toFixed(2)}%"`);
    csvLines.push('');
    csvLines.push(`"Generated by Build Watch - ${organizationName}"`);
    csvLines.push(`"Generated on: ${currentDate} at ${currentTime}"`);

    // Create CSV content
    const csvContent = csvLines.join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileNamePrefix}-export-${fileDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF with comprehensive RPMES-style format
  const exportToPDF = async (exportData) => {
    const loaded = await loadJsPDFLibrary();
    if (!loaded) {
      alert('Failed to load PDF library. Please use Excel or HTML format.');
      return;
    }

    let jsPDF = window.jsPDF?.jsPDF || window.jsPDF || window.jspdf?.jsPDF || window.jspdf;
    if (!jsPDF || typeof jsPDF !== 'function') {
      alert('PDF library failed to initialize. Please use Excel or HTML format.');
      return;
    }

    const transformed = transformData(exportData);
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Get current date and time
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = now.toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const reportMonth = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }).toUpperCase();
    
    // Get user/organization info
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const organizationName = userData.implementingOfficeName || userData.office || userData.department || 'MUNICIPAL ENGINEERING OFFICE';
    
    // Calculate summary statistics
    const totalProjects = transformed.length;
    const totalBudget = transformed.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
    const avgProgress = totalProjects > 0 
      ? transformed.reduce((sum, p) => sum + parseFloat(p.overallProgress || p.progress?.overall || 0), 0) / totalProjects 
      : 0;
    
    // Header Section with Logos
    doc.setFillColor(37, 99, 235); // Blue background
    doc.rect(0, 0, 297, 40, 'F'); // Full width header (increased height for better spacing)
    
    const headerHeight = 40;
    const pageWidth = 297;
    const logoSize = 18; // Logo size in mm
    const logoY = (headerHeight - logoSize) / 2; // Center logos vertically
    
    // Helper function to load image as base64 with timeout
    const loadImageAsBase64 = (imagePath, timeout = 5000) => {
      return new Promise((resolve) => {
        let resolved = false;
        const timeoutId = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.warn('Image load timeout for:', imagePath);
            resolve(null);
          }
        }, timeout);
        
        // Try fetch approach first (more reliable)
        fetch(imagePath)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch image');
            return response.blob();
          })
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(reader.result);
              }
            };
            reader.onerror = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(null);
              }
            };
            reader.readAsDataURL(blob);
          })
          .catch(() => {
            // Fallback to Image approach
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = function() {
              if (resolved) return;
              resolved = true;
              clearTimeout(timeoutId);
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              } catch (e) {
                console.warn('Canvas conversion failed:', e);
                resolve(null);
              }
            };
            
            img.onerror = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                console.warn('Image load failed for:', imagePath);
                resolve(null);
              }
            };
            
            img.src = imagePath;
          });
      });
    };
    
    // Load both logos in parallel (each handles its own errors)
    const baseUrl = window.location.origin;
    const sealBase64 = await loadImageAsBase64(`${baseUrl}/santa-cruz-seal.png`).catch(() => null);
    const mpdoBase64 = await loadImageAsBase64(`${baseUrl}/mpado_logo.png`).catch(() => null);
    
    // Add logos to PDF
    if (sealBase64) {
      try {
        doc.addImage(sealBase64, 'PNG', 10, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add Santa Cruz seal to PDF:', e);
      }
    }
    
    if (mpdoBase64) {
      try {
        doc.addImage(mpdoBase64, 'PNG', pageWidth - 10 - logoSize, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add MPDO logo to PDF:', e);
      }
    }
    
    // Center text horizontally
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('SANTA CRUZ PROJECT MONITORING SYSTEM', pageWidth / 2, 14, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PROJECT INFORMATION', pageWidth / 2, 21, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`As of ${reportMonth}`, pageWidth / 2, 28, { align: 'center' });
    
    // Reset text color for body
    doc.setTextColor(0, 0, 0);
    
    // Report Information Section
    let yPos = 45;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Implementing Agency: ${organizationName}`, 14, yPos);
    
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text(`Report Generated: ${currentDate} at ${currentTime}`, 14, yPos);
    
    yPos += 6;
    doc.text(`Total Projects: ${totalProjects}`, 14, yPos);
    
    yPos += 6;
    doc.text(`Total Budget: ₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
    
    yPos += 6;
    doc.text(`Average Progress: ${avgProgress.toFixed(2)}%`, 14, yPos);
    
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 283, yPos);
    
    yPos += 8;
    
    // Process each project with comprehensive details
    for (let idx = 0; idx < transformed.length; idx++) {
      const project = transformed[idx];
      
      // Check if we need a new page
      if (yPos > 180 && idx > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      // Project Header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`PROJECT ${idx + 1}: ${(project.name || 'N/A').substring(0, 60)}`, 14, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      // Basic Project Information
      doc.setFont(undefined, 'bold');
      doc.text('BASIC PROJECT INFORMATION:', 14, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      
      const basicInfo = [
        `Project Code: ${project.projectCode || 'N/A'}`,
        `Implementing Office: ${project.implementingOfficeName || project.implementingOffice || organizationName}`,
        `Category: ${project.category || 'N/A'}`,
        `Location/Barangay: ${project.location || project.barangay || 'N/A'}`,
        `Priority: ${project.priority || 'N/A'}`,
        `Funding Source: ${project.fundingSource || 'Local Development Fund'}`,
        `Created Date: ${formatDateForExcel(project.createdAt || project.createdDate)}`,
        `Status: ${project.status || 'N/A'}`
      ];
      
      basicInfo.forEach(info => {
        doc.text(info, 14, yPos);
        yPos += 5;
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 3;
      
      // Timeline Information
        doc.setFont(undefined, 'bold');
      doc.text('TIMELINE INFORMATION:', 14, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      
      let expectedDays = 'N/A';
      if (project.startDate && project.endDate) {
        try {
          const start = new Date(project.startDate);
          const end = new Date(project.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expectedDays = diffDays.toString();
        } catch (e) {}
      }
      
      const timelineInfo = [
        `Start Date: ${formatDateForExcel(project.startDate)}`,
        `Target Completion Date: ${formatDateForExcel(project.endDate || project.targetCompletionDate)}`,
        `Expected Days of Completion: ${expectedDays}`,
        `Actual Completion Date: ${formatDateForExcel(project.actualCompletionDate || project.completedDate)}`
      ];
      
      timelineInfo.forEach(info => {
        doc.text(info, 14, yPos);
        yPos += 5;
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 3;
      
      // Budget Information
      doc.setFont(undefined, 'bold');
      doc.text('BUDGET INFORMATION:', 14, yPos);
      yPos += 6;
          doc.setFont(undefined, 'normal');
      
      doc.text(`Total Budget Allocation: ₱${parseFloat(project.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPos);
      yPos += 5;
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      const budgetDesc = (project.budgetDescription || project.budgetBreakdown || 'N/A').substring(0, 100);
      doc.text(`Budget Description: ${budgetDesc}`, 14, yPos);
      yPos += 8;
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      
      // Progress Information
      doc.setFont(undefined, 'bold');
      doc.text('PROGRESS INFORMATION:', 14, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      
      const progressInfo = [
        `Overall Progress: ${parseFloat(project.overallProgress || project.progress?.overall || 0).toFixed(2)}%`,
        `Timeline Progress: ${parseFloat(project.timelineProgress || project.progress?.internalTimeline || project.progress?.timeline || 0).toFixed(2)}%`,
        `Budget Progress: ${parseFloat(project.budgetProgress || project.progress?.internalBudget || project.progress?.budget || 0).toFixed(2)}%`,
        `Physical Progress: ${parseFloat(project.physicalProgress || project.progress?.internalPhysical || project.progress?.physical || 0).toFixed(2)}%`
      ];
      
      progressInfo.forEach(info => {
        doc.text(info, 14, yPos);
        yPos += 5;
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 3;
      
      // EIU/Contractor Information
      const eiuInfo = project.assignedEIU || project.eiuPersonnel || project.contractor || {};
      doc.setFont(undefined, 'bold');
      doc.text('EIU/CONTRACTOR INFORMATION:', 14, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      
      const eiuInfoText = [
        `Company Name: ${eiuInfo.fullName || eiuInfo.name || eiuInfo.companyName || 'N/A'}`,
        `Email/Username: ${eiuInfo.email || eiuInfo.username || 'N/A'}`,
        `Contact Number: ${eiuInfo.contactNumber || eiuInfo.phone || 'N/A'}`,
        `Birthdate: ${formatDateForExcel(eiuInfo.birthdate)}`,
        `Group: ${eiuInfo.group || 'N/A'}`,
        `Department: ${eiuInfo.department || 'N/A'}`,
        `Subrole: ${eiuInfo.subRole || eiuInfo.subrole || 'N/A'}`,
        `Company: ${eiuInfo.company || eiuInfo.companyName || 'N/A'}`
      ];
      
      eiuInfoText.forEach(info => {
        doc.text(info, 14, yPos);
        yPos += 5;
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      yPos += 3;
      
      // Project Description
      if (project.description || project.objectives) {
        doc.setFont(undefined, 'bold');
        doc.text('PROJECT DESCRIPTION:', 14, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
        
        const desc = (project.description || project.objectives || 'N/A').substring(0, 200);
        const descLines = doc.splitTextToSize(desc, 260);
        descLines.forEach(line => {
          doc.text(line, 14, yPos);
          yPos += 5;
          if (yPos > 180) {
            doc.addPage();
            yPos = 20;
          }
        });
        yPos += 3;
      }
      
      // Milestones Section
      if (project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('MILESTONES:', 14, yPos);
        yPos += 6;
        
        project.milestones.forEach((milestone, mIdx) => {
          if (yPos > 170) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFont(undefined, 'bold');
          doc.setFontSize(9);
          doc.text(`Milestone ${mIdx + 1}: ${(milestone.title || milestone.name || 'N/A').substring(0, 50)}`, 14, yPos);
          yPos += 5;
          
          doc.setFont(undefined, 'normal');
          doc.setFontSize(8);
          const milestoneInfo = [
            `Status: ${milestone.status || 'N/A'}`,
            `Weight: ${parseFloat(milestone.weight || 0).toFixed(2)}%`,
            `Budget: ₱${parseFloat(milestone.budget || milestone.plannedBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Due Date: ${formatDateForExcel(milestone.dueDate || milestone.targetDate || milestone.deadline)}`,
            `Priority: ${milestone.priority || 'N/A'}`,
            `Description: ${(milestone.description || 'N/A').substring(0, 100)}`
          ];
          
          milestoneInfo.forEach(info => {
            doc.text(info, 20, yPos);
            yPos += 4;
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
          });
          
          yPos += 2;
          
          // Timeline Division
          doc.setFont(undefined, 'bold');
          doc.setFontSize(8);
          doc.text('Timeline Division:', 20, yPos);
          yPos += 4;
          doc.setFont(undefined, 'normal');
          
          const timelineDiv = milestone.timelineDivision || milestone.timeline || {};
          const timelineDivInfo = [
            `Weight: ${parseFloat(timelineDiv.weight || 0).toFixed(2)}%`,
            `Start: ${formatDateForExcel(timelineDiv.startDate || timelineDiv.start)}`,
            `End: ${formatDateForExcel(timelineDiv.endDate || timelineDiv.end)}`,
            `Description: ${(timelineDiv.description || 'N/A').substring(0, 80)}`
          ];
          
          timelineDivInfo.forEach(info => {
            doc.text(info, 25, yPos);
            yPos += 4;
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
          });
          
          yPos += 2;
          
          // Budget Division
          doc.setFont(undefined, 'bold');
          doc.text('Budget Division:', 20, yPos);
          yPos += 4;
          doc.setFont(undefined, 'normal');
          
          const budgetDiv = milestone.budgetDivision || milestone.budget || {};
          const budgetDivInfo = [
            `Weight: ${parseFloat(budgetDiv.weight || 0).toFixed(2)}%`,
            `Budget: ₱${parseFloat(budgetDiv.budget || budgetDiv.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `Breakdown: ${(budgetDiv.breakdown || budgetDiv.description || 'N/A').substring(0, 80)}`
          ];
          
          budgetDivInfo.forEach(info => {
            doc.text(info, 25, yPos);
            yPos += 4;
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
          });
          
          yPos += 2;
          
          // Physical Division
          doc.setFont(undefined, 'bold');
          doc.text('Physical Division:', 20, yPos);
          yPos += 4;
          doc.setFont(undefined, 'normal');
          
          const physicalDiv = milestone.physicalDivision || milestone.physical || {};
          const proofTypes = Array.isArray(physicalDiv.proofTypes) 
            ? physicalDiv.proofTypes.join(', ') 
            : (physicalDiv.proofTypes || 'N/A');
          const physicalDivInfo = [
            `Weight: ${parseFloat(physicalDiv.weight || 0).toFixed(2)}%`,
            `Proof Types: ${proofTypes.substring(0, 80)}`,
            `Description: ${(physicalDiv.description || 'N/A').substring(0, 80)}`
          ];
          
          physicalDivInfo.forEach(info => {
            doc.text(info, 25, yPos);
            yPos += 4;
            if (yPos > 180) {
              doc.addPage();
              yPos = 20;
            }
          });
          
          yPos += 3;
        });
      }
      
      // Separator between projects
      if (idx < transformed.length - 1) {
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 283, yPos);
        yPos += 10;
      }
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 250, 200);
      doc.text(`Generated by Build Watch - ${organizationName}`, 14, 200);
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 14, 205);
    }

    const fileDate = new Date().toISOString().split('T')[0];
    doc.save(`${fileNamePrefix}-export-${fileDate}.pdf`);
  };

  // Export to HTML with comprehensive RPMES-style format
  const exportToHTML = (exportData) => {
    const transformed = transformData(exportData);
    
    // Get current date and time
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = now.toLocaleTimeString('en-PH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const reportMonth = now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }).toUpperCase();
    
    // Get user/organization info
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const organizationName = userData.implementingOfficeName || userData.office || userData.department || 'MUNICIPAL ENGINEERING OFFICE';
    
    // Calculate summary statistics
    const totalProjects = transformed.length;
    const totalBudget = transformed.reduce((sum, p) => sum + parseFloat(p.totalBudget || 0), 0);
    const avgProgress = totalProjects > 0 
      ? transformed.reduce((sum, p) => sum + parseFloat(p.overallProgress || p.progress?.overall || 0), 0) / totalProjects 
      : 0;

    const escapeHtml = (text) => {
      if (text === null || text === undefined) return 'N/A';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    };

    // Build project sections
    let projectSections = '';
    
    transformed.forEach((project, idx) => {
      // Calculate expected days
      let expectedDays = 'N/A';
      if (project.startDate && project.endDate) {
        try {
          const start = new Date(project.startDate);
          const end = new Date(project.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          expectedDays = diffDays.toString();
        } catch (e) {}
      }
      
      // Get EIU/Contractor info
      const eiuInfo = project.assignedEIU || project.eiuPersonnel || project.contractor || {};
      
      // Build milestones HTML
      let milestonesHTML = '<p><strong>No milestones available</strong></p>';
      if (project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0) {
        milestonesHTML = project.milestones.map((milestone, mIdx) => {
          let divisionsHTML = '';
          
          // Timeline Division
          const timelineDiv = milestone.timelineDivision || milestone.timeline || {};
          divisionsHTML += `<div class="division-item">
            <h5>Timeline Division</h5>
            <div class="division-details">
              <p><strong>Weight:</strong> ${parseFloat(timelineDiv.weight || 0).toFixed(2)}%</p>
              <p><strong>Start:</strong> ${formatDateForExcel(timelineDiv.startDate || timelineDiv.start)}</p>
              <p><strong>End:</strong> ${formatDateForExcel(timelineDiv.endDate || timelineDiv.end)}</p>
              <p><strong>Description:</strong> ${escapeHtml(timelineDiv.description || 'N/A')}</p>
            </div>
          </div>`;
          
          // Budget Division
          const budgetDiv = milestone.budgetDivision || milestone.budget || {};
          divisionsHTML += `<div class="division-item">
            <h5>Budget Division</h5>
            <div class="division-details">
              <p><strong>Weight:</strong> ${parseFloat(budgetDiv.weight || 0).toFixed(2)}%</p>
              <p><strong>Budget:</strong> ₱${parseFloat(budgetDiv.budget || budgetDiv.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p><strong>Breakdown:</strong> ${escapeHtml(budgetDiv.breakdown || budgetDiv.description || 'N/A')}</p>
            </div>
          </div>`;
          
          // Physical Division
          const physicalDiv = milestone.physicalDivision || milestone.physical || {};
          const proofTypes = Array.isArray(physicalDiv.proofTypes) ? physicalDiv.proofTypes.join(', ') : (physicalDiv.proofTypes || 'N/A');
          divisionsHTML += `<div class="division-item">
            <h5>Physical Division</h5>
            <div class="division-details">
              <p><strong>Weight:</strong> ${parseFloat(physicalDiv.weight || 0).toFixed(2)}%</p>
              <p><strong>Proof Types:</strong> ${escapeHtml(proofTypes)}</p>
              <p><strong>Description:</strong> ${escapeHtml(physicalDiv.description || 'N/A')}</p>
            </div>
          </div>`;
          
          return `
            <div class="milestone-item">
              <h4>Milestone ${mIdx + 1}: ${escapeHtml(milestone.title || milestone.name || 'N/A')}</h4>
              <div class="milestone-details">
                <p><strong>Status:</strong> ${escapeHtml(milestone.status || 'N/A')}</p>
                <p><strong>Weight:</strong> ${parseFloat(milestone.weight || 0).toFixed(2)}%</p>
                <p><strong>Budget:</strong> ₱${parseFloat(milestone.budget || milestone.plannedBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p><strong>Due Date:</strong> ${formatDateForExcel(milestone.dueDate || milestone.targetDate || milestone.deadline)}</p>
                <p><strong>Priority:</strong> ${escapeHtml(milestone.priority || 'N/A')}</p>
                <p><strong>Description:</strong> ${escapeHtml(milestone.description || 'N/A')}</p>
                ${divisionsHTML}
              </div>
            </div>
          `;
        }).join('');
      }
      
      projectSections += `
        <div class="project-section">
          <h2 class="project-title">PROJECT ${idx + 1}: ${escapeHtml(project.name || 'N/A')}</h2>
          
          <div class="info-section">
            <h3>Basic Project Information</h3>
            <div class="info-grid">
              <div class="info-item"><strong>Project Code:</strong> ${escapeHtml(project.projectCode || 'N/A')}</div>
              <div class="info-item"><strong>Implementing Office:</strong> ${escapeHtml(project.implementingOfficeName || project.implementingOffice || organizationName)}</div>
              <div class="info-item"><strong>Category:</strong> ${escapeHtml(project.category || 'N/A')}</div>
              <div class="info-item"><strong>Location/Barangay:</strong> ${escapeHtml(project.location || project.barangay || 'N/A')}</div>
              <div class="info-item"><strong>Priority:</strong> ${escapeHtml(project.priority || 'N/A')}</div>
              <div class="info-item"><strong>Funding Source:</strong> ${escapeHtml(project.fundingSource || 'Local Development Fund')}</div>
              <div class="info-item"><strong>Created Date:</strong> ${formatDateForExcel(project.createdAt || project.createdDate)}</div>
              <div class="info-item"><strong>Status:</strong> ${escapeHtml(project.status || 'N/A')}</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Timeline Information</h3>
            <div class="info-grid">
              <div class="info-item"><strong>Start Date:</strong> ${formatDateForExcel(project.startDate)}</div>
              <div class="info-item"><strong>Target Completion Date:</strong> ${formatDateForExcel(project.endDate || project.targetCompletionDate)}</div>
              <div class="info-item"><strong>Expected Days of Completion:</strong> ${expectedDays}</div>
              <div class="info-item"><strong>Actual Completion Date:</strong> ${formatDateForExcel(project.actualCompletionDate || project.completedDate)}</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Budget Information</h3>
            <div class="info-grid">
              <div class="info-item"><strong>Total Budget Allocation:</strong> ₱${parseFloat(project.totalBudget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="info-item full-width"><strong>Budget Description:</strong> ${escapeHtml(project.budgetDescription || project.budgetBreakdown || 'N/A')}</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Progress Information</h3>
            <div class="info-grid">
              <div class="info-item"><strong>Overall Progress:</strong> ${parseFloat(project.overallProgress || project.progress?.overall || 0).toFixed(2)}%</div>
              <div class="info-item"><strong>Timeline Progress:</strong> ${parseFloat(project.timelineProgress || project.progress?.internalTimeline || project.progress?.timeline || 0).toFixed(2)}%</div>
              <div class="info-item"><strong>Budget Progress:</strong> ${parseFloat(project.budgetProgress || project.progress?.internalBudget || project.progress?.budget || 0).toFixed(2)}%</div>
              <div class="info-item"><strong>Physical Progress:</strong> ${parseFloat(project.physicalProgress || project.progress?.internalPhysical || project.progress?.physical || 0).toFixed(2)}%</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>EIU/Contractor Information</h3>
            <div class="info-grid">
              <div class="info-item"><strong>Company Name:</strong> ${escapeHtml(eiuInfo.fullName || eiuInfo.name || eiuInfo.companyName || 'N/A')}</div>
              <div class="info-item"><strong>Email/Username:</strong> ${escapeHtml(eiuInfo.email || eiuInfo.username || 'N/A')}</div>
              <div class="info-item"><strong>Contact Number:</strong> ${escapeHtml(eiuInfo.contactNumber || eiuInfo.phone || 'N/A')}</div>
              <div class="info-item"><strong>Birthdate:</strong> ${formatDateForExcel(eiuInfo.birthdate)}</div>
              <div class="info-item"><strong>Group:</strong> ${escapeHtml(eiuInfo.group || 'N/A')}</div>
              <div class="info-item"><strong>Department:</strong> ${escapeHtml(eiuInfo.department || 'N/A')}</div>
              <div class="info-item"><strong>Subrole:</strong> ${escapeHtml(eiuInfo.subRole || eiuInfo.subrole || 'N/A')}</div>
              <div class="info-item"><strong>Company:</strong> ${escapeHtml(eiuInfo.company || eiuInfo.companyName || 'N/A')}</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Project Description</h3>
            <p>${escapeHtml(project.description || project.objectives || 'N/A')}</p>
            <p><strong>Expected Outputs:</strong> ${escapeHtml(project.expectedOutputs || project.outputs || 'N/A')}</p>
            <p><strong>Target Beneficiaries:</strong> ${escapeHtml(project.targetBeneficiaries || project.beneficiaries || 'N/A')}</p>
          </div>
          
          <div class="info-section">
            <h3>Physical Accomplishment Information</h3>
            <div class="info-grid">
              <div class="info-item full-width"><strong>General Description:</strong> ${escapeHtml(project.generalDescription || project.description || 'N/A')}</div>
              <div class="info-item full-width"><strong>Initial Photo Uploading:</strong> ${escapeHtml(project.initialPhotoUploading || project.initialPhotos || 'N/A')}</div>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Milestones Set</h3>
            <div class="milestones-container">
              ${milestonesHTML}
            </div>
          </div>
        </div>
      `;
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPMES Project Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            background: #f5f5f5; 
            padding: 20px;
            line-height: 1.6;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
        }
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .header h2 {
            font-size: 18px;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .meta {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
        }
        .meta p {
            margin: 5px 0;
            color: #333;
        }
        .summary {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item strong {
            display: block;
            font-size: 24px;
            color: #2563eb;
            margin-bottom: 5px;
        }
        .summary-item span {
            color: #666;
            font-size: 14px;
        }
        .project-section {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .project-title {
            color: #2563eb;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        .info-section {
            margin-bottom: 25px;
        }
        .info-section h3 {
            color: #1e40af;
            font-size: 16px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        }
        .info-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .info-item.full-width {
            grid-column: 1 / -1;
        }
        .info-item strong {
            color: #2563eb;
            display: block;
            margin-bottom: 5px;
        }
        .milestones-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .milestone-item {
            background: #f8f9fa;
            border-left: 4px solid #2563eb;
            padding: 15px;
            border-radius: 4px;
        }
        .milestone-item h4 {
            color: #1e40af;
            margin-bottom: 10px;
        }
        .milestone-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .milestone-details p {
            margin: 5px 0;
        }
        .division-item {
            background: #e3f2fd;
            padding: 12px;
            border-radius: 4px;
            margin-top: 10px;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .division-item h5 {
            color: #1e40af;
            margin-bottom: 8px;
            font-size: 15px;
            font-weight: bold;
        }
        .division-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
        }
        .division-details p {
            margin: 4px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
            margin-top: 30px;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .project-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px;">
                <img src="/santa-cruz-seal.png" alt="Santa Cruz Seal" style="height: 70px; width: 70px; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">
                <div style="flex: 1; text-align: center; min-width: 0;">
                    <h1>SANTA CRUZ PROJECT MONITORING SYSTEM</h1>
                    <h2>PROJECT INFORMATION</h2>
                    <p>As of ${reportMonth}</p>
                </div>
                <img src="/mpado_logo.png" alt="MPDO Logo" style="height: 70px; width: 70px; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';">
            </div>
        </div>
        
        <div class="meta">
            <p><strong>Implementing Agency:</strong> ${escapeHtml(organizationName)}</p>
            <p><strong>Report Generated:</strong> ${currentDate} at ${currentTime}</p>
        </div>
        
        <div class="summary">
            <div class="summary-item">
                <strong>${totalProjects}</strong>
                <span>Total Projects</span>
            </div>
            <div class="summary-item">
                <strong>₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                <span>Total Budget</span>
            </div>
            <div class="summary-item">
                <strong>${avgProgress.toFixed(2)}%</strong>
                <span>Average Progress</span>
            </div>
        </div>
        
        ${projectSections}
        
        <div class="footer">
            <p>Generated by Build Watch - ${escapeHtml(organizationName)}</p>
            <p>Generated on: ${currentDate} at ${currentTime}</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileNamePrefix}-export-${fileDate}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fetch full project details including milestones and EIU information
  const fetchFullProjectDetails = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : `${window.location.protocol}//${window.location.hostname}/api`;
      
      const response = await fetch(`${API_URL}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.project) {
          const project = result.project;
          
          // If EIU personnel ID exists, fetch full EIU user details
          if (project.eiuPersonnelId) {
            try {
              // Try multiple API endpoints for user details
              let eiuUserData = null;
              
              // Try /api/users/:id first
              try {
                const eiuResponse = await fetch(`${API_URL}/users/${project.eiuPersonnelId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (eiuResponse.ok) {
                  const eiuResult = await eiuResponse.json();
                  if (eiuResult.success && eiuResult.user) {
                    eiuUserData = eiuResult.user;
                  }
                }
              } catch (err) {
                // If that fails, try /api/eiu/projects to get EIU info
                try {
                  const eiuProjectsResponse = await fetch(`${API_URL}/eiu/projects`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  
                  if (eiuProjectsResponse.ok) {
                    const eiuProjectsResult = await eiuProjectsResponse.json();
                    if (eiuProjectsResult.success && Array.isArray(eiuProjectsResult.projects)) {
                      const matchingProject = eiuProjectsResult.projects.find(p => p.id === projectId);
                      if (matchingProject && matchingProject.assignedEIU) {
                        eiuUserData = matchingProject.assignedEIU;
                      }
                    }
                  }
                } catch (err2) {
                  console.warn(`Failed to fetch EIU details via alternative endpoint:`, err2);
                }
              }
              
              if (eiuUserData) {
                // Merge EIU user details into project
                project.eiuPersonnel = {
                  ...project.eiuPersonnel,
                  ...eiuUserData,
                  fullName: eiuUserData.fullName || eiuUserData.name || project.eiuPersonnel?.name || 'N/A',
                  email: eiuUserData.email || eiuUserData.username || project.eiuPersonnel?.email || 'N/A',
                  contactNumber: eiuUserData.contactNumber || eiuUserData.phone || project.eiuPersonnel?.contactNumber || 'N/A',
                  birthdate: eiuUserData.birthdate || project.eiuPersonnel?.birthdate || null,
                  group: eiuUserData.group || project.eiuPersonnel?.group || 'N/A',
                  department: eiuUserData.department || project.eiuPersonnel?.department || 'N/A',
                  subRole: eiuUserData.subRole || eiuUserData.subrole || project.eiuPersonnel?.subRole || 'N/A',
                  company: eiuUserData.company || eiuUserData.companyName || project.eiuPersonnel?.company || 'N/A'
                };
              } else if (project.eiuPersonnel) {
                // Ensure all fields have values even if fetch failed
                project.eiuPersonnel = {
                  ...project.eiuPersonnel,
                  contactNumber: project.eiuPersonnel.contactNumber || 'N/A',
                  birthdate: project.eiuPersonnel.birthdate || null,
                  group: project.eiuPersonnel.group || 'N/A',
                  department: project.eiuPersonnel.department || 'N/A',
                  company: project.eiuPersonnel.company || project.eiuPersonnel.companyName || 'N/A'
                };
              }
            } catch (eiuError) {
              console.warn(`Failed to fetch EIU details for project ${projectId}:`, eiuError);
              // Ensure basic structure exists even if fetch failed
              if (project.eiuPersonnel) {
                project.eiuPersonnel = {
                  ...project.eiuPersonnel,
                  contactNumber: project.eiuPersonnel.contactNumber || 'N/A',
                  birthdate: project.eiuPersonnel.birthdate || null,
                  group: project.eiuPersonnel.group || 'N/A',
                  department: project.eiuPersonnel.department || 'N/A',
                  company: project.eiuPersonnel.company || project.eiuPersonnel.companyName || 'N/A'
                };
              }
            }
          }
          
          return project;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch full details for project ${projectId}:`, error);
    }
    return null;
  };

  // Handle export with format
  const handleExport = async (format) => {
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }

    setShowFormatModal(false);
    setShowLoadingModal(true);
    setLoadingMessage(`Preparing export data...`);
    setExportFormat(format.toUpperCase());

    try {
      let exportData = data;
      
      // For PDF and HTML exports, enrich data with full details including milestones and EIU info
      if ((format === 'pdf' || format === 'html') && exportType === 'projects') {
        setLoadingMessage('Fetching complete project details...');
        
        // Always fetch full details to ensure we have milestones and complete EIU information
        const enrichedProjects = await Promise.all(
          data.map(async (project) => {
            const fullDetails = await fetchFullProjectDetails(project.id);
            if (fullDetails) {
              // Merge full details, prioritizing fetched data
              return { 
                ...project, 
                ...fullDetails,
                milestones: fullDetails.milestones || project.milestones || [],
                eiuPersonnel: fullDetails.eiuPersonnel || project.eiuPersonnel || project.assignedEIU || project.contractor
              };
            }
            return project;
          })
        );
        exportData = enrichedProjects;
      }

      setLoadingMessage(`Exporting as ${format.toUpperCase()}...`);
      // Small delay to show loading animation
      await new Promise(resolve => setTimeout(resolve, 300));

      if (format === 'pdf') {
        await exportToPDF(exportData);
      } else if (format === 'html') {
        exportToHTML(exportData);
      }

      setShowLoadingModal(false);
      setShowSuccessModal(true);

      // Auto-close success modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setShowLoadingModal(false);
      alert('Failed to export data: ' + error.message);
    }
  };

  // Expose export function to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.projectExportCenter = {
        export: () => setShowFormatModal(true),
        exportWithFormat: handleExport
      };
    }
  }, [data]);

  return (
    <>
      {/* Format Selection Modal */}
      {showFormatModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFormatModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Export Data</h3>
                <p className="text-sm text-gray-600 mt-1">Choose your preferred export format</p>
              </div>
              <button
                onClick={() => setShowFormatModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border-2 border-red-200 hover:border-red-400 rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">Export to PDF</h4>
                  <p className="text-xs text-gray-600 mt-1">Formatted PDF report</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('html')}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Export to HTML Report</h4>
                  <p className="text-xs text-gray-600 mt-1">Interactive HTML report</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Preparing Export</h3>
              <p className="text-sm text-gray-600 text-center">{loadingMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Modern Check Animation */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center justify-center">
              {/* Modern Animated Checkmark */}
              <div className="relative w-24 h-24 mb-6">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                {/* Middle ring */}
                <div className="absolute inset-2 bg-green-200 rounded-full animate-pulse opacity-50"></div>
                {/* Main circle with checkmark */}
                <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg transform scale-0 animate-[scaleIn_0.4s_ease-out_forwards]">
                  <svg 
                    className="w-14 h-14 text-white transform scale-0 animate-[scaleIn_0.3s_ease-out_0.2s_forwards,drawCheck_0.4s_ease-out_0.3s_forwards]" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ strokeDasharray: '50', strokeDashoffset: '50' }}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="3.5" 
                      d="M5 13l4 4L19 7"
                      className="animate-[drawCheck_0.4s_ease-out_0.3s_forwards]"
                      style={{ strokeDasharray: '50', strokeDashoffset: '50' }}
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2" style={{ animation: 'fadeInUp 0.4s ease-out 0.4s forwards', opacity: 0 }}>Export Successful!</h3>
              <p className="text-sm text-gray-600 text-center mb-6" style={{ animation: 'fadeInUp 0.4s ease-out 0.5s forwards', opacity: 0 }}>
                Your data has been exported successfully as <span className="font-semibold text-green-600">{exportFormat}</span>.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all duration-200 transform hover:scale-105 shadow-md"
                style={{ animation: 'fadeInUp 0.4s ease-out 0.6s forwards', opacity: 0 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes drawCheck {
          from {
            stroke-dashoffset: 50;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

