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
    } else {
      setExpenses([]);
      setTodos([]);
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
