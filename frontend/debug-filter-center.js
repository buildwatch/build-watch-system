/**
 * ProjectFilterCenter Debugging Script
 * 
 * Copy and paste this entire script into your browser console to debug filter issues.
 * This will help identify what's wrong with the filter functionality.
 */

(function() {
  console.log('%c🔍 ProjectFilterCenter Debugging Script', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('='.repeat(60));
  
  const debug = {
    // Check if ProjectFilterCenter is initialized
    checkFilterCenter: function() {
      console.log('\n📋 Checking ProjectFilterCenter initialization...');
      if (window.projectFilterCenter) {
        console.log('✅ window.projectFilterCenter exists');
        console.log('Methods available:', Object.keys(window.projectFilterCenter));
        
        try {
          const filters = window.projectFilterCenter.getFilters();
          console.log('Current filters:', filters);
        } catch (e) {
          console.error('❌ Error getting filters:', e);
        }
      } else {
        console.error('❌ window.projectFilterCenter is NOT defined!');
        console.log('This means the ProjectFilterCenter component has not loaded yet.');
        return false;
      }
      return true;
    },
    
    // Check if applyProjectFiltersFromCenter function exists
    checkFilterFunction: function() {
      console.log('\n📋 Checking applyProjectFiltersFromCenter function...');
      if (window.applyProjectFiltersFromCenter) {
        console.log('✅ window.applyProjectFiltersFromCenter exists');
        console.log('Function type:', typeof window.applyProjectFiltersFromCenter);
      } else {
        console.error('❌ window.applyProjectFiltersFromCenter is NOT defined!');
        console.log('This function should be defined in each module to handle filter changes.');
        return false;
      }
      return true;
    },
    
    // Check data sources
    checkDataSources: function() {
      console.log('\n📋 Checking data sources...');
      const sources = [
        'window.allProjects',
        'window.assignedProjects',
        'window.allSubmissions',
        'window.approvedProjects'
      ];
      
      const found = [];
      sources.forEach(source => {
        try {
          const data = eval(source);
          if (data && Array.isArray(data)) {
            console.log(`✅ ${source}: ${data.length} items`);
            found.push({ source, count: data.length, sample: data[0] });
          } else if (data) {
            console.log(`⚠️ ${source}: exists but is not an array (type: ${typeof data})`);
          } else {
            console.log(`❌ ${source}: undefined or null`);
          }
        } catch (e) {
          console.log(`❌ ${source}: error accessing - ${e.message}`);
        }
      });
      
      if (found.length === 0) {
        console.error('❌ No data sources found! This is likely the problem.');
        console.log('The filter component needs data to filter. Check if projects are loaded.');
      }
      
      return found;
    },
    
    // Check display update functions
    checkDisplayFunctions: function() {
      console.log('\n📋 Checking display update functions...');
      const functions = [
        'window.updateProjectDisplay',
        'window.updateSubmissionsDisplay',
        'window.updateApprovedProjectsDisplay'
      ];
      
      const found = [];
      functions.forEach(funcName => {
        if (window[funcName]) {
          console.log(`✅ ${funcName}: exists`);
          found.push(funcName);
        } else {
          console.log(`❌ ${funcName}: NOT defined`);
        }
      });
      
      return found;
    },
    
    // Test filter application
    testFilter: function() {
      console.log('\n🧪 Testing filter application...');
      
      if (!window.projectFilterCenter) {
        console.error('❌ Cannot test: window.projectFilterCenter not available');
        return false;
      }
      
      try {
        const currentFilters = window.projectFilterCenter.getFilters();
        console.log('Current filters before test:', currentFilters);
        
        // Test setting a filter
        const testFilters = {
          ...currentFilters,
          search: 'test',
          status: 'ongoing'
        };
        
        console.log('Setting test filters:', testFilters);
        
        if (window.projectFilterCenter.setFilters) {
          window.projectFilterCenter.setFilters(testFilters);
          console.log('✅ setFilters called');
        } else {
          console.error('❌ setFilters method not available');
        }
        
        // Check if callback was triggered
        console.log('Check console for filter change callbacks...');
        
      } catch (e) {
        console.error('❌ Error testing filter:', e);
        return false;
      }
      
      return true;
    },
    
    // Check React component props
    checkComponentProps: function() {
      console.log('\n📋 Checking React component integration...');
      
      // Try to find the React component in the DOM
      const filterSection = document.querySelector('[class*="Search & Filter"]') || 
                           document.querySelector('h3:contains("Search & Filter")') ||
                           document.querySelector('input[placeholder*="Search by project name"]')?.closest('.bg-white');
      
      if (filterSection) {
        console.log('✅ Filter section found in DOM');
        console.log('Element:', filterSection);
      } else {
        console.warn('⚠️ Could not find filter section in DOM');
      }
      
      // Check for React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools detected');
      } else {
        console.log('ℹ️ React DevTools not detected (install extension for better debugging)');
      }
    },
    
    // Run all checks
    runAll: function() {
      console.log('\n🚀 Running all diagnostic checks...\n');
      
      const results = {
        filterCenter: this.checkFilterCenter(),
        filterFunction: this.checkFilterFunction(),
        dataSources: this.checkDataSources(),
        displayFunctions: this.checkDisplayFunctions(),
        componentProps: this.checkComponentProps()
      };
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 SUMMARY:');
      console.log('='.repeat(60));
      console.log(`Filter Center: ${results.filterCenter ? '✅' : '❌'}`);
      console.log(`Filter Function: ${results.filterFunction ? '✅' : '❌'}`);
      console.log(`Data Sources: ${results.dataSources.length > 0 ? '✅' : '❌'} (${results.dataSources.length} found)`);
      console.log(`Display Functions: ${results.displayFunctions.length > 0 ? '✅' : '❌'} (${results.displayFunctions.length} found)`);
      
      if (!results.filterCenter) {
        console.log('\n💡 SOLUTION: Wait for the page to fully load, or check if ProjectFilterCenter component is imported correctly.');
      }
      
      if (!results.filterFunction) {
        console.log('\n💡 SOLUTION: The applyProjectFiltersFromCenter function is missing. Check the module script.');
      }
      
      if (results.dataSources.length === 0) {
        console.log('\n💡 SOLUTION: No data loaded. Check if projects are being fetched from the API.');
      }
      
      if (results.displayFunctions.length === 0) {
        console.log('\n💡 SOLUTION: Display update functions are missing. Check the module script.');
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('🔍 To test filters manually, run: debug.testFilter()');
      console.log('='.repeat(60));
      
      return results;
    }
  };
  
  // Make debug available globally
  window.debugFilterCenter = debug;
  
  // Auto-run diagnostics
  console.log('\n⏳ Waiting 1 second for page to initialize...\n');
  setTimeout(() => {
    debug.runAll();
  }, 1000);
  
  console.log('\n💡 Type "debugFilterCenter.runAll()" to run diagnostics again');
  console.log('💡 Type "debugFilterCenter.testFilter()" to test filter functionality');
  
})();

