'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreditApplicatorProps {
  userId: string;
  originalAmount: number;
  onCreditApplied: (amount: number) => void;
}

export default function CreditApplicator({
  userId,
  originalAmount,
  onCreditApplied,
}: CreditApplicatorProps) {
  const [balance, setBalance] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const applicableAmount = Math.min(balance, originalAmount);
  const finalAmount = useCredit ? originalAmount - applicableAmount : originalAmount;

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  async function fetchBalance() {
    try {
      const { data } = await supabase
        .from('users')
        .select('credit_balance')
        .eq('id', userId)
        .single();

      if (data) {
        setBalance(data.credit_balance ?? 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onCreditApplied(useCredit ? applicableAmount : 0);
  }, [useCredit, applicableAmount, onCreditApplied]);

  if (loading || balance <= 0) {
    return null;
  }

  return (
    <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="use-credit"
            checked={useCredit}
            onChange={(e) => setUseCredit(e.target.checked)}
            className="w-4 h-4 rounded border-stellawei-purple/30 text-stellawei-purple focus:ring-stellawei-purple"
          />
          <label htmlFor="use-credit" className="text-white text-sm cursor-pointer">
            Use Credit Balance
          </label>
        </div>
        <span className="text-stellawei-purple font-medium">
          ${balance.toFixed(2)} available
        </span>
      </div>

      {useCredit && (
        <div className="mt-3 pt-3 border-t border-stellawei-purple/10 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Original price</span>
            <span className="text-white/60">${originalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-400">Credit applied</span>
            <span className="text-green-400">-${applicableAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-white">Final amount</span>
            <span className="text-white">${finalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
