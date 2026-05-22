import { useState, useRef, useMemo } from "react";
import {
  Pencil,
  Trash2,
  X,
  Plus,
  IndianRupee,
  FileText,
  MessageCircle,
  LayoutList,
  CalendarDays,
  Upload,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "checked-in",
  "checked-out",
  "cancelled",
];
const inputStyle = {
  width: "100%",
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  padding: "9px 12px",
  color: "#e0e0e0",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const STATUS_COLORS = {
  pending: { color: "#f59e0b", bg: "#f59e0b18", border: "#f59e0b40" },
  confirmed: { color: "#33b5b5", bg: "#33b5b518", border: "#33b5b540" },
  "checked-in": { color: "#10b981", bg: "#10b98118", border: "#10b98140" },
  "checked-out": { color: "#555", bg: "#55555518", border: "#55555540" },
  cancelled: { color: "#ef4444", bg: "#ef444418", border: "#ef444440" },
};

const PAYMENT_METHODS = ["Cash", "UPI", "Card"];
const PAYMENT_TYPES = ["Advance", "Remaining", "Add-on", "Other"];
const TYPE_COLORS = {
  Advance: "#f59e0b",
  Remaining: "#10b981",
  "Add-on": "#33b5b5",
  Other: "#888",
};

const ALL_ADDONS = [
  {
    id: "early_checkin",
    label: "Early Check-in / Late Check-out",
    price: 500,
    icon: "🕐",
  },
  { id: "breakfast", label: "Breakfast / Home Food", price: 200, icon: "🍽️" },
  { id: "laundry", label: "Laundry Service", price: 100, icon: "👕" },
  {
    id: "bike_rental",
    label: "Scooter / Bike / Car Rental",
    price: 500,
    icon: "🛵",
  },
  { id: "local_tour", label: "Local Tour / Guide", price: 800, icon: "🗺️" },
  { id: "room_decoration", label: "Room Decoration", price: 1000, icon: "🎉" },
  { id: "wfh_setup", label: "Work-From-Home Setup", price: 300, icon: "💻" },
  { id: "grocery", label: "Grocery / Fridge Stocking", price: 200, icon: "🛒" },
  { id: "minibar", label: "Mini Bar / Snack Basket", price: 350, icon: "🧃" },
  { id: "housekeeping", label: "Housekeeping Upgrade", price: 200, icon: "🧹" },
  {
    id: "streaming",
    label: "Streaming & Entertainment",
    price: 400,
    icon: "📺",
  },
];

const BLANK_EDIT = {
  name: "",
  phone: "",
  email: "",
  check_in: "",
  check_out: "",
  guests_count: 1,
  notes: "",
  broker_name: "",
  broker_phone: "",
  broker_commission: "",
  commissionType: "fixed",
  custom_room_price: "",
  useCustomPrice: false,
};
const BLANK_PAY = { amount: "", method: "Cash", type: "Advance", note: "" };

export default function Bookings({ isMobile }) {
  const {
    bookings,
    bookingsLoading,
    addBooking,
    updateBookingStatus,
    updateBooking,
    deleteBooking,
    payments,
    addPayment,
    deletePayment,
    getDocUrls,
    roomRates,
    promoCodes,
    applyPromoToBooking,
    markBrokerCommissionPaid,
  } = useApp();

  const [promoBookingId, setPromoBookingId] = useState(null);
  const [promoSelected, setPromoSelected] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [brokerPayId, setBrokerPayId] = useState(null); // booking id being marked

  // View mode: list or calendar
  const [viewMode, setViewMode] = useState("list");
  const [calMonth, setCalMonth] = useState(new Date());

  // Expanded booking detail (for guest history + WA actions)
  const [expandedId, setExpandedId] = useState(null);

  const calcRoomCost = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (end <= start) return 0;
    let total = 0;
    const cur = new Date(start);
    while (cur < end) {
      const day = cur.getDay();
      total +=
        day === 0 || day === 5 || day === 6
          ? roomRates.weekend_rate
          : roomRates.weekday_rate;
      cur.setDate(cur.getDate() + 1);
    }
    return total;
  };

  const MAX_DISCOUNT = 200;

  const getBookingFinancials = (b) => {
    const nights =
      b.check_in && b.check_out
        ? Math.max(0, (new Date(b.check_out) - new Date(b.check_in)) / 86400000)
        : 0;
    const roomRaw =
      b.custom_room_price != null
        ? Number(b.custom_room_price) * nights
        : calcRoomCost(b.check_in, b.check_out);
    const addonRaw = (b.addons || []).reduce((s, a) => s + (a.price || 0), 0);
    const totalDiscountPct = (b.discount || 0) + (b.promo_discount || 0);
    const discountAmt = Math.min(
      Math.round(((roomRaw + addonRaw) * totalDiscountPct) / 100),
      MAX_DISCOUNT
    );
    const totalDue = roomRaw + addonRaw - discountAmt;
    const totalPaid = payments
      .filter((p) => p.booking_id === b.id)
      .reduce((s, p) => s + (p.amount || 0), 0);
    const balance = totalDue - totalPaid;
    return {
      roomRaw,
      addonRaw,
      totalDiscountPct,
      discountAmt,
      totalDue,
      totalPaid,
      balance,
    };
  };

  const fmtR = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Payment modal state
  const [payModalId, setPayModalId] = useState(null); // booking id
  const [payForm, setPayForm] = useState(BLANK_PAY);
  const [payingSaving, setPayingSaving] = useState(false);
  const [deletePayId, setDeletePayId] = useState(null);

  // Expanded payment sections
  const [expandedPayments, setExpandedPayments] = useState({});

  // Status confirmation modal
  const [statusConfirm, setStatusConfirm] = useState(null); // { bookingId, status, name }

  // Docs modal
  const [docsModal, setDocsModal] = useState(null); // { guests: [{front,back},...], bookingId, activeGuest }
  const [docOps, setDocOps] = useState({}); // { front: 'deleting'|'uploading', back: ... }
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const handleDocDelete = async (side) => {
    if (!docsModal?.bookingId) return;
    setDocOps((p) => ({ ...p, [side]: "deleting" }));
    const guestIdx = docsModal.activeGuest ?? 0;
    const path = `${docsModal.bookingId}/guest_${guestIdx + 1}_doc_${side}`;
    await supabase.storage.from("documents").remove([path]);
    // If no docs remain for any guest → reset status to pending
    const { data: list } = await supabase.storage
      .from("documents")
      .list(docsModal.bookingId);
    const anyRemaining = list?.some(
      (f) => f.name.endsWith("_doc_front") || f.name.endsWith("_doc_back")
    );
    if (!anyRemaining) {
      await updateBooking(docsModal.bookingId, { docs_status: "pending" });
    }
    setDocsModal((prev) => ({
      ...prev,
      guests: prev.guests.map((g, i) =>
        i === guestIdx ? { ...g, [side]: null } : g
      ),
    }));
    setDocOps((p) => ({ ...p, [side]: null }));
  };

  const handleDocReplace = async (side, file) => {
    if (!file || !docsModal?.bookingId) return;
    setDocOps((p) => ({ ...p, [side]: "uploading" }));
    const guestIdx = docsModal.activeGuest ?? 0;
    const path = `${docsModal.bookingId}/guest_${guestIdx + 1}_doc_${side}`;
    await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true });
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(path);
    const freshUrl = urlData.publicUrl + "?t=" + Date.now();
    setDocsModal((prev) => ({
      ...prev,
      guests: prev.guests.map((g, i) =>
        i === guestIdx ? { ...g, [side]: freshUrl } : g
      ),
    }));
    setDocOps((p) => ({ ...p, [side]: null }));
  };

  // Addon modal
  const [addonModal, setAddonModal] = useState(null); // { bookingId, addons[] }
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [addonSaving, setAddonSaving] = useState(false);

  // Create booking
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    email: "",
    check_in: "",
    check_out: "",
    guests_count: 1,
    notes: "",
    status: "confirmed",
  });
  const [createAddons, setCreateAddons] = useState([]);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const handleCreate = async () => {
    setCreateError("");
    if (!createForm.name.trim()) return setCreateError("Name is required.");
    if (!createForm.phone.trim()) return setCreateError("Phone is required.");
    if (createForm.phone.replace(/\D/g, "").length !== 10)
      return setCreateError("Phone must be 10 digits.");
    if (!createForm.check_in)
      return setCreateError("Check-in date is required.");
    if (!createForm.check_out)
      return setCreateError("Check-out date is required.");
    if (createForm.check_out <= createForm.check_in)
      return setCreateError("Check-out must be after check-in.");
    setCreateSaving(true);

    const phone = createForm.phone.trim();
    const { error } = await addBooking({
      name: createForm.name.trim(),
      phone,
      email: createForm.email.trim(),
      check_in: createForm.check_in,
      check_out: createForm.check_out,
      guests_count: Number(createForm.guests_count),
      notes: createForm.notes.trim(),
      status: createForm.status,
      addons: createAddons,
      docs_status: "pending",
      discount: 0,
      custom_room_price:
        createForm.useCustomPrice && createForm.custom_room_price
          ? Number(createForm.custom_room_price)
          : null,
      broker_name: createForm.broker_name?.trim() || null,
      broker_phone: createForm.broker_phone?.trim() || null,
      broker_commission: (() => {
        if (!createForm.broker_commission) return null;
        if (
          createForm.commissionType === "percent" &&
          createForm.custom_room_price
        ) {
          return Math.round(
            (Number(createForm.custom_room_price) *
              Number(createForm.broker_commission)) /
              100
          );
        }
        return Number(createForm.broker_commission);
      })(),
      broker_commission_paid: false,
    });
    setCreateSaving(false);
    if (error) return setCreateError(error.message);
    setShowCreate(false);
    setCreateForm({
      name: "",
      phone: "",
      email: "",
      check_in: "",
      check_out: "",
      guests_count: 1,
      notes: "",
      status: "confirmed",
    });
    setCreateAddons([]);
  };

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateFilter === "today") return { from: todayStr, to: todayStr };
    if (dateFilter === "this_week") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diff);
      return { from: mon.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "custom") return { from: customFrom, to: customTo };
    return { from: null, to: null };
  }, [dateFilter, customFrom, customTo]);

  const FILTER_LABELS = {
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
    custom: "Custom Range",
  };

  const filteredBookings = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !(
        (b.name || "").toLowerCase().includes(q) ||
        (b.phone || "").toLowerCase().includes(q) ||
        (b.email || "").toLowerCase().includes(q)
      )
    )
      return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (sourceFilter === "broker" && !b.broker_name) return false;
    if (sourceFilter === "direct" && b.broker_name) return false;
    const d = b.created_at ? b.created_at.slice(0, 10) : "";
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  });

  const isFiltered =
    search.trim() || statusFilter !== "all" || sourceFilter !== "all" || dateFilter !== "all";

  // ── Stats ──
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPendingBalance = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "checked-out")
    .reduce((s, b) => {
      const fin = getBookingFinancials(b);
      return s + Math.max(0, fin.balance);
    }, 0);
  const checkedInCount = bookings.filter((b) => b.status === "checked-in").length;

  // ── Returning guests (same phone, 2+ bookings) ──
  const phoneCounts = {};
  bookings.forEach((b) => { if (b.phone) phoneCounts[b.phone] = (phoneCounts[b.phone] || 0) + 1; });

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  const fmt = (dateStr) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const fmtTime = (isoStr) => {
    if (!isoStr) return null;
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fmtMoney = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const nights = (ci, co) => {
    if (!ci || !co) return 0;
    return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
  };

  const bookingPayments = (bookingId) =>
    payments.filter((p) => p.booking_id === bookingId);
  const totalPaid = (bookingId) =>
    bookingPayments(bookingId).reduce((s, p) => s + Number(p.amount), 0);

  const openEdit = (b) => {
    setEditId(b.id);
    setEditForm({
      name: b.name || "",
      phone: b.phone || "",
      email: b.email || "",
      check_in: b.check_in || "",
      check_out: b.check_out || "",
      guests_count: b.guests_count || 1,
      notes: b.notes || "",
      broker_name: b.broker_name || "",
      broker_phone: b.broker_phone || "",
      broker_commission:
        b.broker_commission != null ? String(b.broker_commission) : "",
      commissionType: "fixed",
      custom_room_price:
        b.custom_room_price != null ? String(b.custom_room_price) : "",
      useCustomPrice: b.custom_room_price != null,
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    const effectiveCustomPrice =
      editForm.useCustomPrice && editForm.custom_room_price
        ? Number(editForm.custom_room_price)
        : null;
    await updateBooking(editId, {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email,
      check_in: editForm.check_in,
      check_out: editForm.check_out,
      guests_count: Number(editForm.guests_count),
      notes: editForm.notes,
      custom_room_price: effectiveCustomPrice,
      broker_name: editForm.useCustomPrice
        ? editForm.broker_name.trim() || null
        : null,
      broker_phone: editForm.useCustomPrice
        ? editForm.broker_phone.trim() || null
        : null,
      broker_commission: editForm.useCustomPrice
        ? (() => {
            if (!editForm.broker_commission) return null;
            if (editForm.commissionType === "percent" && effectiveCustomPrice) {
              return Math.round(
                (effectiveCustomPrice * Number(editForm.broker_commission)) /
                  100
              );
            }
            return Number(editForm.broker_commission);
          })()
        : null,
    });
    setSaving(false);
    setEditId(null);
  };

  const confirmDelete = async () => {
    await deleteBooking(deleteId);
    setDeleteId(null);
  };

  const openPayModal = (bookingId) => {
    setPayModalId(bookingId);
    setPayForm(BLANK_PAY);
  };

  const savePayment = async () => {
    if (!payForm.amount || isNaN(payForm.amount)) return;
    setPayingSaving(true);
    await addPayment(
      payModalId,
      payForm.amount,
      payForm.method,
      payForm.type,
      payForm.note
    );
    setPayingSaving(false);
    setPayModalId(null);
    // Auto-expand payments for this booking
    setExpandedPayments((prev) => ({ ...prev, [payModalId]: true }));
  };

  const confirmDeletePayment = async () => {
    await deletePayment(deletePayId);
    setDeletePayId(null);
  };

  const openAddonModal = (b) => {
    setAddonModal({ bookingId: b.id, addons: [...(b.addons || [])] });
    setCustomLabel("");
    setCustomPrice("");
  };

  const toggleAddon = (addon) => {
    setAddonModal((prev) => {
      const exists = prev.addons.find((a) => a.id === addon.id);
      return {
        ...prev,
        addons: exists
          ? prev.addons.filter((a) => a.id !== addon.id)
          : [
              ...prev.addons,
              { id: addon.id, label: addon.label, price: addon.price },
            ],
      };
    });
  };

  const addCustomAddon = () => {
    const label = customLabel.trim();
    const price = Number(customPrice);
    if (!label || !price) return;
    const id = "custom_" + Date.now();
    setAddonModal((prev) => ({
      ...prev,
      addons: [...prev.addons, { id, label, price }],
    }));
    setCustomLabel("");
    setCustomPrice("");
  };

  const removeAddon = (id) => {
    setAddonModal((prev) => ({
      ...prev,
      addons: prev.addons.filter((a) => a.id !== id),
    }));
  };

  const saveAddons = async () => {
    setAddonSaving(true);
    await updateBooking(addonModal.bookingId, { addons: addonModal.addons });
    setAddonSaving(false);
    setAddonModal(null);
  };

  return (
    <div
      style={{ padding: pad, display: "flex", flexDirection: "column", gap }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: isMobile ? "20px" : "26px",
              fontWeight: "700",
              color: "#f0f0f0",
            }}
          >
            Bookings
          </h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
            {isFiltered ? (
              <>
                {filteredBookings.length}{" "}
                <span style={{ color: "#444" }}>of</span> {bookings.length}{" "}
                bookings
              </>
            ) : (
              <>
                {bookings.length} total request
                {bookings.length !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* View Toggle */}
          <button
            onClick={() =>
              setViewMode(viewMode === "list" ? "calendar" : "list")
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background:
                viewMode === "calendar" ? "rgba(51,181,181,0.15)" : "#1a1a1a",
              border:
                viewMode === "calendar"
                  ? "1px solid rgba(51,181,181,0.4)"
                  : "1px solid #2a2a2a",
              borderRadius: "8px",
              color: viewMode === "calendar" ? "#33b5b5" : "#666",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title={
              viewMode === "list"
                ? "Switch to Calendar View"
                : "Switch to List View"
            }
          >
            {viewMode === "list" ? (
              <CalendarDays size={15} />
            ) : (
              <LayoutList size={15} />
            )}
            {viewMode === "list" ? "Calendar" : "List"}
          </button>

          {/* Create Booking */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "linear-gradient(135deg, #008080, #00a0a0)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={15} /> Create Booking
          </button>

          {/* Search */}
          <input
            type="text"
            placeholder="Search name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "#e0e0e0",
              fontSize: "13px",
              outline: "none",
              width: isMobile ? "100%" : "200px",
              boxSizing: "border-box",
            }}
          />

          {/* Status filter dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                padding: "8px 32px 8px 12px",
                color: statusFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              color="#555"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Source filter dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                padding: "8px 32px 8px 12px",
                color: sourceFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Sources</option>
              <option value="direct">Direct</option>
              <option value="broker">Broker</option>
            </select>
            <ChevronDown size={13} color="#555" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>

          {/* Date filter dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                padding: "8px 32px 8px 12px",
                color: dateFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
                colorScheme: "dark",
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown
              size={13}
              color="#555"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>

          {dateFilter === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  color: customFrom ? "#e0e0e0" : "#555",
                  fontSize: "12px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              <span style={{ color: "#444", fontSize: "12px" }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  color: customTo ? "#e0e0e0" : "#555",
                  fontSize: "12px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => {
                    setCustomFrom("");
                    setCustomTo("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "0 2px",
                  }}
                >
                  ×
                </button>
              )}
            </>
          )}

          {dateFilter !== "all" && (
            <button
              onClick={() => {
                setDateFilter("all");
                setCustomFrom("");
                setCustomTo("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(51,181,181,0.1)",
                border: "1px solid rgba(51,181,181,0.3)",
                borderRadius: "6px",
                padding: "5px 10px",
                color: "#33b5b5",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {FILTER_LABELS[dateFilter]} ×
            </button>
          )}
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Total Bookings", value: bookings.length, color: "#33b5b5" },
          { label: "Upcoming", value: bookings.filter(b => b.status === "pending" || b.status === "confirmed").length, color: "#06b6d4" },
          { label: "Checked In", value: checkedInCount, color: "#10b981" },
          { label: "Cancelled", value: bookings.filter(b => b.status === "cancelled").length, color: "#ef4444" },
          { label: "Revenue Collected", value: "₹" + Number(totalRevenue).toLocaleString("en-IN"), color: "#008080" },
          { label: "Pending Balance", value: "₹" + Number(totalPendingBalance).toLocaleString("en-IN"), color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "10px", padding: isMobile ? "12px 14px" : "14px 18px" }}>
            <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "5px" }}>{s.label}</p>
            <p style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "800", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {bookingsLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            color: "#444",
            fontSize: "14px",
          }}
        >
          Loading...
        </div>
      )}

      {!bookingsLoading && bookings.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "#444",
            fontSize: "14px",
          }}
        >
          No bookings yet. Share the guest form link to get started.
        </div>
      )}

      {/* ── Calendar View ── */}
      {!bookingsLoading &&
        viewMode === "calendar" &&
        (() => {
          const year = calMonth.getFullYear();
          const month = calMonth.getMonth();
          const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const monthLabel = calMonth.toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          });

          // Build array of day cells (nulls for padding)
          const cells = [];
          for (let i = 0; i < firstDay; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);

          const todayStr = new Date().toISOString().split("T")[0];

          // For each day, find bookings that include it
          const bookingsForDay = (day) => {
            if (!day) return [];
            const dayStr = `${year}-${String(month + 1).padStart(
              2,
              "0"
            )}-${String(day).padStart(2, "0")}`;
            return bookings.filter((b) => {
              if (!b.check_in || !b.check_out) return false;
              return b.check_in <= dayStr && b.check_out > dayStr;
            });
          };

          return (
            <div
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Calendar Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                <button
                  onClick={() => {
                    const d = new Date(calMonth);
                    d.setMonth(d.getMonth() - 1);
                    setCalMonth(d);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    color: "#888",
                    cursor: "pointer",
                    padding: "5px 10px",
                    fontSize: "14px",
                  }}
                >
                  ‹
                </button>
                <span
                  style={{
                    fontWeight: "700",
                    color: "#e0e0e0",
                    fontSize: "15px",
                  }}
                >
                  {monthLabel}
                </span>
                <button
                  onClick={() => {
                    const d = new Date(calMonth);
                    d.setMonth(d.getMonth() + 1);
                    setCalMonth(d);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    color: "#888",
                    cursor: "pointer",
                    padding: "5px 10px",
                    fontSize: "14px",
                  }}
                >
                  ›
                </button>
              </div>

              {/* Day headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  borderBottom: "1px solid #1a1a1a",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    style={{
                      padding: "8px 4px",
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#444",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                }}
              >
                {cells.map((day, idx) => {
                  const dayStr = day
                    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(
                        day
                      ).padStart(2, "0")}`
                    : null;
                  const isToday = dayStr === todayStr;
                  const dayBookings = bookingsForDay(day);
                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: "72px",
                        borderRight:
                          (idx + 1) % 7 !== 0 ? "1px solid #1a1a1a" : "none",
                        borderBottom:
                          idx < cells.length - 7 ? "1px solid #1a1a1a" : "none",
                        padding: "6px 4px",
                        background: !day ? "#0d0d0d" : "transparent",
                      }}
                    >
                      {day && (
                        <>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: isToday ? "800" : "500",
                              color: isToday ? "#33b5b5" : "#555",
                              marginBottom: "4px",
                              textAlign: "center",
                            }}
                          >
                            {day}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            {dayBookings.slice(0, 3).map((b) => {
                              const sc =
                                STATUS_COLORS[b.status] ||
                                STATUS_COLORS.pending;
                              return (
                                <div
                                  key={b.id}
                                  onClick={() =>
                                    setExpandedId(
                                      expandedId === b.id ? null : b.id
                                    )
                                  }
                                  title={`${b.name} · ${b.status}`}
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    color: sc.color,
                                    background: sc.bg,
                                    border: `1px solid ${sc.border}`,
                                    borderRadius: "3px",
                                    padding: "1px 4px",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {b.name?.split(" ")[0] || "Guest"}
                                </div>
                              );
                            })}
                            {dayBookings.length > 3 && (
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#444",
                                  paddingLeft: "2px",
                                }}
                              >
                                +{dayBookings.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded booking detail from calendar click */}
              {expandedId &&
                (() => {
                  const b = bookings.find((bk) => bk.id === expandedId);
                  if (!b) return null;
                  const s = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                  return (
                    <div
                      style={{
                        borderTop: "1px solid #1a1a1a",
                        padding: "16px 20px",
                        background: "#0d0d0d",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background:
                                "linear-gradient(135deg,#008080,#00a0a0)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "700",
                              color: "#fff",
                            }}
                          >
                            {b.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p
                              style={{
                                fontWeight: "700",
                                color: "#f0f0f0",
                                fontSize: "14px",
                              }}
                            >
                              {b.name}
                            </p>
                            <p style={{ fontSize: "12px", color: "#555" }}>
                              {b.phone} · {fmt(b.check_in)} → {fmt(b.check_out)}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              padding: "3px 10px",
                              borderRadius: "20px",
                              background: s.bg,
                              border: `1px solid ${s.border}`,
                              color: s.color,
                            }}
                          >
                            {b.status}
                          </span>
                          <button
                            onClick={() => setExpandedId(null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#555",
                              cursor: "pointer",
                              display: "flex",
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          );
        })()}

      {/* Booking Cards */}
      {!bookingsLoading &&
        viewMode === "list" &&
        filteredBookings.map((b) => {
          const s = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
          const isReturning = (phoneCounts[b.phone] || 0) > 1;
          const checkoutToday = b.check_out === todayStr;
          const checkoutTomorrow = b.check_out === tomorrowStr;
          const totalAddonCost = (b.addons || []).reduce(
            (sum, a) => sum + (a.price || 0),
            0
          );
          const bPayments = bookingPayments(b.id);
          const paid = totalPaid(b.id);
          const showPayments = expandedPayments[b.id];

          return (
            <div
              key={b.id}
              style={{
                background: "#111",
                border: checkoutToday
                  ? "1px solid rgba(239,68,68,0.4)"
                  : checkoutTomorrow
                  ? "1px solid rgba(245,158,11,0.3)"
                  : "1px solid #1e1e1e",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Checkout alert banner */}
              {(checkoutToday || checkoutTomorrow) && (
                <div style={{
                  background: checkoutToday ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.06)",
                  borderBottom: checkoutToday ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(245,158,11,0.2)",
                  padding: "6px 16px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: checkoutToday ? "#ef4444" : "#f59e0b",
                  letterSpacing: "0.05em",
                }}>
                  {checkoutToday ? "⚠ CHECKING OUT TODAY" : "CHECK-OUT TOMORROW"}
                </div>
              )}
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: isMobile ? "14px 16px" : "16px 20px",
                  borderBottom: "1px solid #1a1a1a",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #008080, #00a0a0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {b.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "700",
                          color: "#f0f0f0",
                          fontSize: "15px",
                        }}
                      >
                        {b.name}
                      </p>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background:
                            b.docs_status === "received"
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(245,158,11,0.12)",
                          border:
                            b.docs_status === "received"
                              ? "1px solid rgba(16,185,129,0.3)"
                              : "1px solid rgba(245,158,11,0.3)",
                          color:
                            b.docs_status === "received"
                              ? "#10b981"
                              : "#f59e0b",
                        }}
                      >
                        {b.docs_status === "received"
                          ? "Docs ✓"
                          : "Docs Pending"}
                      </span>
                      {isReturning && (
                        <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6" }}>
                          Returning
                        </span>
                      )}
                      {b.broker_name && (
                        <span style={{ fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}>
                          via {b.broker_name}
                        </span>
                      )}
                      {b.discount > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "20px",
                            background: "rgba(16,185,129,0.12)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            color: "#10b981",
                          }}
                        >
                          {b.discount}% off
                        </span>
                      )}
                    </div>
                    <p style={{ color: "#555", fontSize: "12px" }}>
                      {b.phone}
                      {b.email ? ` · ${b.email}` : ""}
                    </p>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <select
                    value={b.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "checked-in" || val === "checked-out") {
                        setStatusConfirm({
                          bookingId: b.id,
                          status: val,
                          name: b.name,
                        });
                      } else {
                        updateBookingStatus(b.id, val);
                      }
                    }}
                    style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: "20px",
                      padding: "5px 12px",
                      color: s.color,
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                  {b.docs_status === "received" ? (
                    <button
                      onClick={() =>
                        setDocsModal({ ...getDocUrls(b.id, b.guests_count || 1), bookingId: b.id, activeGuest: 0 })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#10b981",
                        display: "flex",
                        padding: "4px",
                      }}
                      title="View Documents"
                    >
                      <FileText size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const uploadLink = `${window.location.origin}/upload?id=${b.id}`;
                        const clean = b.phone.replace(/\D/g, "");
                        const waPhone =
                          clean.length === 10 ? "91" + clean : clean;
                        const waText = encodeURIComponent(
                          `Hi ${b.name}! \n\nYour booking at Luxora is confirmed.\n\nTo complete your check-in, please upload your gov approved document here:\n ${uploadLink}\n\nThank you!`
                        );
                        window.open(
                          `https://wa.me/${waPhone}?text=${waText}`,
                          "_blank"
                        );
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#25d366",
                        display: "flex",
                        padding: "4px",
                      }}
                      title="Send upload link on WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </button>
                  )}
                  {b.docs_status !== "received" && (
                    <button
                      onClick={() =>
                        window.open(
                          `${window.location.origin}/upload?id=${b.id}`,
                          "_blank"
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#888",
                        display: "flex",
                        padding: "4px",
                      }}
                      title="Open upload link directly"
                    >
                      <Upload size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => openAddonModal(b)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#444",
                      display: "flex",
                      padding: "4px",
                    }}
                    title="Edit Add-ons"
                  >
                    <LayoutList size={15} />
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#444",
                      display: "flex",
                      padding: "4px",
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(b.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#333",
                      display: "flex",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: isMobile ? "14px 16px" : "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Stay info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr 1fr"
                      : "1fr 1fr 1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {[
                    { label: "Check-in", value: fmt(b.check_in) },
                    { label: "Check-out", value: fmt(b.check_out) },
                    { label: "Nights", value: nights(b.check_in, b.check_out) },
                    { label: "Guests", value: b.guests_count || 1 },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: "#1a1a1a",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          marginBottom: "4px",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#e0e0e0",
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add-ons */}
                {b.addons && b.addons.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#444",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        marginBottom: "8px",
                      }}
                    >
                      ADD-ONS REQUESTED
                    </p>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {b.addons.map((a) => (
                        <span
                          key={a.id}
                          style={{
                            fontSize: "12px",
                            color: "#33b5b5",
                            background: "rgba(0,128,128,0.1)",
                            border: "1px solid rgba(0,128,128,0.3)",
                            padding: "4px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          {a.label} · ₹{(a.price || 0).toLocaleString("en-IN")}
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        marginTop: "8px",
                      }}
                    >
                      Total add-ons est. ·{" "}
                      <strong style={{ color: "#e0e0e0" }}>
                        ₹{totalAddonCost.toLocaleString("en-IN")}
                      </strong>
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                {(b.checked_in_at || b.checked_out_at) && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {b.checked_in_at && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#10b98112",
                          border: "1px solid #10b98130",
                          borderRadius: "8px",
                          padding: "8px 14px",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#10b981",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "#10b981",
                              fontWeight: "600",
                              letterSpacing: "0.06em",
                            }}
                          >
                            CHECKED IN
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#e0e0e0",
                              fontWeight: "500",
                            }}
                          >
                            {fmtTime(b.checked_in_at)}
                          </p>
                        </div>
                      </div>
                    )}
                    {b.checked_out_at && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#55555512",
                          border: "1px solid #55555530",
                          borderRadius: "8px",
                          padding: "8px 14px",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "#888",
                              fontWeight: "600",
                              letterSpacing: "0.06em",
                            }}
                          >
                            CHECKED OUT
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#e0e0e0",
                              fontWeight: "500",
                            }}
                          >
                            {fmtTime(b.checked_out_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div
                    style={{
                      background: "#1a1a1a",
                      borderRadius: "8px",
                      padding: "10px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#444",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        marginBottom: "4px",
                      }}
                    >
                      NOTES
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        lineHeight: "1.5",
                      }}
                    >
                      {b.notes}
                    </p>
                  </div>
                )}

                {/* ── Financial Summary ── */}
                {(() => {
                  const fin = getBookingFinancials(b);
                  const nights = (() => {
                    if (!b.check_in || !b.check_out) return 0;
                    const diff = new Date(b.check_out) - new Date(b.check_in);
                    return Math.max(0, Math.round(diff / 86400000));
                  })();
                  return (
                    <div
                      style={{
                        borderTop: "1px solid #1a1a1a",
                        paddingTop: "14px",
                        marginBottom: "14px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#444",
                          letterSpacing: "0.08em",
                          marginBottom: "10px",
                        }}
                      >
                        BILLING
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                          fontSize: "13px",
                        }}
                      >
                        {nights > 0 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#666" }}>
                              Room ({nights} night{nights > 1 ? "s" : ""})
                            </span>
                            <span style={{ color: "#ccc" }}>
                              {fmtR(fin.roomRaw)}
                            </span>
                          </div>
                        )}
                        {fin.addonRaw > 0 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#666" }}>
                              Add-ons ({(b.addons || []).length})
                            </span>
                            <span style={{ color: "#ccc" }}>
                              {fmtR(fin.addonRaw)}
                            </span>
                          </div>
                        )}
                        {fin.totalDiscountPct > 0 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <span
                              style={{ color: "#10b981", lineHeight: "1.5" }}
                            >
                              Discount ({fin.totalDiscountPct}%
                              {b.discount > 0
                                ? ` — ${b.discount}% first-time`
                                : ""}
                              {b.promo_code
                                ? ` + ${b.promo_discount}% ${b.promo_code}`
                                : ""}
                              )
                              {Math.round(
                                ((calcRoomCost(b.check_in, b.check_out) +
                                  (b.addons || []).reduce(
                                    (s, a) => s + (a.price || 0),
                                    0
                                  )) *
                                  fin.totalDiscountPct) /
                                  100
                              ) > MAX_DISCOUNT && (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "11px",
                                    opacity: 0.7,
                                  }}
                                >
                                  Upto ₹{MAX_DISCOUNT} off
                                </span>
                              )}
                            </span>
                            <span
                              style={{
                                color: "#10b981",
                                flexShrink: 0,
                                marginLeft: "8px",
                              }}
                            >
                              −{fmtR(fin.discountAmt)}
                            </span>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "1px solid #1e1e1e",
                            paddingTop: "6px",
                            fontWeight: "700",
                          }}
                        >
                          <span style={{ color: "#888" }}>Total Due</span>
                          <span style={{ color: "#f0f0f0" }}>
                            {fmtR(fin.totalDue)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ color: "#666" }}>Paid</span>
                          <span style={{ color: "#10b981", fontWeight: "600" }}>
                            {fmtR(fin.totalPaid)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            background:
                              fin.balance <= 0
                                ? "rgba(16,185,129,0.08)"
                                : "rgba(239,68,68,0.08)",
                            border: `1px solid ${
                              fin.balance <= 0
                                ? "rgba(16,185,129,0.25)"
                                : "rgba(239,68,68,0.25)"
                            }`,
                            borderRadius: "7px",
                            padding: "7px 10px",
                            marginTop: "2px",
                          }}
                        >
                          <span
                            style={{
                              color: fin.balance <= 0 ? "#10b981" : "#ef4444",
                              fontWeight: "700",
                              fontSize: "13px",
                            }}
                          >
                            {fin.balance <= 0 ? "Cleared" : "Balance Due"}
                          </span>
                          <span
                            style={{
                              color: fin.balance <= 0 ? "#10b981" : "#ef4444",
                              fontWeight: "800",
                              fontSize: "14px",
                            }}
                          >
                            {fin.balance <= 0 ? fmtR(0) : fmtR(fin.balance)}
                          </span>
                        </div>
                      </div>

                      {/* Promo Code */}
                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#555",
                            fontWeight: "600",
                            flexShrink: 0,
                          }}
                        >
                          Promo:
                        </span>
                        {promoBookingId === b.id ? (
                          <>
                            <select
                              value={promoSelected}
                              onChange={(e) => setPromoSelected(e.target.value)}
                              style={{
                                background: "#1a1a1a",
                                border: "1px solid #2a2a2a",
                                borderRadius: "6px",
                                color: "#e0e0e0",
                                fontSize: "12px",
                                padding: "5px 8px",
                                flex: 1,
                                colorScheme: "dark",
                              }}
                            >
                              <option value="">— No promo —</option>
                              {promoCodes
                                .filter((p) => p.active)
                                .map((p) => (
                                  <option key={p.code} value={p.code}>
                                    {p.code} ({p.discount_percent}% off)
                                  </option>
                                ))}
                            </select>
                            <button
                              disabled={promoApplying}
                              onClick={async () => {
                                setPromoApplying(true);
                                await applyPromoToBooking(
                                  b.id,
                                  promoSelected || null
                                );
                                setPromoApplying(false);
                                setPromoBookingId(null);
                              }}
                              style={{
                                background: "rgba(0,128,128,0.15)",
                                border: "1px solid rgba(0,128,128,0.4)",
                                borderRadius: "6px",
                                color: "#33b5b5",
                                fontSize: "12px",
                                fontWeight: "700",
                                padding: "5px 10px",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              {promoApplying ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() => setPromoBookingId(null)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#555",
                                cursor: "pointer",
                                fontSize: "16px",
                                padding: "0 4px",
                              }}
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setPromoBookingId(b.id);
                              setPromoSelected(b.promo_code || "");
                            }}
                            style={{
                              background: "none",
                              border: "1px solid #2a2a2a",
                              borderRadius: "6px",
                              color: b.promo_code ? "#33b5b5" : "#555",
                              fontSize: "12px",
                              padding: "4px 10px",
                              cursor: "pointer",
                            }}
                          >
                            {b.promo_code
                              ? `${b.promo_code} (${b.promo_discount}% off)`
                              : "Apply promo"}
                          </button>
                        )}
                      </div>

                      {/* Broker Info */}
                      {b.broker_name && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "10px 12px",
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#555",
                                  fontWeight: "600",
                                  letterSpacing: "0.06em",
                                  marginBottom: "3px",
                                }}
                              >
                                BROKER
                              </p>
                              <p
                                style={{
                                  fontSize: "13px",
                                  color: "#e0e0e0",
                                  fontWeight: "600",
                                }}
                              >
                                {b.broker_name}
                              </p>
                              {b.broker_phone && (
                                <p
                                  style={{
                                    fontSize: "11px",
                                    color: "#555",
                                    marginTop: "1px",
                                  }}
                                >
                                  {b.broker_phone}
                                </p>
                              )}
                            </div>
                            {b.broker_commission > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <div style={{ textAlign: "right" }}>
                                  <p
                                    style={{
                                      fontSize: "12px",
                                      color: b.broker_commission_paid
                                        ? "#34d399"
                                        : "#f59e0b",
                                      fontWeight: "700",
                                    }}
                                  >
                                    ₹
                                    {Number(b.broker_commission).toLocaleString(
                                      "en-IN"
                                    )}{" "}
                                    commission
                                  </p>
                                  <p
                                    style={{
                                      fontSize: "10px",
                                      color: b.broker_commission_paid
                                        ? "#34d399"
                                        : "#f59e0b",
                                      marginTop: "1px",
                                    }}
                                  >
                                    {b.broker_commission_paid
                                      ? "Paid"
                                      : "Pending"}
                                  </p>
                                </div>
                                <button
                                  onClick={async () => {
                                    setBrokerPayId(b.id);
                                    await markBrokerCommissionPaid(b.id, !b.broker_commission_paid);
                                    setBrokerPayId(null);
                                  }}
                                  disabled={brokerPayId === b.id}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    background: b.broker_commission_paid
                                      ? "rgba(239,68,68,0.1)"
                                      : "rgba(16,185,129,0.1)",
                                    border: `1px solid ${
                                      b.broker_commission_paid
                                        ? "rgba(239,68,68,0.3)"
                                        : "rgba(16,185,129,0.3)"
                                    }`,
                                    color: b.broker_commission_paid
                                      ? "#ef4444"
                                      : "#34d399",
                                  }}
                                >
                                  {brokerPayId === b.id
                                    ? "..."
                                    : b.broker_commission_paid
                                    ? "Mark Unpaid"
                                    : "Mark Paid"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Payments Section ── */}
                <div
                  style={{ borderTop: "1px solid #1a1a1a", paddingTop: "14px" }}
                >
                  {/* Payment Header Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setExpandedPayments((prev) => ({
                          ...prev,
                          [b.id]: !prev[b.id],
                        }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: 0,
                      }}
                    >
                      <IndianRupee size={14} color="#33b5b5" />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#33b5b5",
                        }}
                      >
                        PAYMENTS
                      </span>
                      <span style={{ fontSize: "11px", color: "#555" }}>
                        {bPayments.length > 0
                          ? `· ${fmtMoney(paid)} received`
                          : "· No payments yet"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#333" }}>
                        {showPayments ? "▲" : "▼"}
                      </span>
                    </button>

                    <button
                      onClick={() => openPayModal(b.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 12px",
                        borderRadius: "20px",
                        background: "rgba(0,128,128,0.1)",
                        border: "1px solid rgba(0,128,128,0.3)",
                        color: "#33b5b5",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {/* Payment List */}
                  {showPayments && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {bPayments.length === 0 && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            textAlign: "center",
                            padding: "12px 0",
                          }}
                        >
                          No payments recorded yet
                        </p>
                      )}
                      {bPayments.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#1a1a1a",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    color: "#e0e0e0",
                                  }}
                                >
                                  {fmtMoney(p.amount)}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    color: TYPE_COLORS[p.type] || "#888",
                                    background: `${
                                      TYPE_COLORS[p.type] || "#888"
                                    }18`,
                                    border: `1px solid ${
                                      TYPE_COLORS[p.type] || "#888"
                                    }40`,
                                    padding: "2px 8px",
                                    borderRadius: "20px",
                                  }}
                                >
                                  {p.type}
                                </span>
                                <span
                                  style={{ fontSize: "11px", color: "#444" }}
                                >
                                  {p.method}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#444",
                                  marginTop: "3px",
                                }}
                              >
                                {fmtTime(p.paid_at)}
                                {p.note ? ` · ${p.note}` : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeletePayId(p.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#2a2a2a",
                              display: "flex",
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Total */}
                      {bPayments.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: "8px",
                            paddingTop: "4px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "#555" }}>
                            Total Received
                          </span>
                          <span
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "#10b981",
                            }}
                          >
                            {fmtMoney(paid)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Expand/Collapse toggle ── */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === b.id ? null : b.id)
                  }
                  style={{
                    background: "none",
                    border: "1px solid #1e1e1e",
                    borderRadius: "6px",
                    color: "#444",
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "5px 12px",
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  {expandedId === b.id ? "▲ Less details" : "▼ More details"}
                </button>

                {/* ── Expanded: WhatsApp Quick Actions + Guest History ── */}
                {expandedId === b.id &&
                  (() => {
                    const fin = getBookingFinancials(b);
                    const clean = (b.phone || "").replace(/\D/g, "");
                    const waPhone = "91" + clean.slice(-10);

                    const todayStr = new Date().toISOString().split("T")[0];
                    const tomorrowStr = new Date(Date.now() + 86400000)
                      .toISOString()
                      .split("T")[0];
                    const isCheckinSoon =
                      b.check_in === todayStr || b.check_in === tomorrowStr;

                    const waConfirmText = encodeURIComponent(
                      `Your booking at Luxora is confirmed! Check-in: ${fmt(
                        b.check_in
                      )}, Check-out: ${fmt(
                        b.check_out
                      )}. We look forward to hosting you!`
                    );
                    const waReminderText = encodeURIComponent(
                      `Reminder: Your check-in at Luxora is tomorrow (${fmt(
                        b.check_in
                      )}). Please be ready with your gov approved document for upload.`
                    );
                    const waBalanceText = encodeURIComponent(
                      `Hi ${b.name}, your remaining balance of ₹${fin.balance} is due at check-in. Please arrange accordingly.`
                    );

                    // Previous stays
                    const prevStays = bookings.filter(
                      (bk) => bk.phone === b.phone && bk.id !== b.id
                    );

                    return (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        {/* WhatsApp Quick Actions */}
                        <div
                          style={{
                            background: "#1a1a1a",
                            borderRadius: "10px",
                            padding: "14px 16px",
                            border: "1px solid #2a2a2a",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#444",
                              letterSpacing: "0.08em",
                              marginBottom: "10px",
                            }}
                          >
                            WHATSAPP QUICK ACTIONS
                          </p>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            {/* Confirmation */}
                            <button
                              onClick={() =>
                                window.open(
                                  `https://wa.me/${waPhone}?text=${waConfirmText}`,
                                  "_blank"
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "7px 12px",
                                background: "rgba(37,211,102,0.1)",
                                border: "1px solid rgba(37,211,102,0.3)",
                                borderRadius: "8px",
                                color: "#25d366",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                              title="Send booking confirmation on WhatsApp"
                            >
                              <MessageCircle size={13} /> Confirmation
                            </button>

                            {/* Check-in Reminder — only if check-in is today or tomorrow */}
                            {isCheckinSoon && (
                              <button
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${waPhone}?text=${waReminderText}`,
                                    "_blank"
                                  )
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  background: "rgba(245,158,11,0.1)",
                                  border: "1px solid rgba(245,158,11,0.3)",
                                  borderRadius: "8px",
                                  color: "#f59e0b",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                                title="Send check-in reminder on WhatsApp"
                              >
                                <MessageCircle size={13} /> Check-in Reminder
                              </button>
                            )}

                            {/* Balance Due — only if balance > 0 */}
                            {fin.balance > 0 && (
                              <button
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${waPhone}?text=${waBalanceText}`,
                                    "_blank"
                                  )
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  background: "rgba(239,68,68,0.1)",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  borderRadius: "8px",
                                  color: "#ef4444",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                                title={`Send balance due reminder: ₹${fin.balance}`}
                              >
                                <MessageCircle size={13} /> Balance Due ₹
                                {fin.balance.toLocaleString("en-IN")}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Previous Stays */}
                        <div
                          style={{
                            background: "#1a1a1a",
                            borderRadius: "10px",
                            padding: "14px 16px",
                            border: "1px solid #2a2a2a",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#444",
                              letterSpacing: "0.08em",
                              marginBottom: "10px",
                            }}
                          >
                            PREVIOUS STAYS
                            <span
                              style={{
                                marginLeft: "6px",
                                color:
                                  prevStays.length > 0 ? "#33b5b5" : "#333",
                                fontWeight: "400",
                              }}
                            >
                              · {prevStays.length} visit
                              {prevStays.length !== 1 ? "s" : ""}
                            </span>
                          </p>
                          {prevStays.length === 0 ? (
                            <p style={{ fontSize: "13px", color: "#333" }}>
                              First-time guest
                            </p>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              {prevStays.slice(0, 3).map((ps) => {
                                const psFin = getBookingFinancials(ps);
                                const psColor =
                                  STATUS_COLORS[ps.status] ||
                                  STATUS_COLORS.pending;
                                return (
                                  <div
                                    key={ps.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "8px 12px",
                                      background: "#111",
                                      borderRadius: "8px",
                                      border: "1px solid #1e1e1e",
                                    }}
                                  >
                                    <div>
                                      <p
                                        style={{
                                          fontSize: "12px",
                                          color: "#e0e0e0",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {fmt(ps.check_in)} → {fmt(ps.check_out)}
                                      </p>
                                      <p
                                        style={{
                                          fontSize: "11px",
                                          color: "#555",
                                          marginTop: "2px",
                                        }}
                                      >
                                        {Math.max(
                                          0,
                                          Math.round(
                                            (new Date(ps.check_out) -
                                              new Date(ps.check_in)) /
                                              86400000
                                          )
                                        )}{" "}
                                        nights
                                      </p>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <p
                                        style={{
                                          fontSize: "12px",
                                          color: "#10b981",
                                          fontWeight: "600",
                                        }}
                                      >
                                        {fmtR(psFin.totalPaid)} paid
                                      </p>
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: "600",
                                          color: psColor.color,
                                        }}
                                      >
                                        {ps.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {prevStays.length > 3 && (
                                <p
                                  style={{
                                    fontSize: "11px",
                                    color: "#444",
                                    textAlign: "center",
                                    paddingTop: "4px",
                                  }}
                                >
                                  +{prevStays.length - 3} more stay
                                  {prevStays.length - 3 !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                <p style={{ fontSize: "11px", color: "#333" }}>
                  Submitted {new Date(b.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })}

      {/* ── Create Booking Modal ── */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              overflow: "hidden",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
                flexShrink: 0,
              }}
            >
              <div>
                <p
                  style={{
                    fontWeight: "700",
                    color: "#f0f0f0",
                    fontSize: "16px",
                  }}
                >
                  Create Booking
                </p>
                <p
                  style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}
                >
                  Walk-in or direct booking
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                  setCreateAddons([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                overflowY: "auto",
              }}
            >
              {/* Name + Phone */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Guest Name *
                  </p>
                  <input
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="Full name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Phone *
                  </p>
                  <input
                    value={createForm.phone}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, phone: e.target.value });
                      setCreateError("");
                    }}
                    placeholder="+91 00000 00000"
                    style={inputStyle}
                  />
                  {createError === "Phone must be 10 digits." && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#ef4444",
                        marginTop: "4px",
                      }}
                    >
                      Phone must be 10 digits.
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Email
                </p>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="guest@email.com"
                  style={inputStyle}
                />
              </div>

              {/* Check-in / Check-out */}
              {(() => {
                const today = new Date().toISOString().split("T")[0];
                const minCheckout = createForm.check_in
                  ? new Date(new Date(createForm.check_in).getTime() + 86400000)
                      .toISOString()
                      .split("T")[0]
                  : today;
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          marginBottom: "5px",
                          fontWeight: "500",
                        }}
                      >
                        Check-in *
                      </p>
                      <input
                        type="date"
                        value={createForm.check_in}
                        min={today}
                        onChange={(e) => {
                          const ci = e.target.value;
                          const minCo = new Date(
                            new Date(ci).getTime() + 86400000
                          )
                            .toISOString()
                            .split("T")[0];
                          setCreateForm((f) => ({
                            ...f,
                            check_in: ci,
                            check_out: f.check_out < minCo ? "" : f.check_out,
                          }));
                        }}
                        style={{ ...inputStyle, colorScheme: "dark" }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          marginBottom: "5px",
                          fontWeight: "500",
                        }}
                      >
                        Check-out *
                      </p>
                      <input
                        type="date"
                        value={createForm.check_out}
                        min={minCheckout}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            check_out: e.target.value,
                          })
                        }
                        style={{ ...inputStyle, colorScheme: "dark" }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Guests + Status */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Guests
                  </p>
                  <select
                    value={createForm.guests_count}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        guests_count: Number(e.target.value),
                      })
                    }
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                  </select>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Status
                  </p>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      cursor: "pointer",
                      color:
                        STATUS_COLORS[createForm.status]?.color || "#e0e0e0",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Notes
                </p>
                <textarea
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Any special requests or notes..."
                  style={{ ...inputStyle, resize: "vertical", height: "72px" }}
                />
              </div>

              {/* Custom Room Price */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!createForm.useCustomPrice}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        useCustomPrice: e.target.checked,
                        custom_room_price: "",
                      })
                    }
                    style={{
                      width: "15px",
                      height: "15px",
                      accentColor: "#008080",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#ccc",
                      fontWeight: "500",
                    }}
                  >
                    Custom room price
                  </span>
                </label>
                {createForm.useCustomPrice && (
                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          marginBottom: "5px",
                          fontWeight: "500",
                        }}
                      >
                        Price per night (₹) *
                      </p>
                      <input
                        type="number"
                        value={createForm.custom_room_price || ""}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            custom_room_price: e.target.value,
                          })
                        }
                        placeholder="e.g. 2000"
                        style={inputStyle}
                      />
                    </div>
                    {/* Broker Details (optional) */}
                    <div
                      style={{
                        borderTop: "1px solid #222",
                        paddingTop: "10px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          fontWeight: "600",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                        }}
                      >
                        BROKER DETAILS{" "}
                        <span style={{ color: "#444", fontWeight: "400" }}>
                          (optional)
                        </span>
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#555",
                                marginBottom: "5px",
                                fontWeight: "500",
                              }}
                            >
                              Broker Name
                            </p>
                            <input
                              value={createForm.broker_name || ""}
                              onChange={(e) =>
                                setCreateForm({
                                  ...createForm,
                                  broker_name: e.target.value,
                                })
                              }
                              placeholder="Name"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#555",
                                marginBottom: "5px",
                                fontWeight: "500",
                              }}
                            >
                              Broker Phone
                            </p>
                            <input
                              value={createForm.broker_phone || ""}
                              onChange={(e) =>
                                setCreateForm({
                                  ...createForm,
                                  broker_phone: e.target.value,
                                })
                              }
                              placeholder="Phone"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                        {(createForm.broker_name ||
                          createForm.broker_phone) && (
                          <div>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#555",
                                marginBottom: "5px",
                                fontWeight: "500",
                              }}
                            >
                              Commission
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <select
                                value={createForm.commissionType || "fixed"}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    commissionType: e.target.value,
                                    broker_commission: "",
                                  })
                                }
                                style={{
                                  ...inputStyle,
                                  width: "auto",
                                  flexShrink: 0,
                                }}
                              >
                                <option value="fixed">₹ Fixed</option>
                                <option value="percent">% of room</option>
                              </select>
                              <input
                                type="number"
                                value={createForm.broker_commission || ""}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    broker_commission: e.target.value,
                                  })
                                }
                                placeholder={
                                  createForm.commissionType === "percent"
                                    ? "e.g. 10"
                                    : "e.g. 200"
                                }
                                style={inputStyle}
                              />
                              {createForm.commissionType === "percent" &&
                                createForm.broker_commission &&
                                createForm.custom_room_price && (
                                  <span
                                    style={{
                                      fontSize: "12px",
                                      color: "#33b5b5",
                                      flexShrink: 0,
                                    }}
                                  >
                                    = ₹
                                    {Math.round(
                                      (Number(createForm.custom_room_price) *
                                        Number(createForm.broker_commission)) /
                                        100
                                    ).toLocaleString("en-IN")}
                                  </span>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add-ons */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      fontWeight: "600",
                      letterSpacing: "0.06em",
                    }}
                  >
                    ADD-ONS
                  </p>
                  {createAddons.length > 0 && (
                    <span style={{ fontSize: "11px", color: "#33b5b5" }}>
                      {createAddons.length} selected · ₹
                      {createAddons
                        .reduce((s, a) => s + (a.price || 0), 0)
                        .toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {ALL_ADDONS.map((addon) => {
                    const active = createAddons.some((a) => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => {
                          setCreateAddons((prev) =>
                            active
                              ? prev.filter((a) => a.id !== addon.id)
                              : [
                                  ...prev,
                                  {
                                    id: addon.id,
                                    label: addon.label,
                                    price: addon.price,
                                  },
                                ]
                          );
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: active
                            ? "rgba(0,128,128,0.08)"
                            : "#1a1a1a",
                          border: `1px solid ${
                            active ? "rgba(0,128,128,0.4)" : "#2a2a2a"
                          }`,
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "15px" }}>{addon.icon}</span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: active ? "#e0e0e0" : "#666",
                            }}
                          >
                            {addon.label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#33b5b5" }}>
                            ₹{addon.price.toLocaleString("en-IN")}
                          </span>
                          <div
                            style={{
                              width: "15px",
                              height: "15px",
                              borderRadius: "4px",
                              background: active ? "#008080" : "transparent",
                              border: `1.5px solid ${
                                active ? "#008080" : "#333"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {active && (
                              <span
                                style={{
                                  color: "#fff",
                                  fontSize: "9px",
                                  fontWeight: "900",
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {createError && createError !== "Phone must be 10 digits." && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#ef4444",
                    padding: "8px 12px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "8px",
                  }}
                >
                  {createError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "16px 20px",
                borderTop: "1px solid #1e1e1e",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                  setCreateAddons([]);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createSaving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "linear-gradient(135deg, #008080, #00a0a0)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {createSaving ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Booking Modal ── */}
      {editId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Edit Booking
              </p>
              <button
                onClick={() => setEditId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              {[
                { label: "Name", key: "name", type: "text" },
                { label: "Phone", key: "phone", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Check-in", key: "check_in", type: "date" },
                { label: "Check-out", key: "check_out", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    {label}
                  </p>
                  <input
                    type={type}
                    value={editForm[key]}
                    onChange={(e) =>
                      setEditForm({ ...editForm, [key]: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              ))}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Guests (max 3)
                </p>
                <select
                  value={editForm.guests_count}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      guests_count: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                </select>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Notes
                </p>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    height: "72px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {/* Custom Room Price + Broker */}
              <div
                style={{ borderTop: "1px solid #1e1e1e", paddingTop: "14px" }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!editForm.useCustomPrice}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          useCustomPrice: e.target.checked,
                          custom_room_price: "",
                          broker_name: "",
                          broker_phone: "",
                          broker_commission: "",
                          commissionType: "fixed",
                        })
                      }
                      style={{
                        width: "15px",
                        height: "15px",
                        accentColor: "#008080",
                        cursor: "pointer",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#ccc",
                        fontWeight: "500",
                      }}
                    >
                      Custom room price (broker deal)
                    </span>
                  </label>
                  {editForm.useCustomPrice && (
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#555",
                            marginBottom: "5px",
                            fontWeight: "500",
                          }}
                        >
                          Price per night (₹) *
                        </p>
                        <input
                          type="number"
                          value={editForm.custom_room_price || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              custom_room_price: e.target.value,
                            })
                          }
                          placeholder="e.g. 2000"
                          style={{
                            width: "100%",
                            background: "#141414",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            padding: "9px 12px",
                            color: "#e0e0e0",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      {/* Broker Details */}
                      <div
                        style={{
                          borderTop: "1px solid #222",
                          paddingTop: "10px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#555",
                            fontWeight: "600",
                            letterSpacing: "0.06em",
                            marginBottom: "8px",
                          }}
                        >
                          BROKER DETAILS{" "}
                          <span style={{ color: "#444", fontWeight: "400" }}>
                            (optional)
                          </span>
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#555",
                                  marginBottom: "5px",
                                  fontWeight: "500",
                                }}
                              >
                                Broker Name
                              </p>
                              <input
                                value={editForm.broker_name}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    broker_name: e.target.value,
                                  })
                                }
                                placeholder="e.g. Ravi Sharma"
                                style={{
                                  width: "100%",
                                  background: "#141414",
                                  border: "1px solid #2a2a2a",
                                  borderRadius: "8px",
                                  padding: "9px 12px",
                                  color: "#e0e0e0",
                                  fontSize: "14px",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                            <div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#555",
                                  marginBottom: "5px",
                                  fontWeight: "500",
                                }}
                              >
                                Broker Phone
                              </p>
                              <input
                                value={editForm.broker_phone}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    broker_phone: e.target.value,
                                  })
                                }
                                placeholder="+91 00000 00000"
                                style={{
                                  width: "100%",
                                  background: "#141414",
                                  border: "1px solid #2a2a2a",
                                  borderRadius: "8px",
                                  padding: "9px 12px",
                                  color: "#e0e0e0",
                                  fontSize: "14px",
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                              {editForm.broker_phone &&
                                editForm.broker_phone.replace(/\D/g, "")
                                  .length > 0 &&
                                editForm.broker_phone.replace(/\D/g, "")
                                  .length !== 10 && (
                                  <p
                                    style={{
                                      fontSize: "11px",
                                      color: "#ef4444",
                                      marginTop: "4px",
                                    }}
                                  >
                                    Phone must be 10 digits.
                                  </p>
                                )}
                            </div>
                          </div>
                          {(editForm.broker_name || editForm.broker_phone) && (
                            <div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#555",
                                  marginBottom: "5px",
                                  fontWeight: "500",
                                }}
                              >
                                Commission
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <select
                                  value={editForm.commissionType}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      commissionType: e.target.value,
                                      broker_commission: "",
                                    })
                                  }
                                  style={{
                                    background: "#141414",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    padding: "9px 10px",
                                    color: "#e0e0e0",
                                    fontSize: "13px",
                                    outline: "none",
                                    flexShrink: 0,
                                  }}
                                >
                                  <option value="fixed">₹ Fixed</option>
                                  <option value="percent">% of room</option>
                                </select>
                                <input
                                  type="number"
                                  value={editForm.broker_commission}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      broker_commission: e.target.value,
                                    })
                                  }
                                  placeholder={
                                    editForm.commissionType === "percent"
                                      ? "e.g. 10"
                                      : "e.g. 500"
                                  }
                                  style={{
                                    flex: 1,
                                    background: "#141414",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "8px",
                                    padding: "9px 12px",
                                    color: "#e0e0e0",
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                                {editForm.commissionType === "percent" &&
                                  editForm.broker_commission &&
                                  editForm.custom_room_price && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#33b5b5",
                                        flexShrink: 0,
                                      }}
                                    >
                                      = ₹
                                      {Math.round(
                                        (Number(editForm.custom_room_price) *
                                          Number(editForm.broker_commission)) /
                                          100
                                      ).toLocaleString("en-IN")}
                                    </span>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}
            >
              <button
                onClick={() => setEditId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(0,128,128,0.2)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ── */}
      {payModalId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Add Payment
              </p>
              <button
                onClick={() => setPayModalId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Amount */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Amount (₹) *
                </p>
                <input
                  type="number"
                  placeholder="0"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {/* Method + Type */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Method
                  </p>
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, method: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Type
                  </p>
                  <select
                    value={payForm.type}
                    onChange={(e) =>
                      setPayForm({ ...payForm, type: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: TYPE_COLORS[payForm.type] || "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Note */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Note (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Advance via Google Pay"
                  value={payForm.note}
                  onChange={(e) =>
                    setPayForm({ ...payForm, note: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div
              style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}
            >
              <button
                onClick={() => setPayModalId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePayment}
                disabled={payingSaving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(0,128,128,0.2)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {payingSaving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Booking Confirm ── */}
      {deleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "380px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>🗑️</div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              Delete Booking?
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              This booking and all its payments will be permanently deleted.
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Add-ons Modal ── */}
      {addonModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              overflow: "hidden",
              margin: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Edit Add-ons
              </p>
              <button
                onClick={() => setAddonModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                maxHeight: "70vh",
                overflowY: "auto",
              }}
            >
              {/* Predefined list */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#444",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                  }}
                >
                  SELECT ADD-ONS
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {ALL_ADDONS.map((addon) => {
                    const active = addonModal.addons.some(
                      (a) => a.id === addon.id
                    );
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: active
                            ? "rgba(0,128,128,0.08)"
                            : "#1a1a1a",
                          border: `1px solid ${
                            active ? "rgba(0,128,128,0.4)" : "#2a2a2a"
                          }`,
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>{addon.icon}</span>
                          <span
                            style={{
                              fontSize: "13px",
                              color: active ? "#e0e0e0" : "#666",
                            }}
                          >
                            {addon.label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "#33b5b5" }}>
                            ₹{addon.price.toLocaleString("en-IN")}
                          </span>
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "4px",
                              background: active ? "#008080" : "transparent",
                              border: `1.5px solid ${
                                active ? "#008080" : "#333"
                              }`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {active && (
                              <span
                                style={{
                                  color: "#fff",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom add-on */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#444",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                  }}
                >
                  ADD CUSTOM
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    placeholder="Add-on name"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    style={{
                      flex: 2,
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "#e0e0e0",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <input
                    placeholder="₹ Price"
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{
                      flex: 1,
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "#e0e0e0",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={addCustomAddon}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(0,128,128,0.15)",
                      border: "1px solid rgba(0,128,128,0.3)",
                      borderRadius: "8px",
                      color: "#33b5b5",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Current selected list */}
              {addonModal.addons.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#444",
                      fontWeight: "600",
                      letterSpacing: "0.08em",
                      marginBottom: "10px",
                    }}
                  >
                    SELECTED · {addonModal.addons.length} · Est. ₹
                    {addonModal.addons
                      .reduce((s, a) => s + (a.price || 0), 0)
                      .toLocaleString("en-IN")}
                  </p>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {addonModal.addons.map((a) => (
                      <span
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          color: "#33b5b5",
                          background: "rgba(0,128,128,0.1)",
                          border: "1px solid rgba(0,128,128,0.3)",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        {a.label} · ₹{(a.price || 0).toLocaleString("en-IN")}
                        <span
                          onClick={() => removeAddon(a.id)}
                          style={{
                            cursor: "pointer",
                            color: "#555",
                            fontSize: "12px",
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "16px 20px",
                borderTop: "1px solid #1e1e1e",
              }}
            >
              <button
                onClick={() => setAddonModal(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveAddons}
                disabled={addonSaving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(0,128,128,0.2)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {addonSaving ? "Saving..." : "Save Add-ons"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Docs Modal ── */}
      {docsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Guest Documents
              </p>
              <button
                onClick={() => setDocsModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Guest tabs — only show if multiple guests */}
            {docsModal.guests.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "12px 20px 0",
                  overflowX: "auto",
                }}
              >
                {docsModal.guests.map((g, i) => {
                  const isActive = docsModal.activeGuest === i;
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setDocsModal((prev) => ({ ...prev, activeGuest: i }))
                      }
                      style={{
                        flex: "0 0 auto",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: isActive
                          ? "1px solid rgba(0,128,128,0.6)"
                          : "1px solid #2a2a2a",
                        background: isActive
                          ? "rgba(0,128,128,0.15)"
                          : "#1a1a1a",
                        color: isActive ? "#33b5b5" : "#555",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Guest {i + 1}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Hidden file inputs */}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files[0])
                    handleDocReplace("front", e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={backInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files[0])
                    handleDocReplace("back", e.target.files[0]);
                  e.target.value = "";
                }}
              />

              {["front", "back"].map((side) => {
                const currentGuest =
                  docsModal.guests[docsModal.activeGuest] ?? {};
                const url = currentGuest[side];
                const op = docOps[side];
                const inputRef =
                  side === "front" ? frontInputRef : backInputRef;
                return (
                  <div key={side}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          fontWeight: "600",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {side === "front" ? "FRONT SIDE" : "BACK SIDE"}
                      </p>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => inputRef.current?.click()}
                          disabled={!!op}
                          title="Replace"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            background: "rgba(0,128,128,0.1)",
                            border: "1px solid rgba(0,128,128,0.3)",
                            borderRadius: "6px",
                            color: "#33b5b5",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            opacity: op ? 0.5 : 1,
                          }}
                        >
                          <RefreshCw size={11} />
                          {op === "uploading" ? "Uploading..." : "Replace"}
                        </button>
                        <button
                          onClick={() => handleDocDelete(side)}
                          disabled={!!op || !url}
                          title="Delete"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: "6px",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            opacity: op || !url ? 0.4 : 1,
                          }}
                        >
                          <Trash2 size={11} />
                          {op === "deleting" ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={`Document ${side}`}
                          style={{
                            width: "100%",
                            borderRadius: "8px",
                            border: "1px solid #2a2a2a",
                            objectFit: "contain",
                            maxHeight: "200px",
                            background: "#1a1a1a",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "#33b5b5",
                            marginTop: "6px",
                          }}
                        >
                          Open full image ↗
                        </a>
                      </>
                    ) : (
                      <div
                        style={{
                          background: "#1a1a1a",
                          border: "1px dashed #2a2a2a",
                          borderRadius: "8px",
                          padding: "32px",
                          textAlign: "center",
                          color: "#444",
                          fontSize: "13px",
                        }}
                      >
                        No image — deleted or not uploaded
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Check-in / Check-out Confirm ── */}
      {statusConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "380px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background:
                    statusConfirm.status === "checked-in"
                      ? "#10b981"
                      : "#ef4444",
                  display: "inline-block",
                }}
              />
            </div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              {statusConfirm.status === "checked-in"
                ? "Check-in Confirm?"
                : "Check-out Confirm?"}
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              Are you sure you want to{" "}
              {statusConfirm.status === "checked-in" ? "check-in" : "check-out"}{" "}
              <strong style={{ color: "#e0e0e0" }}>{statusConfirm.name}</strong>
              ? The exact time will be saved.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setStatusConfirm(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateBookingStatus(
                    statusConfirm.bookingId,
                    statusConfirm.status
                  );
                  setStatusConfirm(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background:
                    statusConfirm.status === "checked-in"
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(85,85,85,0.15)",
                  border:
                    statusConfirm.status === "checked-in"
                      ? "1px solid rgba(16,185,129,0.4)"
                      : "1px solid rgba(85,85,85,0.4)",
                  color:
                    statusConfirm.status === "checked-in" ? "#10b981" : "#888",
                }}
              >
                {statusConfirm.status === "checked-in"
                  ? "Check-in"
                  : "Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Payment Confirm ── */}
      {deletePayId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "360px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>💸</div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              Delete Payment?
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              This payment entry will be permanently deleted. This cannot be
              undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeletePayId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePayment}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
