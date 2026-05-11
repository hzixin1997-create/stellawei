'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Bell,
  Shield,
  Mail,
  CreditCard,
  Save,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
  };

  const ToggleRow = ({ label, desc, active }: { label: string; desc: string; active: boolean }) => (
    <div className="flex items-center justify-between py-4 border-b border-stone-100 last:border-0">
      <div>
        <p className="font-medium text-stone-900">{label}</p>
        <p className="text-sm text-stone-500">{desc}</p>
      </div>
      {active ? (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          {isZh ? '已启用' : 'Enabled'}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-stone-400">
          <XCircle className="w-3 h-3 mr-1" />
          {isZh ? '已禁用' : 'Disabled'}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          {isZh ? '系统设置' : 'System Settings'}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {isZh ? '管理网站全局配置' : 'Manage global site configuration'}
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-stellawei-purple" />
            <CardTitle className="text-lg">{isZh ? '通用设置' : 'General'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <ToggleRow
            label={isZh ? '网站状态' : 'Site Status'}
            desc={isZh ? '网站正常运行中' : 'Site is running normally'}
            active={true}
          />
          <ToggleRow
            label={isZh ? '新用户注册' : 'New User Registration'}
            desc={isZh ? '允许新用户自行注册账户' : 'Allow new users to register accounts'}
            active={true}
          />
          <ToggleRow
            label={isZh ? '师傅自主接单' : 'Master Auto-Accept'}
            desc={isZh ? '师傅自动接收新订单' : 'Allow masters to auto-accept new orders'}
            active={false}
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-stellawei-purple" />
            <CardTitle className="text-lg">{isZh ? '通知设置' : 'Notifications'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <ToggleRow
            label={isZh ? '新订单邮件通知' : 'New Order Email'}
            desc={isZh ? '有新订单时发送邮件给总裁和对应师傅' : 'Send emails to admin and master when new order arrives'}
            active={true}
          />
          <ToggleRow
            label={isZh ? '用户留言通知' : 'User Message Alert'}
            desc={isZh ? '用户提交留言后通知对应师傅' : 'Notify master when user submits a message'}
            active={true}
          />
          <ToggleRow
            label={isZh ? '每日汇总报告' : 'Daily Summary'}
            desc={isZh ? '每晚发送当日订单和收入汇总' : 'Send daily order and revenue summary every evening'}
            active={false}
          />
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-stellawei-purple" />
            <CardTitle className="text-lg">{isZh ? '收款设置' : 'Payment'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-stone-700">{isZh ? '平台抽成比例' : 'Platform Commission'}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  defaultValue={20}
                  className="w-20 px-3 py-2 border border-stone-200 rounded-md text-sm"
                  min={0}
                  max={100}
                />
                <span className="text-stone-500">%</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {isZh ? '师傅获得 80%，平台获得 20%' : 'Master gets 80%, platform keeps 20%'}
              </p>
            </div>

            <div>
              <Label className="text-stone-700">{isZh ? '最低提现金额' : 'Min Withdrawal'}</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-stone-500">$</span>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-24 px-3 py-2 border border-stone-200 rounded-md text-sm"
                  min={0}
                />
              </div>
            </div>
          </div>

          <ToggleRow
            label={isZh ? '自动提现' : 'Auto Payout'}
            desc={isZh ? '每周一自动提现到师傅银行账户' : 'Automatically transfer to master bank account every Monday'}
            active={true}
          />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-stellawei-purple" />
            <CardTitle className="text-lg">{isZh ? '安全设置' : 'Security'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-0">
          <ToggleRow
            label={isZh ? '两步验证 (2FA)' : 'Two-Factor Auth'}
            desc={isZh ? '为总裁后台登录添加额外保护' : 'Add extra protection for admin login'}
            active={false}
          />
          <ToggleRow
            label={isZh ? '登录会话超时' : 'Session Timeout'}
            desc={isZh ? '30分钟无操作自动退出' : 'Auto logout after 30 minutes of inactivity'}
            active={true}
          />
        </CardContent>
      </Card>

      {/* Email Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-stellawei-purple" />
            <CardTitle className="text-lg">{isZh ? '邮件服务' : 'Email Service'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg border border-stone-100 bg-stone-50/50">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-stone-900">Resend</p>
              <p className="text-sm text-stone-500">{isZh ? '邮件发送服务提供商' : 'Email delivery service provider'}</p>
            </div>
            <Badge className="bg-green-100 text-green-700">{isZh ? '已连接' : 'Connected'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white"
        >
          {saving ? (
            <>{isZh ? '保存中...' : 'Saving...'}</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isZh ? '保存设置' : 'Save Settings'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
