import * as React from 'react';
import { useState, useCallback } from 'react';
import type { ApiResponse } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      if (response.success) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        return response;
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error || 'Unknown error',
        });
        return response;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  return React.useMemo(() => ({
    ...state,
    execute,
  }), [state, execute]);
} 