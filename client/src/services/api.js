const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api = {
  /**
   * Generic fetch wrapper with automatic JWT authorization and refresh retry
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = localStorage.getItem('carepulse_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // If unauthorized and not an auth route, attempt token refresh
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshToken = localStorage.getItem('carepulse_refresh');
        
        if (refreshToken && !isRefreshing) {
          isRefreshing = true;

          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            const refreshData = await refreshRes.json();

            if (refreshRes.ok && refreshData.success) {
              const newToken = refreshData.data.accessToken;
              const newRefresh = refreshData.data.refreshToken;

              localStorage.setItem('carepulse_token', newToken);
              localStorage.setItem('carepulse_refresh', newRefresh);

              processQueue(null, newToken);
              isRefreshing = false;

              // Retry original request with new token
              config.headers['Authorization'] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, config);
              return await retryRes.json();
            } else {
              // Refresh failed, clear session
              localStorage.removeItem('carepulse_token');
              localStorage.removeItem('carepulse_refresh');
              localStorage.removeItem('carepulse_user');
              window.dispatchEvent(new Event('auth:logout'));
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            isRefreshing = false;
          }
        }
      }

      if (!response.ok) {
        throw data.error || { message: data.message || 'Request failed' };
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};
