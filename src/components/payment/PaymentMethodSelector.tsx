'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, QrCode } from 'lucide-react'

interface PaymentMethodSelectorProps {
  onSelect: (method: 'card' | 'alipay') => void
  selectedMethod: 'card' | 'alipay'
}

export function PaymentMethodSelector({ onSelect, selectedMethod }: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onSelect('card')}
        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
          selectedMethod === 'card'
            ? 'border-violet-600 bg-violet-50'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <CreditCard className="w-8 h-8 text-stone-600" />
        <span className="text-sm font-medium">信用卡/借记卡</span>
        <span className="text-xs text-stone-400">Visa / Mastercard / Amex</span>
      </button>

      <button
        disabled
        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all opacity-50 cursor-not-allowed border-stone-200`}
      >
        <QrCode className="w-8 h-8 text-stone-400" />
        <span className="text-sm font-medium text-stone-400">支付宝</span>
        <span className="text-xs text-stone-400">即将开通</span>
      </button>
    </div>
  )
}