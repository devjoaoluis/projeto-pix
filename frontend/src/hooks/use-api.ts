import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/services/api';
export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: api.users });
export const useAccounts = () =>
  useQuery({ queryKey: ['accounts'], queryFn: api.accounts });
// Consultas sob demanda não alteram dados nem invalidam as outras telas.
export function useLookup<T>(fn: (input: T) => Promise<unknown>) {
  return useMutation({
    mutationFn: fn,
    retry: false,
    onError: (error: Error) => toast.error(error.message, { duration: 8000 }),
  });
}
export function useAction<T, TResult>(
  fn: (input: T) => Promise<TResult>,
  onSuccess?: (result: TResult) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result) => {
      onSuccess?.(result);
      await client.invalidateQueries();
      toast.success('Operação realizada com sucesso.');
    },
    onError: (error: Error) => toast.error(error.message, { duration: 8000 }),
  });
}
