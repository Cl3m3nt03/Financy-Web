import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Transaction } from '@/types'

async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch('/api/transactions')
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

async function updateTransaction({ id, data }: { id: string; data: Partial<Transaction> }): Promise<Transaction> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update transaction')
  return res.json()
}

async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete transaction')
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTransaction,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] })
      const prev = queryClient.getQueryData<Transaction[]>(['transactions'])
      queryClient.setQueryData<Transaction[]>(['transactions'], old =>
        old ? old.map(t => t.id === id ? { ...t, ...data } : t) : old
      )
      return { prev }
    },
    onError: (_e, _v, ctx: any) => queryClient.setQueryData(['transactions'], ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
