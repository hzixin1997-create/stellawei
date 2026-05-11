"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clock, Calendar, DollarSign, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  userName: string;
  userEmail: string;
  serviceType: string;
  status: "pending" | "paid" | "confirmed" | "in_progress" | "completed";
  price: number;
  scheduledAt: string;
  supplement: string;
  supplementSubmittedAt: string;
  isRead: boolean;
}

// 演示数据
const DEMO_ORDERS: OrderDetail[] = [
  {
    id: "ord_8f3a2b1c",
    orderNumber: "SW-2024-001",
    userName: "Sarah Chen",
    userEmail: "sarah@example.com",
    serviceType: "Tarot - Basic Consultation",
    status: "paid",
    price: 28,
    scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    supplement: "I'm currently facing a major career decision. I've been working in software engineering for 5 years but recently got an offer to join a startup as a co-founder. The startup is in the education technology space which I'm passionate about, but it means leaving a stable six-figure job. My question is: should I take this leap of faith, or should I stay in my current role which is safe but increasingly unfulfilling? I've been feeling restless for about 6 months now.",
    supplementSubmittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: "ord_7e1d9f4a",
    orderNumber: "SW-2024-002",
    userName: "Michael Wang",
    userEmail: "michael@example.com",
    serviceType: "Bazi - Deep Analysis",
    status: "confirmed",
    price: 68,
    scheduledAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    supplement: "I've been having relationship difficulties with my partner of 3 years. We seem to argue about the same topics repeatedly - mainly about future plans and where to live. I was born in 1992, Monkey year, and my partner is 1990, Horse year. I'd like to understand if our birth charts show compatibility issues or if this is just a phase we need to work through. I'm particularly interested in knowing if marriage is in our future.",
    supplementSubmittedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isRead: true,
  },
];

function StatusBadge({ status }: { status: OrderDetail["status"] }) {
  const config = {
    pending: { color: "bg-yellow-900/30 text-yellow-400 border-yellow-800", label: "Pending" },
    paid: { color: "bg-blue-900/30 text-blue-400 border-blue-800", label: "Paid" },
    confirmed: { color: "bg-purple-900/30 text-purple-400 border-purple-800", label: "Confirmed" },
    in_progress: { color: "bg-green-900/30 text-green-400 border-green-800", label: "In Progress" },
    completed: { color: "bg-slate-800 text-slate-400 border-slate-700", label: "Completed" },
  };

  const { color, label } = config[status];

  return (
    <Badge variant="outline" className={`${color}`}>
      {label}
    </Badge>
  );
}

export default function MasterOrderDetailPage() {
  const [orders] = useState<OrderDetail[]>(DEMO_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-slate-950 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => setSelectedOrder(null)}
            className="text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>

          {/* Order Header */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-100">
                    Order #{selectedOrder.orderNumber}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">{selectedOrder.userEmail}</p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Client</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-amber-900 text-amber-200 text-xs">
                        {selectedOrder.userName.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-100">{selectedOrder.userName}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Scheduled</p>
                  <p className="text-sm text-slate-100 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    {new Date(selectedOrder.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Your Earnings (70%)</p>
                  <p className="text-sm font-bold text-amber-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {(selectedOrder.price * 0.7).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplement Section */}
          <Card className={`bg-slate-900 border-slate-800 ${!selectedOrder.isRead ? "ring-1 ring-amber-500/30" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                Client Background Information
                {!selectedOrder.isRead && (
                  <Badge className="bg-amber-900 text-amber-400 ml-2">New</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedOrder.supplement}
                </p>
              </div>

              <div className="flex justify-between items-center text-sm text-slate-500">
                <span>Submitted {new Date(selectedOrder.supplementSubmittedAt).toLocaleString()}</span>
                <span>{selectedOrder.supplement.length} characters</span>
              </div>

              <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-400">
                  💡 This information is confidential and for your preparation only. 
                  Please review before the consultation begins.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white flex-1">
                  <Clock className="w-4 h-4 mr-2" />
                  Start Consultation (at scheduled time)
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300">
                  Mark as Prepared
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100">My Orders</h1>
          <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700">
            {orders.filter(o => !o.isRead).length} unread supplements
          </Badge>
        </div>

        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`bg-slate-900 border-slate-800 cursor-pointer hover:border-amber-700/50 transition-colors ${
                !order.isRead ? "ring-1 ring-amber-500/20" : ""
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100">#{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                      {!order.isRead && (
                        <Badge className="bg-amber-900 text-amber-400">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          New Supplement
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{order.userName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.scheduledAt).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span className="text-amber-400">${order.price}</span>
                    </div>
                    {order.supplement && (
                      <p className="text-sm text-slate-500 line-clamp-2">
                        {order.supplement.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
