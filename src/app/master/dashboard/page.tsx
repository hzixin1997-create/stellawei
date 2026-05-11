import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MASTER_WHITELIST } from "@/lib/master-auth";

export default async function MasterDashboardPage() {
  const supabase = createClient();

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

  // 获取师傅的订单
  const { data: consultations } = await supabase
    .from("consultations")
    .select("*, profiles(full_name, email)")
    .eq("master_id", masterInfo.slug)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Welcome, {masterInfo.name}</h1>
      <p className="text-muted-foreground mb-8">
        {masterInfo.specialties.join(" · ")} · {masterInfo.experience} experience
      </p>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{consultations?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Earnings (70%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              $
              {(
                (consultations?.reduce(
                  (sum, c) =>
                    sum +
                    (c.status === "paid" || c.status === "completed"
                      ? c.master_fee_usd
                      : 0),
                  0
                ) || 0) / 100
              ).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {consultations?.filter((c) => c.status === "pending").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 订单列表 */}
      <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
      {consultations && consultations.length > 0 ? (
        <div className="space-y-3">
          {consultations.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {order.profiles.full_name || order.profiles.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.service_type} · $
                      {(order.price_usd / 100).toFixed(2)}
                    </p>
                    {order.scheduled_at && (
                      <p className="text-sm text-muted-foreground">
                        Scheduled: {new Date(order.scheduled_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : order.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No orders yet.</p>
      )}
    </div>
  );
}
