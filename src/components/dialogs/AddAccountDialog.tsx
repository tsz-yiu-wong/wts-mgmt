"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccountStore } from '@/stores/account-store'
import { Loader2 } from 'lucide-react'

interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AddAccountDialog({ isOpen, onClose }: AddAccountDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [step, setStep] = useState<'input' | 'loading' | 'verification' | 'waiting' | 'completing' | 'regenerating'>('input')
  const [sessionId, setSessionId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false)
  
  const { addAccount } = useAccountStore()

  const handleStartLogin = async () => {
    if (!phoneNumber.trim()) {
      setError('请输入电话号码')
      return
    }

    // 验证电话号码格式
    const phoneRegex = /^\+\d{1,3}\s\d{8,15}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('电话号码格式不正确，例如：+86 13812345678')
      return
    }

    setError('')
    setStep('loading')

    try {
      const response = await fetch('/api/automation/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (data.success) {
        setSessionId(data.sessionId)
        setStep('verification')
        // 开始轮询获取验证码
        pollForVerificationCode(data.sessionId)
      } else {
        setError(data.error || '登录初始化失败')
        setStep('input')
      }
    } catch (error) {
      setError('网络错误，请重试')
      setStep('input')
    }
  }

  const pollForVerificationCode = async (sessionId: string) => {
    let attempts = 0
    const maxAttempts = 30 // 5分钟超时 (30 * 10秒)

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('获取验证码超时，请重试')
        setStep('input')
        return
      }

      try {
        const response = await fetch(`/api/automation/verification?sessionId=${sessionId}`)
        const data = await response.json()

        if (data.success && data.code) {
          setVerificationCode(data.code)
          setStep('waiting')
          // 不再自动开始完成流程，等待用户手动确认
        } else if (data.error && data.error.includes('过期')) {
          setError('会话已过期，请重试')
          setStep('input')
        } else {
          // 继续轮询
          attempts++
          setTimeout(poll, 10000) // 10秒后重试
        }
      } catch (error) {
        attempts++
        setTimeout(poll, 10000)
      }
    }

    poll()
  }

  const pollForLoginComplete = async (sessionId: string) => {
    let attempts = 0
    const maxAttempts = 30 // 5分钟超时

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('登录超时，请重试')
        setStep('input')
        return
      }

      try {
        const response = await fetch('/api/automation/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (data.success) {
          // 登录成功，添加账号到store
          addAccount(data.account)
          onClose()
          resetDialog()
        } else if (data.error && data.error.includes('未完成')) {
          // 继续等待
          attempts++
          setTimeout(poll, 5000) // 5秒后重试（减少频率）
        } else {
          setError(data.error || '登录失败')
          setStep('input')
        }
      } catch (error) {
        attempts++
        setTimeout(poll, 5000)
      }
    }

    // 立即执行一次，然后开始轮询
    poll()
  }

  const resetDialog = () => {
    setPhoneNumber('')
    setStep('input')
    setSessionId('')
    setVerificationCode('')
    setError('')
    setIsRegeneratingCode(false)
  }

  const handleClose = () => {
    resetDialog()
    onClose()
  }

  const handleContinueManually = () => {
    setStep('completing')
    pollForLoginComplete(sessionId)
  }

  const handleRegenerateCode = async () => {
    if (isRegeneratingCode) return // 防止重复点击
    
    setIsRegeneratingCode(true)
    setError('')
    setStep('regenerating')

    try {
      console.log('🔄 重新获取验证码...')
      
      const response = await fetch('/api/automation/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          action: 'regenerate'
        })
      })

      const data = await response.json()

      if (data.success && data.code) {
        setVerificationCode(data.code)
        setStep('waiting')
        console.log('✅ 验证码重新获取成功:', data.code)
      } else {
        setError(data.error || '重新获取验证码失败')
        setStep('waiting') // 回到等待状态，显示原验证码
      }
    } catch (error) {
      console.error('重新获取验证码网络错误:', error)
      setError('网络错误，请重试')
      setStep('waiting')
    } finally {
      setIsRegeneratingCode(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md glass border-white/30 bg-white/20 backdrop-blur-xl text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">添加 WhatsApp 账号</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'input' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white/90">电话号码</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="+86 13812345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="glass border-white/30 bg-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                />
                <p className="text-sm text-white/70">
                  请输入完整的电话号码，包含国家代码
                </p>
              </div>
              
              {error && (
                <div className="text-sm text-red-200 bg-red-500/30 p-3 rounded border border-red-400/30 backdrop-blur-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleStartLogin} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  开始登录
                </Button>
                <Button variant="outline" onClick={handleClose} className="border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                  取消
                </Button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
              <p className="text-white/90">正在初始化登录流程...</p>
            </div>
          )}

          {step === 'verification' && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
              <p className="text-white/90">正在获取验证码...</p>
              <p className="text-sm text-white/70 mt-2">
                请稍等，系统正在自动获取验证码
              </p>
            </div>
          )}

          {step === 'waiting' && verificationCode && (
            <div className="text-center py-6">
              <div className="glass border-white/30 bg-blue-500/30 p-6 rounded-lg mb-6 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-3 text-white">验证码</h3>
                <div className="text-4xl font-mono font-bold text-blue-100 tracking-widest mb-3">
                  {verificationCode}
                </div>
                <div className="text-sm text-blue-200">
                  请在您的手机上输入此验证码
                </div>
              </div>
              
              {error && (
                <div className="text-sm text-red-200 bg-red-500/30 p-3 rounded border border-red-400/30 backdrop-blur-sm mb-4">
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <p className="text-white/90 text-sm">
                  输入验证码后，点击下方按钮继续
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleContinueManually} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isRegeneratingCode}
                  >
                    我已输入验证码，继续登录
                  </Button>
                  <Button 
                    onClick={handleRegenerateCode} 
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                    disabled={isRegeneratingCode}
                  >
                    {isRegeneratingCode ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        重新获取中...
                      </>
                    ) : (
                      '重新获取验证码'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-white/60">
                  如果没有收到验证码，可以点击重新获取
                </p>
              </div>
            </div>
          )}

          {step === 'regenerating' && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
              <p className="text-white/90">正在重新获取验证码...</p>
              <p className="text-sm text-white/70 mt-2">
                请稍等，系统正在为您生成新的验证码
              </p>
            </div>
          )}

          {step === 'completing' && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
              <p className="text-white/90">正在完成登录...</p>
              <p className="text-sm text-white/70 mt-2">
                请稍等，正在创建账号
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 