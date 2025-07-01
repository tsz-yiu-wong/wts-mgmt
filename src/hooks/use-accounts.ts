import { useState, useEffect } from 'react'
import { Account } from '@/types'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/accounts')
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data || [])
      } else {
        console.error('获取账号列表失败:', data.error)
        setAccounts([])
      }
    } catch (error) {
      console.error('网络错误:', error)
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // 从本地状态中移除账号
        setAccounts(prev => prev.filter(account => account.id !== accountId))
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除账号失败:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  return {
    accounts,
    isLoading,
    deleteAccount,
    refetch: fetchAccounts
  }
} 