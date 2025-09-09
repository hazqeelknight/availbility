```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryClient';

// This is a mock implementation. In a real scenario, this would fetch data from your backend.
// For example:
// import { api } from '@/api/client';
// const fetchEventTypes = async () => {
//   const response = await api.get('/events/event-types/');
//   return response.data.results; // Assuming paginated response
// };

export const useEventTypes = () => {
  return useQuery({
    queryKey: queryKeys.events.eventTypes(),
    queryFn: async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demonstration
      return [
        { id: 'mock-event-type-1', name: '30 Min Meeting (Mock)' },
        { id: 'mock-event-type-2', name: 'Consultation (Mock)' },
        { id: 'mock-event-type-3', name: 'Demo Call (Mock)' },
        { id: 'mock-event-type-4', name: 'Discovery Call (Mock)' },
        { id: 'mock-event-type-5', name: 'Follow-up (Mock)' },
      ];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```