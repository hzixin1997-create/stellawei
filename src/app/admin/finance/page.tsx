'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'withdrawal' | 'refund';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

const mockTransactions: Transaction[] = [];

export default function FinancePage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [filter, setFilter] = useState<'all' | 'income' | 'withdrawal' | 'refund'>('all');

  const filteredTransactions = filter === 'all'
    ? mockTransactions
    : mockTransactions.filter(t => t.type === filter);

  const totalIncome = mockTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = mockTransactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalWithdrawals;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{isZh ? '已完成' : 'Completed'}</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{isZh ? '处理中' : 'Pending'}</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{isZh ? '失败' : 'Failed'}</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <ArrowDownRight className="w-4 h-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return isZh ? '收入' : 'Income';
      case 'withdrawal':
        return isZh ? '提现' : 'Withdrawal';
      case 'refund':
        return isZh ? '退款' : 'Refund';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {isZh ? '财务管理' : 'Financial Management'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {isZh ? '查看收入、提现和账户余额' : 'View income, withdrawals, and account balance'}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          {isZh ? '导出报表' : 'Export Report'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">{isZh ? '账户余额' : 'Account Balance'}</p>
                <p className="text-3xl font-bold text-stone-900 mt-1">${balance.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">{isZh ? '总收入' : 'Total Income'}</p>
                <p className="text-3xl font-bold text-green-600 mt-1">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">{isZh ? '总提现' : 'Total Withdrawn'}</p>
                <p className="text-3xl font-bold text-red-600 mt-1">${totalWithdrawals.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Account Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">Stripe {isZh ? '收款账户' : 'Account'}</h3>
              <p className="text-sm text-stone-500">
                {isZh ? '香港个人账户 • 每周一自动提现至汇丰银行' : 'Hong Kong Individual • Auto-payout every Monday to HSBC'}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              {isZh ? '正常收款' : 'Active'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isZh ? '交易记录' : 'Transactions'}</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border border-stone-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="all">{isZh ? '全部' : 'All'}</option>
                <option value="income">{isZh ? '收入' : 'Income'}</option>
                <option value="withdrawal">{isZh ? '提现' : 'Withdrawal'}</option>
                <option value="refund">{isZh ? '退款' : 'Refund'}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">{isZh ? '暂无交易记录' : 'No transactions yet'}</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                      {getTypeIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{transaction.description}</p>
                      <p className="text-sm text-stone-500">{transaction.date} • {getTypeLabel(transaction.type)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                    <div className="mt-1">{getStatusBadge(transaction.status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
