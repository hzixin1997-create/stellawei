'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Star, CheckCircle, XCircle, Loader2, Home } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  content: string;
  status: string;
  created_at: string;
  master_id: string;
  booking_id: string;
  featured?: boolean;
  user: { full_name: string; email: string; location?: string; timezone?: string }[];
  master: { display_name: string }[];
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadReviews();
  }, [activeTab]);

  async function loadReviews() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/admin/reviews?status=${activeTab}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReview(reviewId: string, status: 'approved' | 'rejected') {
    setProcessingId(reviewId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ reviewId, status }),
      });
      
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (err) {
      console.error('Review action error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleFeature(reviewId: string, featured: boolean) {
    setProcessingId(reviewId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ reviewId, featured }),
      });
      
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, featured } : r));
      }
    } catch (err) {
      console.error('Feature action error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  // 获取用户地区显示
  function getUserLocation(review: Review): string {
    const user = review.user?.[0];
    if (!user) return '海外';
    
    // 优先使用location字段
    if (user.location) return user.location;
    
    // 根据timezone推断地区
    if (user.timezone) {
      const timezoneMap: Record<string, string> = {
        'America/New_York': '美国',
        'America/Los_Angeles': '美国',
        'America/Chicago': '美国',
        'America/Toronto': '加拿大',
        'Europe/London': '英国',
        'Europe/Paris': '法国',
        'Asia/Shanghai': '中国',
        'Asia/Tokyo': '日本',
        'Asia/Singapore': '新加坡',
        'Australia/Sydney': '澳大利亚',
      };
      return timezoneMap[user.timezone] || user.timezone.split('/')[1] || '海外';
    }
    
    return '海外';
  }

  const tabLabels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">评价管理</h1>
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无{tabLabels[activeTab]}的评价
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="bg-violet-50 text-violet-700">
                        {review.master?.[0]?.display_name || review.master_id}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {review.user?.[0]?.full_name || '匿名用户'}
                      </span>
                      {review.featured && (
                        <Badge className="bg-green-100 text-green-700">
                          <Home className="w-3 h-3 mr-1" />
                          首页展示
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      订单: {review.booking_id} · 地区: {getUserLocation(review)}
                    </p>
                    <p className="text-stone-700">{review.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {activeTab === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handleReview(review.id, 'approved')}
                          disabled={processingId === review.id}
                        >
                          {processingId === review.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleReview(review.id, 'rejected')}
                          disabled={processingId === review.id}
                        >
                          {processingId === review.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          拒绝
                        </Button>
                      </>
                    )}
                    {activeTab === 'approved' && (
                      <Button
                        size="sm"
                        variant={review.featured ? 'default' : 'outline'}
                        className={review.featured 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'text-violet-600 border-violet-200 hover:bg-violet-50'
                        }
                        onClick={() => handleFeature(review.id, !review.featured)}
                        disabled={processingId === review.id}
                      >
                        {processingId === review.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Home className="w-4 h-4 mr-1" />
                        )}
                        {review.featured ? '取消展示' : '展示到首页'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
