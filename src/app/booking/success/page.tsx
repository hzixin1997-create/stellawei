"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const [isZh, setIsZh] = useState(true);

  useEffect(() => {
    const lang = localStorage.getItem('language') || 'zh'
    setIsZh(lang === 'zh')
  }, []);

  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{isZh ? '支付成功！' : 'Payment Successful!'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {isZh 
              ? '您的预约已确认，我们已发送确认邮件给您。'
              : "Your consultation has been booked. We've sent a confirmation email to you."}
          </p>
          {bookingId && (
            <p className="text-sm text-muted-foreground">
              {isZh ? '订单号：' : 'Order ID: '}{" "}
              <code className="bg-muted px-1 py-0.5 rounded">{bookingId.slice(0, 8)}</code>
            </p>
          )}
          <div className="pt-4 space-y-2">
            <Link href="/user/dashboard">
              <Button className="w-full">{isZh ? '前往我的主页' : 'Go to My Dashboard'}</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                {isZh ? '返回首页' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto mt-20 text-center">
          <p>Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
