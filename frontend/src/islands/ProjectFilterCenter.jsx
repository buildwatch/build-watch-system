import { useState, useEffect, useRef } from 'react';

/**
 * ProjectFilterCenter - Centralized filtering component for project management modules
 * 
 * @param {Object} props
 * @param {string} props.theme - Theme color ('orange', 'green', 'blue', 'sky')
 * @param {string} props.moduleType - Module type ('lgu-iu', 'eiu', 'secretariat', 'mpmec')
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Object} props.initialFilters - Initial filter values
 * @param {boolean} props.persistState - Whether to persist filter state in localStorage
 */
export default function ProjectFilterCenter({
  theme = 'blue',
  moduleType = 'lgu-iu',
  onFilterChange,
  initialFilters = {},
  persistState = true
}) {
  // Get callback from window if not provided as prop (for Astro compatibility)
  const getFilterCallback = () => {
    if (onFilterChange) {
      return onFilterChange;
    }
    // Try to get from window object (set by Astro script)
    if (typeof window !== 'undefined' && window.projectFilterCallback) {
      return window.projectFilterCallback;
    }
    return null;
  };
  // Theme color mappings
  const themeColors = {
    orange: {
      primary: 'amber',
      ring: 'ring-amber-500',
      focus: 'focus:ring-amber-500',
      button: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    },
    green: {
      primary: 'emerald',
      ring: 'ring-emerald-500',
      focus: 'focus:ring-emerald-500',
      button: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
    },
    blue: {
      primary: 'blue',
      ring: 'ring-blue-500',
      focus: 'focus:ring-blue-500',
      button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    },
    sky: {
      primary: 'sky',
      ring: 'ring-sky-500',
      focus: 'focus:ring-sky-500',
      button: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700'
    }
  };

  const colors = themeColors[theme] || themeColors.blue;
  const storageKey = `projectFilters_${moduleType}`;

  // Filter state
  const [filters, setFilters] = useState(() => {
    if (persistState && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return { ...JSON.parse(saved), ...initialFilters };
        } catch (e) {
          console.error('Error loading saved filters:', e);
        }
      }
    }
    return {
      search: '',
      status: '',
      priority: '',
      category: '',
      department: '',
      office: '',
      sortBy: 'name',
      // Advanced filters
      dateRangeStart: '',
      dateRangeEnd: '',
      budgetMin: '',
      budgetMax: '',
      progressMin: '',
      progressMax: '',
      ...initialFilters
    };
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce ref for search
  const searchTimeoutRef = useRef(null);

  // Module-specific filter configurations
  const filterConfigs = {
    'lgu-iu': {
      showPriority: true,
      showCategory: false,
      showDepartment: false,
      showOffice: false,
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'delayed', label: 'Delayed' },
        { value: 'completed', label: 'Completed' }
      ],
      priorityOptions: [
        { value: '', label: 'All Priorities' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      sortOptions: [
        { value: 'name', label: 'Project Name' },
        { value: 'status', label: 'Status' },
        { value: 'progress', label: 'Progress' },
        { value: 'budget', label: 'Budget' },
        { value: 'date', label: 'Date Created' }
      ]
    },
    'eiu': {
      showPriority: true,
      showCategory: false,
      showDepartment: false,
      showOffice: false,
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'complete', label: 'Complete' }
      ],
      priorityOptions: [
        { value: '', label: 'All Priorities' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      sortOptions: [
        { value: 'name', label: 'Project Name' },
        { value: 'date', label: 'Start Date' },
        { value: 'progress', label: 'Progress' },
        { value: 'priority', label: 'Priority' }
      ]
    },
    'secretariat': {
      showPriority: false,
      showCategory: true,
      showDepartment: false,
      showOffice: true,
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'ongoing', label: 'Ongoing' }
      ],
      categoryOptions: [
        { value: '', label: 'All Categories' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'health', label: 'Health' },
        { value: 'education', label: 'Education' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'social', label: 'Social Services' },
        { value: 'environment', label: 'Environment' }
      ],
      officeOptions: [], // Will be populated dynamically
      sortOptions: [
        { value: 'name', label: 'Project Name' },
        { value: 'date', label: 'Submission Date' },
        { value: 'status', label: 'Status' },
        { value: 'department', label: 'Department' }
      ]
    },
    'mpmec': {
      showPriority: false,
      showCategory: true,
      showDepartment: true,
      showOffice: false,
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'pending', label: 'Pending' },
        { value: 'complete', label: 'Complete' }
      ],
      categoryOptions: [
        { value: '', label: 'All Categories' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'health', label: 'Health' },
        { value: 'education', label: 'Education' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'social', label: 'Social Services' },
        { value: 'environment', label: 'Environment' },
        { value: 'transportation', label: 'Transportation' }
      ],
      departmentOptions: [], // Will be populated dynamically
      sortOptions: [
        { value: 'name', label: 'Project Name' },
        { value: 'date', label: 'Approval Date' },
        { value: 'status', label: 'Status' },
        { value: 'department', label: 'Department' }
      ]
    }
  };

  const config = filterConfigs[moduleType] || filterConfigs['lgu-iu'];

  // Update filters and notify parent
  const updateFilter = (key, value) => {
    console.log(`[ProjectFilterCenter] 🔄 Updating filter: ${key} = ${value}`, { moduleType, filters });
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newFilters));
    }
    
    // Get the callback function
    const callback = getFilterCallback();
    
    // Debounce search input
    if (key === 'search') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        console.log(`[ProjectFilterCenter] 🔍 Search filter applied (debounced):`, newFilters);
        if (callback) {
          console.log(`[ProjectFilterCenter] ✅ Calling onFilterChange callback`);
          callback(newFilters);
        } else {
          console.warn(`[ProjectFilterCenter] ⚠️ onFilterChange callback is not defined!`);
        }
      }, 300);
    } else {
      // For other filters, trigger immediately
      console.log(`[ProjectFilterCenter] 🔍 Filter applied immediately:`, newFilters);
      if (callback) {
        console.log(`[ProjectFilterCenter] ✅ Calling onFilterChange callback`);
        callback(newFilters);
      } else {
        console.warn(`[ProjectFilterCenter] ⚠️ onFilterChange callback is not defined!`);
      }
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters = {
      search: '',
      status: '',
      priority: '',
      category: '',
      department: '',
      office: '',
      sortBy: config.sortOptions[0]?.value || 'name',
      dateRangeStart: '',
      dateRangeEnd: '',
      budgetMin: '',
      budgetMax: '',
      progressMin: '',
      progressMax: ''
    };
    setFilters(defaultFilters);
    
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(defaultFilters));
    }
    
    const callback = getFilterCallback();
    if (callback) {
      callback(defaultFilters);
    }
  };

  // Apply filters (explicit action)
  const applyFilters = () => {
    console.log(`[ProjectFilterCenter] 🎯 Apply Filters button clicked`, { moduleType, filters });
    const callback = getFilterCallback();
    if (callback) {
      console.log(`[ProjectFilterCenter] ✅ Calling onFilterChange callback with filters:`, filters);
      callback(filters);
    } else {
      console.warn(`[ProjectFilterCenter] ⚠️ onFilterChange callback is not defined!`);
    }
  };

  // Expose filters to parent via window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`[ProjectFilterCenter] 🔧 Initializing window.projectFilterCenter for module: ${moduleType}`);
      window.projectFilterCenter = {
        getFilters: () => {
          console.log(`[ProjectFilterCenter] 📋 getFilters called, returning:`, filters);
          return filters;
        },
        setFilters: (newFilters) => {
          console.log(`[ProjectFilterCenter] 🔄 setFilters called with:`, newFilters);
          setFilters(newFilters);
          if (persistState) {
            localStorage.setItem(storageKey, JSON.stringify(newFilters));
          }
          // Trigger filter change callback
          const callback = getFilterCallback();
          if (callback) {
            console.log(`[ProjectFilterCenter] ✅ Calling onFilterChange from setFilters`);
            callback(newFilters);
          } else {
            console.warn(`[ProjectFilterCenter] ⚠️ onFilterChange callback is not defined!`);
          }
        },
        clearFilters: () => {
          console.log(`[ProjectFilterCenter] 🧹 clearFilters called`);
          clearFilters();
        },
        applyFilters: () => {
          console.log(`[ProjectFilterCenter] 🎯 applyFilters called from window object`);
          applyFilters();
        }
      };
      console.log(`[ProjectFilterCenter] ✅ window.projectFilterCenter initialized:`, window.projectFilterCenter);
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined' && window.projectFilterCenter) {
        console.log(`[ProjectFilterCenter] 🧹 Cleaning up window.projectFilterCenter`);
        delete window.projectFilterCenter;
      }
    };
  }, [filters, storageKey, persistState, moduleType]);
  
  // Separate effect to update callback reference when window.projectFilterCallback changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.projectFilterCenter) {
      console.log(`[ProjectFilterCenter] 🔄 Checking for callback on window object`);
      const currentCenter = window.projectFilterCenter;
      window.projectFilterCenter = {
        ...currentCenter,
        setFilters: (newFilters) => {
          setFilters(newFilters);
          if (persistState) {
            localStorage.setItem(storageKey, JSON.stringify(newFilters));
          }
          const callback = getFilterCallback();
          if (callback) {
            console.log(`[ProjectFilterCenter] ✅ Calling updated onFilterChange callback`);
            callback(newFilters);
          } else {
            console.warn(`[ProjectFilterCenter] ⚠️ onFilterChange callback is not defined!`);
          }
        },
        clearFilters: () => {
          clearFilters();
        },
        applyFilters: () => {
          applyFilters();
        }
      };
    }
  }, []);
  
  // Poll for callback availability (in case it's set after component mounts)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const callback = getFilterCallback();
      if (callback && typeof window !== 'undefined' && window.projectFilterCenter) {
        console.log(`[ProjectFilterCenter] ✅ Callback now available`);
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Clear after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
    
    return () => clearInterval(checkInterval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-${colors.primary}-500 to-${colors.primary}-600 shadow-lg`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-black">Search & Filter Projects</h3>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Search Projects</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  placeholder="Search by project name..."
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
              >
                {config.statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter (if enabled) */}
            {config.showPriority && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => updateFilter('priority', e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
                >
                  {config.priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Filter (if enabled) */}
            {config.showCategory && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
                >
                  {config.categoryOptions?.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Department Filter (if enabled) */}
            {config.showDepartment && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => updateFilter('department', e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
                >
                  <option value="">All Departments</option>
                  {config.departmentOptions?.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Office Filter (if enabled) */}
            {config.showOffice && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Office</label>
                <select
                  value={filters.office}
                  onChange={(e) => updateFilter('office', e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
                >
                  <option value="">All Offices</option>
                  {config.officeOptions?.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort By */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white hover:shadow-md`}
              >
                {config.sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-amber-600 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
              {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range Start */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Start Date From</label>
                  <input
                    type="date"
                    value={filters.dateRangeStart}
                    onChange={(e) => updateFilter('dateRangeStart', e.target.value)}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>

                {/* Date Range End */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Start Date To</label>
                  <input
                    type="date"
                    value={filters.dateRangeEnd}
                    onChange={(e) => updateFilter('dateRangeEnd', e.target.value)}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>

                {/* Budget Min */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Budget Min (₱)</label>
                  <input
                    type="number"
                    value={filters.budgetMin}
                    onChange={(e) => updateFilter('budgetMin', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>

                {/* Budget Max */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Budget Max (₱)</label>
                  <input
                    type="number"
                    value={filters.budgetMax}
                    onChange={(e) => updateFilter('budgetMax', e.target.value)}
                    placeholder="999,999,999.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>

                {/* Progress Min */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Progress Min (%)</label>
                  <input
                    type="number"
                    value={filters.progressMin}
                    onChange={(e) => updateFilter('progressMin', e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>

                {/* Progress Max */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Progress Max (%)</label>
                  <input
                    type="number"
                    value={filters.progressMax}
                    onChange={(e) => updateFilter('progressMax', e.target.value)}
                    placeholder="100"
                    min="0"
                    max="100"
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm ${colors.focus} focus:border-transparent transition-all duration-200 bg-white`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={clearFilters}
              className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 hover:text-gray-800 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-gray-200 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Clear Filters
            </button>
            <button
              onClick={applyFilters}
              className={`${colors.button} text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl inline-flex items-center gap-2`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
  );
}

