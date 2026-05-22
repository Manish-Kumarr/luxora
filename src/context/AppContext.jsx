import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todos, setTodos] = useState([]);
  const [todosLoading, setTodosLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [roomRates, setRoomRates] = useState({ weekday_rate: 1699, weekend_rate: 1899 });
  const [promoCodes, setPromoCodes] = useState([]);
  const [phonePromos, setPhonePromos] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [memberTransfers, setMemberTransfers] = useState([]);
  const [ownerPayouts, setOwnerPayouts] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOwners();
      fetchExpenses();
      fetchTodos();
      fetchBookings();
      fetchPayments();
      fetchRoomRates();
      fetchPromoCodes();
      fetchPhonePromos();
      fetchMemberTransfers();
      fetchOwnerPayouts();
    } else {
      setExpenses([]);
      setTodos([]);
      setBookings([]);
      setPayments([]);
      setOwners([]);
      setMemberTransfers([]);
      setOwnerPayouts([]);
    }
  }, [user]);

  // ── Owners ──────────────────────────────────────────
  const fetchOwners = async () => {
    setOwnersLoading(true);
    const { data, error } = await supabase
      .from("owners")
      .select("*")
      .order("display_order", { ascending: true });
    if (!error && data) setOwners(data);
    setOwnersLoading(false);
  };

  const addOwner = async (ownerData) => {
    const { data, error } = await supabase
      .from("owners")
      .insert([ownerData])
      .select()
      .single();
    if (!error && data) setOwners((prev) => [...prev, data].sort((a, b) => a.display_order - b.display_order));
    return { data, error };
  };

  const updateOwner = async (id, ownerData) => {
    const { data, error } = await supabase
      .from("owners")
      .update(ownerData)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setOwners((prev) => prev.map((o) => (o.id === id ? data : o)));
    return { data, error };
  };

  const deleteOwner = async (id) => {
    const { error } = await supabase.from("owners").delete().eq("id", id);
    if (!error) setOwners((prev) => prev.filter((o) => o.id !== id));
    return { error };
  };

  // ── Expenses ─────────────────────────────────────────
  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (!error && data) setExpenses(data.map(mapFromDB));
    setLoading(false);
  };

  const addExpense = async (expense) => {
    const { data, error } = await supabase
      .from("expenses")
      .insert([mapToDB(expense)])
      .select()
      .single();
    if (!error && data) setExpenses((prev) => [mapFromDB(data), ...prev]);
    return { error };
  };

  const updateExpense = async (id, updated) => {
    const { data, error } = await supabase
      .from("expenses")
      .update(mapToDB(updated))
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setExpenses((prev) => prev.map((e) => (e.id === id ? mapFromDB(data) : e)));
    return { error };
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) setExpenses((prev) => prev.filter((e) => e.id !== id));
    return { error };
  };

  // ── Todos ────────────────────────────────────────────
  const fetchTodos = async () => {
    setTodosLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTodos(data);
    setTodosLoading(false);
  };

  const addTodo = async (text, priority) => {
    const { data, error } = await supabase
      .from("todos")
      .insert([{ text, priority, done: false }])
      .select()
      .single();
    if (!error && data) setTodos((prev) => [data, ...prev]);
    return { error };
  };

  const toggleTodo = async (id, done) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ done })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
    return { error };
  };

  const updateTodo = async (id, text, priority) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ text, priority })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
    return { error };
  };

  const deleteTodo = async (id) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (!error) setTodos((prev) => prev.filter((t) => t.id !== id));
    return { error };
  };

  // ── Bookings ─────────────────────────────────────────
  const fetchBookings = async () => {
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from("guest_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("fetchBookings error:", error);
    if (data) setBookings(data);
    setBookingsLoading(false);
  };

  const addBooking = async (fields) => {
    const { data, error } = await supabase
      .from("guest_bookings")
      .insert([{ ...fields, status: fields.status || "confirmed" }])
      .select()
      .single();
    if (!error && data) setBookings((prev) => [data, ...prev]);
    return { data, error };
  };

  const updateBooking = async (id, fields) => {
    const { data, error } = await supabase
      .from("guest_bookings")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setBookings((prev) => prev.map((b) => (b.id === id ? data : b)));
    return { error };
  };

  const deleteBooking = async (id) => {
    const { error } = await supabase.from("guest_bookings").delete().eq("id", id);
    if (!error) setBookings((prev) => prev.filter((b) => b.id !== id));
    return { error };
  };

  const markBrokerCommissionPaid = async (id, paid) => {
    return updateBooking(id, {
      broker_commission_paid: paid,
      broker_commission_paid_at: paid ? new Date().toISOString() : null,
    });
  };

  const updateBookingStatus = async (id, status) => {
    const update = { status };
    if (status === "checked-in") update.checked_in_at = new Date().toISOString();
    if (status === "checked-out") update.checked_out_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("guest_bookings")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setBookings((prev) => prev.map((b) => (b.id === id ? data : b)));
    return { error };
  };

  const getDocUrls = (bookingId, guestsCount = 1) => {
    const base = (name) =>
      supabase.storage.from("documents").getPublicUrl(`${bookingId}/${name}`).data.publicUrl;
    const count = Math.max(1, Number(guestsCount) || 1);
    const guests = Array.from({ length: count }, (_, i) => ({
      front: base(`guest_${i + 1}_doc_front`),
      back: base(`guest_${i + 1}_doc_back`),
    }));
    return { guests };
  };

  // ── Payments ─────────────────────────────────────────
  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("paid_at", { ascending: false });
    if (!error && data) setPayments(data);
  };

  const addPayment = async (booking_id, amount, method, type, note) => {
    const { data, error } = await supabase
      .from("payments")
      .insert([{ booking_id, amount: Number(amount), method, type, note }])
      .select()
      .single();
    if (!error && data) setPayments((prev) => [data, ...prev]);
    return { error };
  };

  const deletePayment = async (id) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (!error) setPayments((prev) => prev.filter((p) => p.id !== id));
    return { error };
  };

  // ── Room Rates ───────────────────────────────────────
  const fetchRoomRates = async () => {
    const { data, error } = await supabase.from("room_rates").select("*").eq("id", 1).single();
    if (!error && data) setRoomRates(data);
  };

  const updateRoomRates = async (weekday_rate, weekend_rate) => {
    const { data, error } = await supabase
      .from("room_rates")
      .update({ weekday_rate: Number(weekday_rate), weekend_rate: Number(weekend_rate) })
      .eq("id", 1)
      .select()
      .single();
    if (!error && data) setRoomRates(data);
    return { error };
  };

  // ── Promo Codes ──────────────────────────────────────
  const fetchPromoCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("discount_percent");
    if (data) setPromoCodes(data);
  };

  const addPromoCode = async (code, discount_percent) => {
    const { data, error } = await supabase
      .from("promo_codes")
      .insert([{ code: code.toUpperCase().trim(), discount_percent: Number(discount_percent), active: true }])
      .select().single();
    if (!error && data) setPromoCodes((prev) => [...prev, data].sort((a, b) => a.discount_percent - b.discount_percent));
    return { error };
  };

  const updatePromoCode = async (code, discount_percent) => {
    const { data, error } = await supabase
      .from("promo_codes")
      .update({ discount_percent: Number(discount_percent) })
      .eq("code", code)
      .select().single();
    if (!error && data) setPromoCodes((prev) => prev.map((p) => (p.code === code ? data : p)));
    return { error };
  };

  const togglePromoCode = async (code, active) => {
    const { data, error } = await supabase
      .from("promo_codes")
      .update({ active })
      .eq("code", code)
      .select().single();
    if (!error && data) setPromoCodes((prev) => prev.map((p) => (p.code === code ? data : p)));
    return { error };
  };

  const deletePromoCode = async (code) => {
    const { error } = await supabase.from("promo_codes").delete().eq("code", code);
    if (!error) setPromoCodes((prev) => prev.filter((p) => p.code !== code));
    return { error };
  };

  // ── Phone Promos ─────────────────────────────────────
  const fetchPhonePromos = async () => {
    const { data } = await supabase.from("phone_promos").select("*").order("created_at", { ascending: false });
    if (data) setPhonePromos(data);
  };

  const assignPhonePromo = async (phone, promoCode) => {
    const { data, error } = await supabase
      .from("phone_promos")
      .upsert([{ phone, promo_code: promoCode, claimed: false }], { onConflict: "phone" })
      .select().single();
    if (!error && data) {
      setPhonePromos((prev) => {
        const exists = prev.find((p) => p.phone === phone);
        return exists ? prev.map((p) => (p.phone === phone ? data : p)) : [data, ...prev];
      });
    }
    return { error };
  };

  const removePhonePromo = async (id) => {
    const { error } = await supabase.from("phone_promos").delete().eq("id", id);
    if (!error) setPhonePromos((prev) => prev.filter((p) => p.id !== id));
    return { error };
  };

  const applyPromoToBooking = async (bookingId, promoCode) => {
    const promo = promoCodes.find((p) => p.code === promoCode);
    const updates = promo
      ? { promo_code: promo.code, promo_discount: promo.discount_percent }
      : { promo_code: null, promo_discount: 0 };
    return updateBooking(bookingId, updates);
  };

  // ── Member Transfers ─────────────────────────────────
  const fetchMemberTransfers = async () => {
    const { data, error } = await supabase
      .from("member_transfers")
      .select("*")
      .order("date", { ascending: false });
    if (!error && data) setMemberTransfers(data);
  };

  const addMemberTransfer = async (transfer) => {
    const { data, error } = await supabase
      .from("member_transfers")
      .insert([transfer])
      .select()
      .single();
    if (!error && data) setMemberTransfers((prev) => [data, ...prev]);
    return { data, error };
  };

  const updateMemberTransfer = async (id, transfer) => {
    const { data, error } = await supabase
      .from("member_transfers")
      .update(transfer)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setMemberTransfers((prev) => prev.map((t) => (t.id === id ? data : t)));
    return { data, error };
  };

  const deleteMemberTransfer = async (id) => {
    const { error } = await supabase.from("member_transfers").delete().eq("id", id);
    if (!error) setMemberTransfers((prev) => prev.filter((t) => t.id !== id));
    return { error };
  };

  // ── Owner Payouts ────────────────────────────────────
  const fetchOwnerPayouts = async () => {
    const { data, error } = await supabase
      .from("owner_payouts")
      .select("*")
      .order("date", { ascending: false });
    if (!error && data) setOwnerPayouts(data);
  };

  const addOwnerPayout = async (payout) => {
    const { data, error } = await supabase
      .from("owner_payouts")
      .insert([payout])
      .select()
      .single();
    if (!error && data) setOwnerPayouts((prev) => [data, ...prev]);
    return { data, error };
  };

  const updateOwnerPayout = async (id, updates) => {
    const { data, error } = await supabase.from("owner_payouts").update(updates).eq("id", id).select().single();
    if (!error && data) setOwnerPayouts((prev) => prev.map((p) => (p.id === id ? data : p)));
    return { error };
  };

  const deleteOwnerPayout = async (id) => {
    const { error } = await supabase.from("owner_payouts").delete().eq("id", id);
    if (!error) setOwnerPayouts((prev) => prev.filter((p) => p.id !== id));
    return { error };
  };

  // ── Auth ─────────────────────────────────────────────
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setExpenses([]);
    setOwners([]);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        authLoading,
        login,
        logout,
        // owners
        owners,
        ownersLoading,
        addOwner,
        updateOwner,
        deleteOwner,
        // expenses
        expenses,
        loading,
        addExpense,
        updateExpense,
        deleteExpense,
        // todos
        todos,
        todosLoading,
        addTodo,
        toggleTodo,
        updateTodo,
        deleteTodo,
        // bookings
        bookings,
        bookingsLoading,
        addBooking,
        updateBookingStatus,
        updateBooking,
        deleteBooking,
        markBrokerCommissionPaid,
        getDocUrls,
        // payments
        payments,
        addPayment,
        deletePayment,
        // room rates
        roomRates,
        updateRoomRates,
        // promo codes
        promoCodes,
        addPromoCode,
        updatePromoCode,
        togglePromoCode,
        deletePromoCode,
        applyPromoToBooking,
        // phone promos
        phonePromos,
        assignPhonePromo,
        removePhonePromo,
        // member transfers
        memberTransfers,
        addMemberTransfer,
        updateMemberTransfer,
        deleteMemberTransfer,
        // owner payouts
        ownerPayouts,
        addOwnerPayout,
        updateOwnerPayout,
        deleteOwnerPayout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

function mapFromDB(row) {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    totalAmount: row.total_amount,
    paid_amounts: row.paid_amounts || {},
    status: row.status,
    notes: row.notes,
    room: row.room || "",
    issue_priority: row.issue_priority || "medium",
    maintenance_status: row.maintenance_status || "open",
  };
}

function mapToDB(exp) {
  return {
    date: exp.date,
    category: exp.category,
    description: exp.description,
    total_amount: Number(exp.totalAmount) || 0,
    paid_amounts: exp.paid_amounts || {},
    status: exp.status,
    notes: exp.notes || "",
    room: exp.room || null,
    issue_priority: exp.issue_priority || null,
    maintenance_status: exp.maintenance_status || null,
  };
}
