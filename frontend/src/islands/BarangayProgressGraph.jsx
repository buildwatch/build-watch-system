import React, { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../config/api.js';

export default function BarangayProgressGraph({ barangayName, projects: initialProjects = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState(initialProjects);
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const modalChartInstanceRef = useRef(null);

  // Fetch projects if not provided or update when initialProjects change
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`${getApiUrl()}/projects/public?page=1&limit=1000&_t=${Date.now()}`);
        const data = await res.json().catch(() => ({}));
        const all = (data.projects || []).map(p => ({
          ...p,
          location: p.location || '',
        }));
        const byBarangay = all.filter(p => 
          (p.location || '').toLowerCase().includes(barangayName.toLowerCase())
        );
        setProjects(byBarangay);
      } catch (error) {
        console.error('Failed to fetch projects for graph:', error);
        // Fallback to initialProjects
        if (initialProjects.length > 0) {
          setProjects(initialProjects);
        }
      }
    }

    if (initialProjects.length === 0) {
      fetchProjects();
    } else {
      setProjects(initialProjects);
    }
  }, [barangayName, initialProjects]);

  useEffect(() => {
    async function fetchChartData() {
      if (projects.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const projectIds = projects.map(p => p.id);
        const updatesPromises = projectIds.map(async (projectId) => {
          try {
            const res = await fetch(`${getApiUrl()}/projects/${projectId}/updates?status=approved`);
            const data = await res.json();
            return (data.updates || []).map(update => ({
              ...update,
              projectId,
              date: new Date(update.createdAt || update.updatedAt)
            }));
          } catch (err) {
            console.error(`Failed to fetch updates for project ${projectId}:`, err);
            return [];
          }
        });

        const allUpdates = (await Promise.all(updatesPromises)).flat();
        
        // Group updates by date and aggregate progress metrics
        const dateMap = new Map();
        
        // Add project start dates as initial data points
        projects.forEach(project => {
          const startDate = new Date(project.startDate || project.createdAt);
          startDate.setHours(0, 0, 0, 0);
          const dateKey = startDate.toISOString().split('T')[0];
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: startDate,
              timeline: 0,
              budget: 0,
              physical: 0,
              overall: 0,
              count: 0
            });
          }
        });

        // Process updates
        allUpdates.forEach(update => {
          const date = new Date(update.createdAt || update.updatedAt);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date,
              timeline: 0,
              budget: 0,
              physical: 0,
              overall: 0,
              count: 0
            });
          }

          const dayData = dateMap.get(dateKey);
          
          // Get progress values from update or project
          const timeline = parseFloat(update.timelineProgress || update.currentProgress || 0);
          const budget = parseFloat(update.budgetProgress || update.currentProgress || 0);
          const physical = parseFloat(update.physicalProgress || update.currentProgress || 0);
          const overall = parseFloat(update.currentProgress || update.progress || 0);

          dayData.timeline += timeline;
          dayData.budget += budget;
          dayData.physical += physical;
          dayData.overall += overall;
          dayData.count += 1;
        });

        // Calculate averages for aggregate data
        const aggregateData = Array.from(dateMap.values())
          .map(day => ({
            ...day,
            timeline: day.count > 0 ? day.timeline / day.count : 0,
            budget: day.count > 0 ? day.budget / day.count : 0,
            physical: day.count > 0 ? day.physical / day.count : 0,
            overall: day.count > 0 ? day.overall / day.count : 0
          }))
          .sort((a, b) => a.date - b.date);

        // Build individual project data series
        const projectDataMap = new Map();
        projects.forEach(project => {
          const projectUpdates = allUpdates.filter(u => u.projectId === project.id);
          
          // Create timeline from project start to target/end date
          const projectStartDate = new Date(project.startDate || project.createdAt);
          const projectEndDate = new Date(project.targetCompletionDate || project.targetDateOfCompletion || project.endDate || projectStartDate);
          
          // Build data points for this project
          const projectTimeline = [];
          
          // Add start date point
          const startDate = new Date(projectStartDate);
          startDate.setHours(0, 0, 0, 0);
          projectTimeline.push({
            date: startDate,
            timeline: parseFloat(project.timelineProgress || 0),
            budget: parseFloat(project.budgetProgress || 0),
            physical: parseFloat(project.physicalProgress || 0),
            overall: parseFloat(project.overallProgress || project.progress || 0),
            projectId: project.id,
            projectName: project.name || project.projectName || 'Unnamed Project'
          });
          
          // Add update points
          projectUpdates.forEach(update => {
            const updateDate = new Date(update.createdAt || update.updatedAt);
            updateDate.setHours(0, 0, 0, 0);
            const dateKey = updateDate.toISOString().split('T')[0];
            
            // Only add if not duplicate date
            const existing = projectTimeline.find(p => p.date.toISOString().split('T')[0] === dateKey);
            if (!existing) {
              projectTimeline.push({
                date: updateDate,
                timeline: parseFloat(update.timelineProgress || update.currentProgress || 0),
                budget: parseFloat(update.budgetProgress || update.currentProgress || 0),
                physical: parseFloat(update.physicalProgress || update.currentProgress || 0),
                overall: parseFloat(update.currentProgress || update.progress || 0),
                projectId: project.id,
                projectName: project.name || project.projectName || 'Unnamed Project'
              });
            } else {
              // Update existing point with latest values
              existing.timeline = parseFloat(update.timelineProgress || update.currentProgress || existing.timeline);
              existing.budget = parseFloat(update.budgetProgress || update.currentProgress || existing.budget);
              existing.physical = parseFloat(update.physicalProgress || update.currentProgress || existing.physical);
              existing.overall = parseFloat(update.currentProgress || update.progress || existing.overall);
            }
          });
          
          // Add end date point (current progress at target date)
          const endDate = new Date(projectEndDate);
          endDate.setHours(0, 0, 0, 0);
          const endDateKey = endDate.toISOString().split('T')[0];
          const existingEnd = projectTimeline.find(p => p.date.toISOString().split('T')[0] === endDateKey);
          if (!existingEnd && endDate >= startDate) {
            const lastPoint = projectTimeline[projectTimeline.length - 1];
            projectTimeline.push({
              ...lastPoint,
              date: endDate
            });
          }
          
          // Sort by date
          projectTimeline.sort((a, b) => a.date - b.date);
          
          if (projectTimeline.length > 0) {
            projectDataMap.set(project.id, {
              projectId: project.id,
              projectName: project.name || project.projectName || 'Unnamed Project',
              data: projectTimeline
            });
          }
        });

        // If no aggregate data, create a default chart with project start dates
        if (aggregateData.length === 0) {
          const startDates = projects
            .map(p => new Date(p.startDate || p.createdAt))
            .sort((a, b) => a - b);
          
          if (startDates.length > 0) {
            aggregateData.push({
              date: startDates[0],
              timeline: 0,
              budget: 0,
              physical: 0,
              overall: 0
            });
          }
        }

        setChartData({
          aggregate: aggregateData,
          projects: Array.from(projectDataMap.values())
        });
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchChartData();
  }, [barangayName, projects]);

  useEffect(() => {
    if (!chartData || !chartData.aggregate || chartData.aggregate.length === 0 || isLoading) return;

    async function initChart() {
      // Dynamically import Chart.js
      const Chart = (await import('chart.js/auto')).default;
      
      // Destroy existing chart instances
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }

      // Collect all unique dates from aggregate and all projects
      const allDates = new Set();
      chartData.aggregate.forEach(d => {
        allDates.add(d.date.toISOString().split('T')[0]);
      });
      chartData.projects.forEach(proj => {
        proj.data.forEach(d => {
          allDates.add(d.date.toISOString().split('T')[0]);
        });
      });

      // Create sorted date array
      const sortedDates = Array.from(allDates)
        .map(d => new Date(d))
        .sort((a, b) => a - b);

      const labels = sortedDates.map(d => {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // Helper function to find value for a date, using last known value for missing dates
      const getValueForDate = (dataArray, dateKey, field) => {
        // First, try to find exact date match
        const exactPoint = dataArray.find(d => d.date.toISOString().split('T')[0] === dateKey);
        if (exactPoint) return exactPoint[field];
        
        // If no exact match, find the last known value before this date
        const targetDate = new Date(dateKey);
        let lastKnownValue = null;
        
        // Sort data array by date to ensure we check in order
        const sortedData = [...dataArray].sort((a, b) => a.date - b.date);
        
        for (const point of sortedData) {
          const pointDate = new Date(point.date);
          if (pointDate <= targetDate) {
            lastKnownValue = point[field];
          } else {
            break; // We've passed the target date
          }
        }
        
        return lastKnownValue !== null ? lastKnownValue : null;
      };

      // Build datasets
      const datasets = [];

      // Aggregate datasets (thick, prominent lines)
      datasets.push({
        label: 'Aggregate: Timeline Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          const val = getValueForDate(chartData.aggregate, dateKey, 'timeline');
          return val !== null ? val : null;
        }),
        borderColor: '#0EA5E9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderDash: [],
        order: 100 // Render after individual projects
      });

      datasets.push({
        label: 'Aggregate: Budget Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          const val = getValueForDate(chartData.aggregate, dateKey, 'budget');
          return val !== null ? val : null;
        }),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 101
      });

      datasets.push({
        label: 'Aggregate: Physical Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          const val = getValueForDate(chartData.aggregate, dateKey, 'physical');
          return val !== null ? val : null;
        }),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 102
      });

      datasets.push({
        label: 'Aggregate: Overall Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          const val = getValueForDate(chartData.aggregate, dateKey, 'overall');
          return val !== null ? val : null;
        }),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 4,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        order: 103
      });

      // Individual project datasets (lighter, thinner lines)
      const projectColors = [
        '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#EC4899', '#6366F1',
        '#F97316', '#14B8A6', '#A855F7', '#EAB308'
      ];

      chartData.projects.forEach((project, idx) => {
        const color = projectColors[idx % projectColors.length];
        const opacity = 0.6;
        const lightColor = color + '80'; // Add transparency
        
        // Overall progress line for each project
        datasets.push({
          label: `${project.projectName} - Overall`,
          data: sortedDates.map(d => {
            const dateKey = d.toISOString().split('T')[0];
            const val = getValueForDate(project.data, dateKey, 'overall');
            return val !== null ? val : null;
          }),
          borderColor: color,
          backgroundColor: lightColor,
          borderWidth: 1.5,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          borderDash: [5, 5],
          order: idx // Render before aggregate
        });
      });

      const config = {
        type: 'line',
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  weight: '600'
                },
                color: '#374151'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#111827',
              bodyColor: '#374151',
              borderColor: '#E5E7EB',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
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
                color: '#6B7280',
                font: {
                  size: 11
                }
              },
              grid: {
                color: 'rgba(229, 231, 235, 0.5)',
                drawBorder: false
              }
            },
            x: {
              ticks: {
                color: '#6B7280',
                font: {
                  size: 11
                }
              },
              grid: {
                display: false
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      };

      // Mini chart (only show aggregate lines)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        chartInstanceRef.current = new Chart(ctx, {
          ...config,
          options: {
            ...config.options,
            plugins: {
              ...config.options.plugins,
              legend: {
                display: true,
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 12,
                  font: {
                    size: 10,
                    weight: '500'
                  },
                  color: '#374151',
                  filter: function(item) {
                    // Only show aggregate lines in mini view
                    return item.text.startsWith('Aggregate:');
                  }
                }
              }
            }
          }
        });
      }

      // Modal chart initialization will happen in a separate effect when modal opens
    }

    initChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }
    };
  }, [chartData, isLoading]);

  // Initialize modal chart when modal opens (uses same logic as main chart)
  useEffect(() => {
    if (!isModalOpen || !chartData || !chartData.aggregate || chartData.aggregate.length === 0 || isLoading) return;

    async function initModalChart() {
      const Chart = (await import('chart.js/auto')).default;
      
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }

      // Collect all unique dates from aggregate and all projects
      const allDates = new Set();
      chartData.aggregate.forEach(d => {
        allDates.add(d.date.toISOString().split('T')[0]);
      });
      chartData.projects.forEach(proj => {
        proj.data.forEach(d => {
          allDates.add(d.date.toISOString().split('T')[0]);
        });
      });

      // Create sorted date array
      const sortedDates = Array.from(allDates)
        .map(d => new Date(d))
        .sort((a, b) => a - b);

      const labels = sortedDates.map(d => {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // Helper function to find value for a date, using last known value for missing dates
      const getValueForDate = (dataArray, dateKey, field) => {
        // First, try to find exact date match
        const exactPoint = dataArray.find(d => d.date.toISOString().split('T')[0] === dateKey);
        if (exactPoint) return exactPoint[field];
        
        // If no exact match, find the last known value before this date
        const targetDate = new Date(dateKey);
        let lastKnownValue = null;
        
        // Sort data array by date to ensure we check in order
        const sortedData = [...dataArray].sort((a, b) => a.date - b.date);
        
        for (const point of sortedData) {
          const pointDate = new Date(point.date);
          if (pointDate <= targetDate) {
            lastKnownValue = point[field];
          } else {
            break; // We've passed the target date
          }
        }
        
        return lastKnownValue !== null ? lastKnownValue : null;
      };

      // Build datasets (same as main chart)
      const datasets = [];

      // Aggregate datasets
      datasets.push({
        label: 'Aggregate: Timeline Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          return getValueForDate(chartData.aggregate, dateKey, 'timeline');
        }),
        borderColor: '#0EA5E9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 100
      });

      datasets.push({
        label: 'Aggregate: Budget Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          return getValueForDate(chartData.aggregate, dateKey, 'budget');
        }),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 101
      });

      datasets.push({
        label: 'Aggregate: Physical Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          return getValueForDate(chartData.aggregate, dateKey, 'physical');
        }),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 102
      });

      datasets.push({
        label: 'Aggregate: Overall Progress',
        data: sortedDates.map(d => {
          const dateKey = d.toISOString().split('T')[0];
          return getValueForDate(chartData.aggregate, dateKey, 'overall');
        }),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 4,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        order: 103
      });

      // Individual project datasets
      const projectColors = [
        '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#EC4899', '#6366F1',
        '#F97316', '#14B8A6', '#A855F7', '#EAB308'
      ];

      chartData.projects.forEach((project, idx) => {
        const color = projectColors[idx % projectColors.length];
        datasets.push({
          label: `${project.projectName} - Overall`,
          data: sortedDates.map(d => {
            const dateKey = d.toISOString().split('T')[0];
            return getValueForDate(project.data, dateKey, 'overall');
          }),
          borderColor: color,
          backgroundColor: color + '80',
          borderWidth: 1.5,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          borderDash: [5, 5],
          order: idx
        });
      });

      const config = {
        type: 'line',
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  weight: '600'
                },
                color: '#374151'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#111827',
              bodyColor: '#374151',
              borderColor: '#E5E7EB',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
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
                color: '#6B7280',
                font: {
                  size: 11
                }
              },
              grid: {
                color: 'rgba(229, 231, 235, 0.5)',
                drawBorder: false
              }
            },
            x: {
              ticks: {
                color: '#6B7280',
                font: {
                  size: 11
                }
              },
              grid: {
                display: false
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      };

      if (modalCanvasRef.current) {
        const modalCtx = modalCanvasRef.current.getContext('2d');
        modalChartInstanceRef.current = new Chart(modalCtx, config);
      }
    }

    // Small delay to ensure modal is rendered
    const timer = setTimeout(() => {
      initModalChart();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
        modalChartInstanceRef.current = null;
      }
    };
  }, [isModalOpen, chartData, isLoading]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500 text-sm">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || !chartData.aggregate || chartData.aggregate.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="text-gray-500 text-sm mb-2">No progress data available</div>
            <div className="text-gray-400 text-xs">Progress data will appear as projects are updated</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mini Preview Graph - Clickable */}
      <div 
        className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Progress Overview</h3>
            <p className="text-xs text-gray-500">Click to view full graph</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold group-hover:text-blue-700">
            <span>View Full</span>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
        <div className="h-48">
          <canvas ref={canvasRef}></canvas>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-sky-500"></div>
            <span className="text-gray-600">Timeline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span className="text-gray-600">Budget</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
            <span className="text-gray-600">Physical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-500"></div>
            <span className="text-gray-600">Overall</span>
          </div>
        </div>
      </div>

      {/* Full View Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 progress-graph-modal"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Progress Analytics</h2>
                <p className="text-sm text-gray-600 mt-1">{barangayName} - Project Progress Over Time</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-md"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="h-96 mb-6">
                <canvas ref={modalCanvasRef}></canvas>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {chartData.aggregate && chartData.aggregate.length > 0 && (() => {
                  const latest = chartData.aggregate[chartData.aggregate.length - 1];
                  const previous = chartData.aggregate.length > 1 ? chartData.aggregate[chartData.aggregate.length - 2] : chartData.aggregate[0];
                  
                  const stats = [
                    {
                      label: 'Timeline Progress',
                      value: latest.timeline.toFixed(1) + '%',
                      change: (latest.timeline - previous.timeline).toFixed(1),
                      color: 'sky'
                    },
                    {
                      label: 'Budget Progress',
                      value: latest.budget.toFixed(1) + '%',
                      change: (latest.budget - previous.budget).toFixed(1),
                      color: 'blue'
                    },
                    {
                      label: 'Physical Progress',
                      value: latest.physical.toFixed(1) + '%',
                      change: (latest.physical - previous.physical).toFixed(1),
                      color: 'emerald'
                    },
                    {
                      label: 'Overall Progress',
                      value: latest.overall.toFixed(1) + '%',
                      change: (latest.overall - previous.overall).toFixed(1),
                      color: 'violet'
                    }
                  ];

                  return stats.map((stat, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">{stat.label}</div>
                      <div className={`text-2xl font-bold text-${stat.color}-600 mb-1`}>{stat.value}</div>
                      <div className={`text-xs ${parseFloat(stat.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(stat.change) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(stat.change)).toFixed(1)}% change
                      </div>
                    </div>
                  ));
                })()}
              </div>
              
              {/* Project List */}
              {chartData.projects && chartData.projects.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Projects Tracked ({chartData.projects.length})</h4>
                  <div className="space-y-2">
                    {chartData.projects.map((project, idx) => {
                      const projectColors = [
                        '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#EC4899', '#6366F1',
                        '#F97316', '#14B8A6', '#A855F7', '#EAB308'
                      ];
                      const color = projectColors[idx % projectColors.length];
                      const latest = project.data[project.data.length - 1];
                      return (
                        <div key={project.projectId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                            <span className="text-sm font-medium text-gray-700">{project.projectName}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-600">
                            {latest ? latest.overall.toFixed(1) + '%' : '0.0%'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

