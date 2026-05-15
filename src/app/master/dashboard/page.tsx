import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MASTER_WHITELIST } from "@/lib/master-auth";
import Link from "next/link";

export default async function MasterDashboardPage() {
  const supabase = await createClient();

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 检查是否是师傅
  const masterInfo = MASTER_WHITELIST.find((m) => m.email === user.email);

  if (!masterInfo) {
    redirect("/dashboard"); // 不是师傅去用户后台
  }

  // 获取师傅的实时咨询订单（从 bookings 表）
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*")
    .eq("master_id", masterInfo.slug)
    .order("created_at", { ascending: false })
    .limit(20);

  // 统计
  const totalOrders = bookings?.length || 0;
  const pendingOrders = bookings?.filter((b) => b.payment_status === "pending").length || 0;
  const paidOrders = bookings?.filter((b) => b.payment_status === "paid").length || 0;
  const totalEarnings = bookings
    ?.filter((b) => b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.total_amount || 0) * 0.7, 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Welcome, {masterInfo.name}</h1>
      <p className="text-muted-foreground mb-8">
        {masterInfo.specialties.join(" · ")} · {masterInfo.experience} experience
      </p>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paidOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earnings (70%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 订单列表 */}
      <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
      {bookings && bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{order.service_id}</p>
                    <p className="text-sm text-muted-foreground">
                      ${order.total_amount} · {order.scheduled_date} {order.scheduled_time}
                    </p>
                    {order.scheduled_date && (
                      <p className="text-sm text-muted-foreground">
                        User: {order.user_id?.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.payment_status === "paid"
                        ? "bg-green-100 text-green-800"
                        : order.payment_status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No bookings yet.</p>
      )}
    </div>
  );
}
