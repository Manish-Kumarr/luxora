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


  // Check existing session on mount
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
      fetchExpenses();
      fetchTodos();
      fetchBookings();
      fetchPayments();
    } else {
      setExpenses([]);
      setTodos([]);
      setBookings([]);
      setPayments([]);
    }
  }, [user]);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (!error && data) setExpenses(data.map(mapFromDB));
    setLoading(false);
  };

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

  const fetchBookings = async () => {
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from("guest_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    console.log("fetchBookings →", { data, error });
    if (error) console.error("fetchBookings error:", error);
    if (data) setBookings(data);
    setBookingsLoading(false);
  };

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

  const getDocUrls = (bookingId) => {
    const base = (name) => supabase.storage.from("documents").getPublicUrl(`${bookingId}/${name}`).data.publicUrl;
    return { front: base("aadhaar_front"), back: base("aadhaar_back") };
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

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setExpenses([]);
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

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        authLoading,
        login,
        logout,
        expenses,
        loading,
        addExpense,
        updateExpense,
        deleteExpense,
        todos,
        todosLoading,
        addTodo,
        toggleTodo,
        updateTodo,
        deleteTodo,
        bookings,
        bookingsLoading,
        updateBookingStatus,
        updateBooking,
        deleteBooking,
        getDocUrls,
        payments,
        addPayment,
        deletePayment,
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
    nikhilPaid: row.nikhil_paid,
    manishPaid: row.manish_paid,
    keshawPaid: row.keshaw_paid,
    status: row.status,
    notes: row.notes,
  };
}

function mapToDB(exp) {
  return {
    date: exp.date,
    category: exp.category,
    description: exp.description,
    total_amount: Number(exp.totalAmount) || 0,
    nikhil_paid: Number(exp.nikhilPaid) || 0,
    manish_paid: Number(exp.manishPaid) || 0,
    keshaw_paid: Number(exp.keshawPaid) || 0,
    status: exp.status,
    notes: exp.notes || "",
  };
}
