"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { Organization } from "@/shared/context/types";
import { notify } from "@/shared/lib/toast";
import {
  ShoppingBag,
  Package,
  Plus,
  Edit3,
  Trash2,
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Clock,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  orderId: string;
  total: number;
  status: string;
  paymentStatus: string;
  phone: string;
  address: Record<string, unknown> | string;
  items: OrderItem[];
  createdAt: string;
}

interface SequenceSummary {
  id: string;
  trigger: string;
}

/** Translate raw API error strings into plain language a non-technical user can act on. */
function simplifyCartRecoveryError(raw?: string): string {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("forbidden") || lower.includes("admin")) {
    return "You'll need admin access in this workspace to turn this on — ask a workspace admin to enable it.";
  }
  if (lower.includes("unauthorized") || lower.includes("session")) {
    return "Your session seems to have expired. Refresh the page and try again.";
  }
  return "Something went wrong while turning this on. Please wait a moment and try again.";
}

export const MarketplaceTab: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const params = useParams();
  const orgId = params.orgId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [botToggling, setBotToggling] = useState(false);

  const [activeSection, setActiveSection] = useState<"overview" | "products" | "orders">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "0",
  });

  // Abandoned Cart Recovery — one-click sequence setup
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [creatingCartRecovery, setCreatingCartRecovery] = useState(false);

  const hasCartRecoverySequence = sequences.some((s) => s.trigger === "cart_abandoned");

  const handleSetUpCartRecovery = async () => {
    if (creatingCartRecovery || hasCartRecoverySequence) return;
    setCreatingCartRecovery(true);
    try {
      const res = await fetch(`/api/org/${orgId}/sequences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Cart Recovery",
          trigger: "cart_abandoned",
          steps: [
            {
              order: 0,
              delayMinutes: 0,
              actionType: "send_message",
              message:
                "Hey {{contact.name}}! 🛒 You left {{cart.items_list}} in your cart (Total: {{cart.total}}). Complete your order here: {{cart.checkout_url}}",
            },
            {
              order: 1,
              delayMinutes: 120,
              actionType: "send_template",
              templateName: "cart_recovery",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        notify.error("Couldn't turn this on", simplifyCartRecoveryError(data.error));
      } else if (data.sequence) {
        setSequences((prev) => [...prev, { id: data.sequence.id, trigger: data.sequence.trigger }]);
        notify.success(
          "Cart recovery is now live",
          "Customers who leave items unpaid for an hour will automatically get a friendly reminder, with a follow-up two hours later."
        );
      }
    } catch {
      notify.error("Couldn't turn this on", simplifyCartRecoveryError());
    } finally {
      setCreatingCartRecovery(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const [resP, resO, resS] = await Promise.all([
          fetch(`/api/marketplace/catalog?orgId=${orgId}`),
          fetch(`/api/org/${orgId}/data`),
          fetch(`/api/org/${orgId}/sequences`)
        ]);
        const dataP = await resP.json();
        const dataO = await resO.json();
        const dataS = await resS.json().catch(() => ({}));
        if (mounted) {
          setProducts(dataP.products || []);
          if (dataO.orders) setOrders(dataO.orders);
          if (dataO.organization) setOrganization(dataO.organization);
          setSequences(dataS.sequences || []);
        }
      } catch (err) {
        console.error("Failed to fetch marketplace data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, [orgId]);

  const toggleMarketplaceBot = async () => {
    if (!organization) return;
    setBotToggling(true);
    const targetState = !organization.marketplaceBotEnabled;
    try {
      const res = await fetch("/api/marketplace/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, enabled: targetState }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.organization) {
          setOrganization((prev) => prev ? {
            ...prev,
            marketplaceBotEnabled: data.organization.marketplaceBotEnabled,
          } : prev);
        }
      } else {
        const data = await res.json();
        if (data.error) {
          notify.error("Setup Incomplete", data.error);
        } else {
          notify.error("Failed to toggle bot", "An unexpected error occurred.");
        }
      }
    } catch (err) {
      console.error("Failed to toggle marketplace bot setting", err);
    } finally {
      setBotToggling(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/marketplace/catalog?orgId=${orgId}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", category: "", stock: "0" });
    setEditProduct(null);
    setShowAddProduct(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name,
      description: form.description,
      price: Math.round(parseFloat(form.price) * 100),
      category: form.category,
      stock: parseInt(form.stock) || 0,
      organizationId: orgId,
    };

    if (editProduct) {
      await fetch(`/api/marketplace/products/${editProduct.id}?orgId=${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/marketplace/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    resetForm();
    await fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/marketplace/products/${id}?orgId=${orgId}`, { method: "DELETE" });
    await fetchProducts();
  };

  const startEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description,
      price: (product.price / 100).toString(),
      category: product.category,
      stock: product.stock.toString(),
    });
    setEditProduct(product);
    setShowAddProduct(true);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.isActive).length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    revenue: orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.total, 0),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafaf9]">
        <RefreshCw className="w-6 h-6 text-stone-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6 sm:space-y-8" : "flex-1 overflow-y-auto p-4 pb-12 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]"}>
      {/* Dynamic Header Layout */}
      <div className={`flex max-lg:flex-col gap-4 lg:flex-row lg:items-center select-none ${embedded ? "justify-end" : "justify-between border-b border-stone-200 pb-6"}`}>
        {!embedded && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-stone-950 flex items-center justify-center border border-stone-950 shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 uppercase">Marketplace</h1>
              <p className="text-xs text-stone-500">Manage products and orders</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 max-lg:w-full lg:flex lg:w-auto gap-1">
          <button
            onClick={() => setActiveSection("overview")}
            className={`px-4 py-2.5 rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center ${
              activeSection === "overview" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection("products")}
            className={`px-4 py-2.5 rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center ${
              activeSection === "products" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveSection("orders")}
            className={`px-4 py-2.5 rounded-none text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center ${
              activeSection === "orders" ? "bg-stone-950 text-white border-stone-950" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            Orders
          </button>
        </div>
      </div>

      {activeSection === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Total Products" value={stats.totalProducts} />
            <StatCard icon={ShoppingBag} label="Active Products" value={stats.activeProducts} />
            <StatCard icon={Package} label="Pending Orders" value={stats.pendingOrders} />
            <StatCard icon={ExternalLink} label="Revenue (paid)" value={`₹${(stats.revenue / 100).toFixed(2)}`} />
          </div>

          {!embedded && (
          <div className="bg-white rounded-none p-5 sm:p-8 border border-stone-200 hover:border-stone-400 transition-colors duration-300 animate-fade-in flex max-md:flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${organization?.marketplaceBotEnabled ? "bg-stone-900 animate-pulse" : "bg-stone-300"}`} />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Marketplace Automation Bot</h3>
              </div>
              <p className="text-[11px] text-stone-500 max-w-2xl leading-relaxed">
                When enabled, the automated AI agent intercepts inbound WhatsApp messages to guide users through catalogs, manage carts, handle checkout, and check payment status in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest">
                {organization?.marketplaceBotEnabled ? "ACTIVE / ONLINE" : "DISABLED"}
              </span>
              <button
                disabled={botToggling}
                onClick={toggleMarketplaceBot}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border border-stone-300 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-stone-900 ${
                  organization?.marketplaceBotEnabled ? "bg-stone-950" : "bg-stone-100"
                } ${botToggling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-sm ring-0 transition duration-200 ease-in-out border border-stone-300 ${
                    organization?.marketplaceBotEnabled ? "translate-x-5 bg-white border-stone-950" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
          )}

          <div className="bg-white rounded-none p-5 sm:p-8 border border-stone-200 hover:border-stone-400 transition-colors duration-300 animate-fade-in flex max-md:flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${hasCartRecoverySequence ? "bg-stone-900 animate-pulse" : "bg-stone-300"}`} />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Abandoned Cart Recovery</h3>
              </div>
              <p className="text-[11px] text-stone-500 max-w-2xl leading-relaxed">
                When a customer adds items to their cart on WhatsApp but never pays, this automatically sends a friendly reminder with their cart total and payment link an hour later — then a follow-up two hours after that if they still haven&apos;t checked out.
              </p>
            </div>
            <div className="self-start md:self-auto">
              {hasCartRecoverySequence ? (
                <span className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-[10px] font-extrabold text-stone-500 uppercase tracking-widest">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-900" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleSetUpCartRecovery}
                  disabled={creatingCartRecovery}
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingCartRecovery ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  {creatingCartRecovery ? "Setting Up..." : "Set Up Cart Recovery"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === "products" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-none bg-white border border-stone-200 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              />
            </div>
            <button
              onClick={() => { resetForm(); setShowAddProduct(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          {showAddProduct && (
            <form onSubmit={handleSubmit} className="bg-white rounded-none p-6 border border-stone-200 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-bold text-stone-900 uppercase text-xs">{editProduct ? "Edit Product" : "Add Product"}</h3>
                <button type="button" onClick={resetForm} className="p-1 hover:bg-stone-100 rounded-none cursor-pointer border border-transparent">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <InputField label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} required />
                <InputField label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
                <InputField label="Stock" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 resize-none"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-stone-950 text-white rounded-none border border-stone-950 text-xs font-bold hover:bg-stone-900 transition-all cursor-pointer uppercase"
              >
                {editProduct ? "Update Product" : "Create Product"}
              </button>
            </form>
          )}

          {/* Desktop Table Catalog View */}
          <div className="max-lg:hidden lg:block bg-white rounded-none border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Stock</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-stone-200 hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-bold text-stone-900">{product.name}</td>
                      <td className="px-4 py-3 text-stone-500">{product.category}</td>
                      <td className="px-4 py-3 text-right">₹{(product.price / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{product.stock}</td>
                      <td className="px-4 py-3 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-900 bg-stone-100 px-2 py-0.5 border border-stone-300 rounded-none uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 bg-stone-50 px-2 py-0.5 border border-stone-200 rounded-none uppercase">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(product)} className="p-1.5 hover:bg-stone-100 rounded-none text-stone-500 hover:text-stone-900 border border-transparent cursor-pointer">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteProduct(product.id)} className="p-1.5 hover:bg-stone-100 rounded-none text-stone-500 hover:text-stone-900 border border-transparent cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-stone-500 text-xs uppercase">No products found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Product Card Catalog View */}
          <div className="max-lg:grid lg:hidden grid-cols-1 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white border border-stone-200 p-5 hover:border-stone-400 transition-colors duration-300 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{product.category}</span>
                  {product.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-stone-900 bg-stone-100 px-2 py-0.5 border border-stone-300 rounded-none uppercase">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-stone-500 bg-stone-50 px-2 py-0.5 border border-stone-200 rounded-none uppercase">
                      Inactive
                    </span>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-stone-900 leading-snug">{product.name}</h4>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{product.description || "No description provided."}</p>
                </div>

                <div className="flex items-baseline justify-between border-t border-stone-100 pt-4">
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Price</span>
                    <span className="text-base font-light text-stone-950">₹{(product.price / 100).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Stock</span>
                    <span className="text-xs font-bold text-stone-700">{product.stock} units</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4">
                  <button
                    onClick={() => startEdit(product)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-50 border border-stone-200 hover:border-stone-950 hover:bg-white text-stone-950 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border border-stone-200 hover:border-red-600 hover:bg-red-50 hover:text-red-600 text-stone-500 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="bg-white border border-stone-200 p-8 text-center text-stone-500 text-xs uppercase">
                No products found
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "orders" && (
        <div className="space-y-4">
          {/* Desktop Table Orders Ledger View */}
          <div className="max-lg:hidden lg:block bg-white rounded-none border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
                    <th className="text-left px-4 py-3">Order ID</th>
                    <th className="text-left px-4 py-3">Items</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Payment</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-stone-200 hover:bg-stone-50/50">
                      <td className="px-4 py-3 text-xs font-bold text-stone-900">{order.orderId}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {order.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">₹{(order.total / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PaymentBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs">{order.phone}</td>
                      <td className="px-4 py-3 text-stone-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-500 text-xs uppercase">No orders yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Orders Card Ledger View */}
          <div className="max-lg:grid lg:hidden grid-cols-1 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-stone-200 p-5 hover:border-stone-400 transition-colors duration-300 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-stone-950 tracking-tight">{order.orderId}</span>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Ordered Items</span>
                  <p className="text-xs text-stone-800 font-semibold leading-relaxed">
                    {order.items?.map((i) => `${i.name} ×${i.quantity}`).join(", ") || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Fulfillment</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Payment</span>
                    <PaymentBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-stone-100 pt-4">
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Contact Phone</span>
                    <span className="text-xs font-mono font-bold text-stone-700">{order.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Total Amt</span>
                    <span className="text-base font-light text-stone-950">₹{(order.total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="bg-white border border-stone-200 p-8 text-center text-stone-500 text-xs uppercase">
                No orders yet
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-stone-200 p-5 hover:border-stone-400 transition-colors duration-300 select-none flex flex-col justify-between h-28">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">{label}</span>
        <Icon className="w-4 h-4 text-stone-400" />
      </div>
      <span className="text-2xl font-light text-stone-950 tracking-tight">{value}</span>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold text-stone-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-none border border-stone-200 text-sm focus:outline-none focus:border-stone-900 transition-all focus:ring-1 focus:ring-stone-900"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border border-stone-300 bg-stone-50 text-stone-700 uppercase">
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const isPaid = status.toLowerCase() === "paid";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase ${
      isPaid ? "bg-stone-900 text-white border-stone-950" : "bg-stone-100 text-stone-900 border-stone-300"
    }`}>
      {status}
    </span>
  );
}
