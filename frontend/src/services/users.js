import api from './api';

const userService = {
  // Get all users (System Admin only)
  getAllUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch users' };
    }
  },

  // Get users by role
  getUsersByRole: async (role) => {
    try {
      const response = await api.get(`/users/role/${role}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch users by role' };
    }
  },

  // Create new user account
  createUser: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create user' };
    }
  },

  // Update user status (approve/block/deactivate)
  updateUserStatus: async (userId, status) => {
    try {
      const response = await api.patch(`/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update user status' };
    }
  },

  // Assign role to user
  assignRole: async (userId, role, subRole) => {
    try {
      const response = await api.patch(`/users/${userId}/role`, { role, subRole });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to assign role' };
    }
  },

  // Delete user account
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete user' };
    }
  },

  // Get activity logs
  getActivityLogs: async () => {
    try {
      const response = await api.get('/users/logs');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch activity logs' };
    }
  },

  // Get user statistics
  getUserStats: async () => {
    try {
      const users = await userService.getAllUsers();
      const stats = {
        total: users.users?.length || 0,
        byRole: {},
        byStatus: {}
      };

      if (users.users) {
        // Count by role
        users.users.forEach(user => {
          stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
          stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
        });
      }

      return { success: true, stats };
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get user statistics' };
    }
  },

  // Get available roles
  getAvailableRoles: () => {
    return [
      { value: 'LGU-PMT', label: 'LGU-PMT (Monitoring Team)', subRoles: ['Chair', 'Vice Chair', 'Secretariat'] },
      { value: 'EIU', label: 'EIU (External Implementing Units)', subRoles: ['EPIU Manager', 'EPIU Staff'] },
      { value: 'LGU-IU', label: 'LGU-IU (Internal Units)', subRoles: ['MDC Chair', 'Oversight Officer', 'Implementing Staff'] },
      { value: 'EMS', label: 'EMS (External Monitoring)', subRoles: ['NGO Representative', 'CSO Member', 'PPMC Representative'] },
      { value: 'SYS.AD', label: 'SYS.AD (System Admin)', subRoles: ['System Administrator', 'Executive'] }
    ];
  },

  // Validate user data
  validateUserData: (userData) => {
    const errors = [];

    if (!userData.name?.trim()) {
      errors.push('Name is required');
    }

    if (!userData.username?.trim()) {
      errors.push('Username is required');
    }

    if (!userData.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Invalid email format');
    }

    if (!userData.role) {
      errors.push('Role is required');
    }

    if (!userData.subRole) {
      errors.push('Sub-role is required');
    }

    if (!userData.password?.trim()) {
      errors.push('Password is required');
    } else if (userData.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    return errors;
  }
};

export default userService; 