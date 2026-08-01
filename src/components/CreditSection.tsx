'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export default function CreditSection() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchCreditData();
  }, []);

  async function fetchCreditData() {
    try {
      // 获取余额和交易记录
      const { data: balanceData } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: userData } = await supabase
        .from('profiles')
        .select('credit_balance')
        .single();

      if (userData) {
        setBalance(userData.credit_balance ?? 0);
      }

      if (balanceData) {
        setTransactions(balanceData);
      }

      // 获取推荐码
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('code')
        .single();

      if (codeData) {
        setReferralCode(codeData.code);
        setReferralLink(`https://stellawei.org/?ref=${codeData.code}`);
      }
    } catch (error) {
      console.error('Error fetching credit data:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <Card className="bg-black/20 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-stellawei-purple" />
            My Credit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white mb-2">
            ${balance.toFixed(2)}
          </div>
          <p className="text-white/60 text-sm">
            Available for consultation booking
          </p>
        </CardContent>
      </Card>

      {/* Referral Section */}
      <Card className="bg-black/20 border-white/5">
        <CardHeader>
          <CardTitle className="text-white">Share StellaWei</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/60 text-sm">
            Share StellaWei with someone who needs clarity. When they complete their first consultation, you'll earn $5 credit.
          </p>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <Button
              onClick={copyLink}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/10"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card className="bg-black/20 border-white/5">
          <CardHeader>
            <CardTitle className="text-white text-lg">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {tx.amount > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <p className="text-white text-sm">{tx.description}</p>
                      <p className="text-white/40 text-xs">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
