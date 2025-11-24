import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Centralized Submission History & Analytics Component
 * 
 * Supports two modes:
 * - EIU (submitter): Shows submissions made by the user
 * - LGU-IU (reviewer): Shows submissions received for review
 * 
 * @param {Object} props
 * @param {string} props.mode - 'eiu' or 'lgu-iu'
 * @param {string} props.projectId - Current project ID
 * @param {string} props.apiUrl - API base URL
 * @param {Function} props.onRefresh - Callback when data is refreshed
 * @param {Object} props.theme - Theme configuration (colors, etc.)
 */
export default function SubmissionHistoryAnalytics({
  mode = 'eiu',
  projectId = null,
  apiUrl = '/api',
  onRefresh = null,
  theme = null
}) {
  // Default themes
  const defaultThemes = {
    eiu: {
      primary: 'emerald',
      primaryLight: 'green',
      headerBg: 'from-emerald-50 to-emerald-100',
      headerBorder: 'border-emerald-200',
      headerHover: 'hover:from-emerald-100 hover:to-emerald-200',
      iconBg: 'from-emerald-500 to-emerald-600',
      iconHover: 'hover:from-emerald-600 hover:to-emerald-700',
      titleHover: 'group-hover:text-emerald-800',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      btnSecondary: 'bg-blue-600 hover:bg-blue-700 text-white',
      chartBg1: 'from-green-50 to-emerald-50',
      chartBg2: 'from-emerald-50 to-green-50',
      chartBorder1: 'border-green-200',
      chartBorder2: 'border-emerald-200',
      chartIcon1: 'text-green-400',
      chartIcon2: 'text-emerald-400',
      chartText1: 'text-green-600',
      chartText2: 'text-emerald-600',
      chartColors: {
        primary: 'rgba(16, 185, 129, 0.8)',
        secondary: 'rgba(5, 150, 105, 0.6)',
        gradient: ['rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 0.4)']
      },
      timelineColor: 'from-emerald-200 via-emerald-300 to-emerald-400',
      timelineDot: 'bg-emerald-500',
      emptyStateBg: 'from-emerald-100 to-emerald-200',
      emptyStateIcon: 'text-emerald-400',
      statCard1: 'text-emerald-600',
      statCard2: 'text-amber-600',
      statCard3: 'text-green-600',
      statCard4: 'text-red-600',
      statIcon1: 'from-emerald-500 to-emerald-600',
      statIcon2: 'from-amber-500 to-amber-600',
      statIcon3: 'from-green-500 to-emerald-600',
      statIcon4: 'from-red-500 to-red-600'
    },
    'lgu-iu': {
      primary: 'amber',
      primaryLight: 'orange',
      headerBg: 'from-yellow-50 to-yellow-100',
      headerBorder: 'border-yellow-200',
      headerHover: 'hover:from-yellow-100 hover:to-yellow-200',
      iconBg: 'from-amber-500 to-amber-600',
      iconHover: 'hover:from-amber-600 hover:to-amber-700',
      titleHover: 'group-hover:text-amber-800',
      btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
      btnSecondary: 'bg-orange-600 hover:bg-orange-700 text-white',
      chartBg1: 'from-amber-50 to-orange-50',
      chartBg2: 'from-green-50 to-emerald-50',
      chartBorder1: 'border-amber-200',
      chartBorder2: 'border-green-200',
      chartIcon1: 'text-amber-400',
      chartIcon2: 'text-green-400',
      chartText1: 'text-amber-600',
      chartText2: 'text-green-600',
      chartColors: {
        primary: 'rgba(245, 158, 11, 0.8)',
        secondary: 'rgba(217, 119, 6, 0.6)',
        gradient: ['rgba(245, 158, 11, 0.8)', 'rgba(217, 119, 6, 0.4)']
      },
      timelineColor: 'from-amber-200 via-amber-300 to-amber-400',
      timelineDot: 'bg-amber-500',
      emptyStateBg: 'from-amber-100 to-amber-200',
      emptyStateIcon: 'text-amber-400',
      statCard1: 'text-amber-600',
      statCard2: 'text-orange-600',
      statCard3: 'text-green-600',
      statCard4: 'text-red-600',
      statIcon1: 'from-amber-500 to-amber-600',
      statIcon2: 'from-orange-500 to-orange-600',
      statIcon3: 'from-green-500 to-green-600',
      statIcon4: 'from-red-500 to-red-600'
    }
  };

  const currentTheme = theme || defaultThemes[mode] || defaultThemes.eiu;
  const [isExpanded, setIsExpanded] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeline'
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [currentProjectId, setProjectId] = useState(projectId);

  const timelineContainerRef = useRef(null);
  const listContainerRef = useRef(null);

  // Watch for project selection changes from global scope
  useEffect(() => {
    const checkProjectChange = () => {
      if (typeof window !== 'undefined' && window.selectedProject) {
        const newProjectId = window.selectedProject.id;
        if (newProjectId && newProjectId !== currentProjectId) {
          setProjectId(newProjectId);
        }
      }
    };

    checkProjectChange();
    const interval = setInterval(checkProjectChange, 1000);

    const handleProjectSelect = (e) => {
      if (e.detail && e.detail.projectId) {
        setProjectId(e.detail.projectId);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('projectSelected', handleProjectSelect);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('projectSelected', handleProjectSelect);
      }
    };
  }, [currentProjectId]);

  // Load submissions when projectId changes
  useEffect(() => {
    if (currentProjectId) {
      loadSubmissions(currentProjectId);
    } else {
      setSubmissions([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
    }
  }, [currentProjectId, mode]);

  // Update views when submissions change
  useEffect(() => {
    updateStats();
    if (viewMode === 'list') {
      updateListView();
    } else {
      updateTimeline();
    }
  }, [submissions, viewMode]);

  async function loadSubmissions(targetProjectId = null) {
    const actualProjectId = targetProjectId || currentProjectId || (typeof window !== 'undefined' && window.selectedProject?.id);
    if (!actualProjectId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const actualApiUrl = apiUrl || (typeof window !== 'undefined' && window.API_URL) || '/api';
      const response = await fetch(`${actualApiUrl}/milestones/milestone-submissions?projectId=${actualProjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubmissions(data.submissions || []);
          if (onRefresh) onRefresh(data.submissions);
        }
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateStats() {
    const total = submissions.length;
    const pending = submissions.filter(s => 
      s.status === 'pending_review' || s.status === 'under_review'
    ).length;
    const approved = submissions.filter(s => s.status === 'approved').length;
    const rejected = submissions.filter(s => 
      s.status === 'rejected' || s.status === 'needs_revision'
    ).length;
    
    setStats({ total, pending, approved, rejected });
  }

  // Prepare chart data for Budget Utilization Trend (EIU) or EIU Submission Trend (LGU-IU)
  function getBudgetChartData() {
    if (mode === 'eiu') {
      // Budget Utilization Trend
      const budgetData = submissions
        .filter(s => s.usedBudget > 0)
        .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
        .map(s => ({
          date: new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          utilization: s.budgetUtilizationPercentage || (s.plannedBudget > 0 ? (s.usedBudget / s.plannedBudget) * 100 : 0)
        }));

      return {
        labels: budgetData.map(d => d.date),
        datasets: [{
          label: 'Budget Utilization (%)',
          data: budgetData.map(d => d.utilization),
          backgroundColor: currentTheme.chartColors.primary,
          borderColor: currentTheme.chartColors.secondary,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      };
    } else {
      // EIU Submission Trend
      const submissionsByDate = {};
      submissions.forEach(submission => {
        const date = new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
      });

      const sortedDates = Object.keys(submissionsByDate).sort((a, b) => {
        return new Date(a) - new Date(b);
      });

      return {
        labels: sortedDates,
        datasets: [{
          label: 'Submissions Count',
          data: sortedDates.map(date => submissionsByDate[date]),
          backgroundColor: currentTheme.chartColors.primary,
          borderColor: currentTheme.chartColors.secondary,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      };
    }
  }

  // Prepare chart data for Progress Completion Curve (EIU) or Review Completion Curve (LGU-IU)
  function getProgressChartData() {
    if (mode === 'eiu') {
      // Progress Completion Curve
      const progressData = submissions
        .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
        .map((s, index) => ({
          date: new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          progress: ((index + 1) / submissions.length) * 100,
          status: s.status
        }));

      return {
        labels: progressData.map(d => d.date),
        datasets: [{
          label: 'Progress Completion (%)',
          data: progressData.map(d => d.progress),
          borderColor: currentTheme.chartColors.primary,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, currentTheme.chartColors.gradient[0]);
            gradient.addColorStop(1, currentTheme.chartColors.gradient[1]);
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: currentTheme.chartColors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      };
    } else {
      // Review Completion Curve
      const reviewData = submissions
        .filter(s => s.status === 'approved' || s.status === 'rejected')
        .sort((a, b) => new Date(a.reviewedAt || a.updatedAt) - new Date(b.reviewedAt || b.updatedAt))
        .map((s, index) => ({
          date: new Date(s.reviewedAt || s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          completion: ((index + 1) / submissions.length) * 100,
          status: s.status
        }));

      return {
        labels: reviewData.map(d => d.date),
        datasets: [{
          label: 'Review Completion (%)',
          data: reviewData.map(d => d.completion),
          borderColor: '#10b981',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
            gradient.addColorStop(1, 'rgba(5, 150, 105, 0.4)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      };
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label || 'Value'}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 11
          },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280'
        },
        grid: {
          display: false
        }
      }
    }
  };

  function updateTimeline() {
    if (!timelineContainerRef.current || viewMode !== 'timeline') return;
    
    const sortedSubmissions = [...submissions].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    if (sortedSubmissions.length === 0) {
      timelineContainerRef.current.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm font-medium">No submissions yet</p>
          <p class="text-xs text-gray-400 mt-1">Submit your first milestone update to see detailed timeline</p>
        </div>
      `;
      return;
    }

    timelineContainerRef.current.innerHTML = sortedSubmissions.map((submission, index) => {
      const date = new Date(submission.submittedAt);
      const statusConfig = {
        'approved': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800', text: 'APPROVED' },
        'pending_review': { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', text: 'PENDING REVIEW' },
        'under_review': { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', text: 'UNDER REVIEW' },
        'rejected': { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800', text: 'REJECTED' },
        'needs_revision': { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', text: 'NEEDS REVISION' }
      };
      const status = statusConfig[submission.status] || statusConfig['pending_review'];
      
      return `
        <div class="flex items-start space-x-4 mb-6">
          <div class="flex-shrink-0 w-5 h-5 ${currentTheme.timelineDot} rounded-full border-4 border-white shadow-lg relative z-10 mt-1"></div>
          <div class="flex-1 ${status.bg} ${status.border} rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-bold text-gray-900 text-lg">${submission.milestone?.title || 'Milestone Update'}</h4>
              <span class="text-xs font-semibold px-3 py-1 rounded-full ${status.badge}">
                ${status.text}
              </span>
            </div>
            <div class="flex items-center gap-2 mb-3 text-sm text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span class="font-medium">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            ${mode === 'lgu-iu' && submission.project?.name ? `
              <div class="flex items-center gap-2 mb-3 text-sm text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span class="font-medium">Project: ${submission.project.name}</span>
              </div>
            ` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white rounded-lg p-3 border border-gray-200">
                <p class="text-xs text-gray-500 mb-1">Budget Used</p>
                <p class="text-lg font-bold text-green-600">₱${parseFloat(submission.usedBudget || 0).toLocaleString()}</p>
              </div>
              ${submission.budgetUtilizationPercentage ? `
              <div class="bg-white rounded-lg p-3 border border-gray-200">
                <p class="text-xs text-gray-500 mb-1">Budget Utilization</p>
                <p class="text-lg font-bold text-blue-600">${submission.budgetUtilizationPercentage}%</p>
              </div>
              ` : ''}
              ${submission.milestoneUtilizationPercentage ? `
              <div class="bg-white rounded-lg p-3 border border-gray-200">
                <p class="text-xs text-gray-500 mb-1">Milestone Weight</p>
                <p class="text-lg font-bold text-purple-600">${submission.milestoneUtilizationPercentage}%</p>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateListView() {
    if (!listContainerRef.current || viewMode !== 'list') return;
    
    const sortedSubmissions = [...submissions].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    if (sortedSubmissions.length === 0) {
      listContainerRef.current.innerHTML = '';
      return;
    }

    const statusConfig = {
      'pending_review': { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', label: 'Pending Review' },
      'under_review': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', label: 'Under Review' },
      'approved': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800', label: 'Approved' },
      'needs_revision': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', label: 'Needs Revision' },
      'rejected': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', label: 'Rejected' }
    };

    const iconBgClass = mode === 'eiu' ? 'bg-emerald-100' : 'bg-amber-100';
    const iconTextClass = mode === 'eiu' ? 'text-emerald-600' : 'text-amber-600';
    
    listContainerRef.current.innerHTML = sortedSubmissions.map(submission => {
      const date = new Date(submission.submittedAt);
      const status = statusConfig[submission.status] || statusConfig['pending_review'];
      
      return `
        <div class="bg-white rounded-xl border-2 ${status.border} p-6 hover:shadow-lg transition-all duration-200">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 ${iconBgClass} rounded-xl flex items-center justify-center shadow-sm">
                <svg class="w-6 h-6 ${iconTextClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-gray-900 text-lg mb-1">${submission.milestone?.title || 'Milestone Update'}</h4>
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            <span class="px-4 py-2 rounded-lg text-sm font-bold border-2 ${status.border} ${status.bg} ${status.text}">
              ${status.label}
            </span>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Budget Used</label>
              <p class="text-2xl font-bold text-green-600">₱${parseFloat(submission.usedBudget || 0).toLocaleString()}</p>
            </div>
            ${submission.budgetUtilizationPercentage ? `
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
              <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Budget Utilization</label>
              <p class="text-2xl font-bold text-blue-600">${submission.budgetUtilizationPercentage}%</p>
            </div>
            ` : ''}
            ${submission.milestoneUtilizationPercentage ? `
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Milestone Weight</label>
              <p class="text-2xl font-bold text-purple-600">${submission.milestoneUtilizationPercentage}%</p>
            </div>
            ` : ''}
          </div>
          
          ${submission.physicalProgressDescription ? `
            <div class="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label class="text-sm font-semibold text-gray-700 mb-2 block">Progress Description</label>
              <p class="text-sm text-gray-600 leading-relaxed">${submission.physicalProgressDescription.substring(0, 200)}${submission.physicalProgressDescription.length > 200 ? '...' : ''}</p>
            </div>
          ` : ''}
          
          ${submission.reviewNotes ? `
            <div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <label class="text-sm font-semibold text-amber-800 mb-2 block flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Review Notes
              </label>
              <p class="text-sm text-amber-900 leading-relaxed">${submission.reviewNotes}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function handleExport() {
    if (submissions.length === 0) {
      alert('No submission data to export');
      return;
    }

    const csvData = [
      ['Submission Date', 'Project', 'Milestone', 'Status', 'Budget Used', 'Submitted By'],
      ...submissions.map(s => [
        new Date(s.submittedAt).toLocaleDateString(),
        s.project?.name || 'N/A',
        s.milestone?.title || 'N/A',
        s.status || 'N/A',
        `₱${parseFloat(s.usedBudget || 0).toLocaleString()}`,
        s.submitter?.fullName || s.submitter?.name || 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `submission-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleRefresh() {
    loadSubmissions();
  }

  const chartTitle1 = mode === 'eiu' ? 'Budget Utilization Trend' : 'EIU Submission Trend';
  const chartTitle2 = mode === 'eiu' ? 'Progress Completion Curve' : 'Review Completion Curve';

  return (
    <div className="profile-card border-2 border-gray-200 mb-8 shadow-lg">
      {/* Header */}
      <div 
        className={`bg-gradient-to-r ${currentTheme.headerBg} px-6 py-5 border-b-2 ${currentTheme.headerBorder} cursor-pointer ${currentTheme.headerHover} transition-all duration-300 group`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${currentTheme.iconBg} ${currentTheme.iconHover} rounded-xl flex items-center justify-center shadow-lg`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h3 className={`text-2xl font-bold text-gray-900 ${currentTheme.titleHover} transition-colors duration-300`}>
                Submission History & Analytics
              </h3>
              <p className="text-sm text-gray-600 font-medium">Track your milestone submissions and performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); handleExport(); }} 
              className={`${currentTheme.btnPrimary} px-4 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Export Report
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }} 
              className={`${currentTheme.btnSecondary} px-4 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh Data
            </button>
            <div className={`w-10 h-10 bg-gradient-to-br ${currentTheme.iconBg} ${currentTheme.iconHover} rounded-lg flex items-center justify-center shadow-md transition-all duration-200`}>
              <svg 
                className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-6 bg-gray-50">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {/* Total Submissions */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Submissions</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</p>
                  <p className={`text-xs font-medium ${currentTheme.statCard1}`}>Milestone updates</p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${currentTheme.statIcon1} rounded-xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Pending Review */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</p>
                  <p className={`text-xs font-medium ${currentTheme.statCard2}`}>Awaiting decision</p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${currentTheme.statIcon2} rounded-xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Approved */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Approved</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.approved}</p>
                  <p className={`text-xs font-medium ${currentTheme.statCard3}`}>Successfully finished</p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${currentTheme.statIcon3} rounded-xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Rejected/Needs Revision */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">{mode === 'eiu' ? 'Rejected' : 'Needs Revision'}</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stats.rejected}</p>
                  <p className={`text-xs font-medium ${currentTheme.statCard4}`}>Needs revision</p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${currentTheme.statIcon4} rounded-xl flex items-center justify-center shadow-lg`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chart 1 */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentTheme.iconBg} rounded-lg flex items-center justify-center shadow-md`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">{chartTitle1}</h4>
              </div>
              <div className="h-64">
                {submissions.length > 0 ? (
                  <Bar data={getBudgetChartData()} options={chartOptions} />
                ) : (
                  <div className={`h-full flex items-center justify-center bg-gradient-to-br ${currentTheme.chartBg1} rounded-xl border-2 ${currentTheme.chartBorder1}`}>
                    <div className="text-center">
                      <svg className={`w-12 h-12 ${currentTheme.chartIcon1} mx-auto mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                      </svg>
                      <p className={`${currentTheme.chartText1} text-sm font-semibold`}>
                        {mode === 'eiu' ? 'Budget trend will appear after submissions' : 'Submission trend will appear after updates'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Chart 2 */}
            <div className="bg-white rounded-xl p-6 hover:shadow-xl transition-all duration-200 border-2 border-gray-200">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentTheme.iconBg} rounded-lg flex items-center justify-center shadow-md`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">{chartTitle2}</h4>
              </div>
              <div className="h-64">
                {submissions.length > 0 ? (
                  <Line data={getProgressChartData()} options={chartOptions} />
                ) : (
                  <div className={`h-full flex items-center justify-center bg-gradient-to-br ${currentTheme.chartBg2} rounded-xl border-2 ${currentTheme.chartBorder2}`}>
                    <div className="text-center">
                      <svg className={`w-12 h-12 ${currentTheme.chartIcon2} mx-auto mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      <p className={`${currentTheme.chartText2} text-sm font-semibold`}>
                        {mode === 'eiu' ? 'Progress curve will appear after submissions' : 'Review curve will appear after submissions'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Timeline View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${currentTheme.iconBg} rounded-lg flex items-center justify-center shadow-md`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">Submission Timeline</h4>
            </div>
            <div className="flex items-center bg-gray-100 rounded-xl p-1.5 shadow-inner">
              <button 
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                  viewMode === 'list' 
                    ? `bg-white text-gray-900 shadow-md ${mode === 'eiu' ? 'text-emerald-700' : 'text-amber-700'}` 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                </svg>
                List View
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                  viewMode === 'timeline' 
                    ? `bg-white text-gray-900 shadow-md ${mode === 'eiu' ? 'text-emerald-700' : 'text-amber-700'}` 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Timeline View
              </button>
            </div>
          </div>
          
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="relative">
              <div className={`absolute left-10 top-0 bottom-0 w-1.5 bg-gradient-to-b ${currentTheme.timelineColor} rounded-full shadow-lg`}></div>
              <div ref={timelineContainerRef} className="space-y-0 pl-6">
                {/* Timeline items will be rendered here */}
              </div>
            </div>
          )}
          
          {/* List View */}
          {viewMode === 'list' && (
            <div ref={listContainerRef} className="space-y-4">
              {/* List items will be rendered here */}
            </div>
          )}
          
          {/* Empty State */}
          {submissions.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
              <div className={`w-20 h-20 bg-gradient-to-br ${currentTheme.emptyStateBg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                <svg className={`w-10 h-10 ${currentTheme.emptyStateIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">No Submissions Yet</h4>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                {mode === 'eiu' 
                  ? 'Submit your first milestone update to see detailed analytics, trends, and submission history appear here.'
                  : 'Submissions from EIU will appear here once they submit milestone updates for review.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
