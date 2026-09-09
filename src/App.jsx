import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, getLocalState, saveLocalState } from './lib/supabase';
import { calculateBalancesAndSettlements } from './lib/debtAlgorithm';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import AuthView from './views/AuthView';
import SetupHouseView from './views/SetupHouseView';
import HomeView from './views/HomeView';
import ExpensesView from './views/ExpensesView';
import DeadlinesView from './views/DeadlinesView';
import TasksView from './views/TasksView';
import ShoppingListView from './views/ShoppingListView';
import BathroomView from './views/BathroomView';
import GuestsView from './views/GuestsView';
import RulesView from './views/RulesView';
import BoardView from './views/BoardView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [house, setHouse] = useState(null);
  const [members, setMembers] = useState([]);
  
  // Data States
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [bathroomSlots, setBathroomSlots] = useState([]);
  const [guests, setGuests] = useState([]);
  const [rules, setRules] = useState([]);
  const [boardMessages, setBoardMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // UI States
  const [currentTab, setCurrentTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('coinquilini_theme') || 'light');

  // Applica e memorizza il tema visivo selezionato
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('coinquilini_theme', theme);
  }, [theme]);

  // Sincronizza il profilo Supabase in profiles con auth.users
  const syncUserProfile = async (authUser) => {
    if (!authUser?.id) return null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile) {
        const merged = { ...authUser, ...profile };
        setCurrentUser(merged);
        return merged;
      } else {
        const newProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Coinquilino',
          email: authUser.email || ''
        };
        await supabase.from('profiles').upsert(newProfile);
        const merged = { ...authUser, ...newProfile };
        setCurrentUser(merged);
        return merged;
      }
    } catch (e) {
      console.error('Error syncing profile:', e);
      setCurrentUser(authUser);
      return authUser;
    }
  };

  // Initial Auth & Data Load
  useEffect(() => {
    async function init() {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userWithProfile = await syncUserProfile(session.user);
          if (userWithProfile?.id) {
            await loadSupabaseData(userWithProfile.id);
          }
        }
      } else {
        // Fallback Local Storage Mode
        const state = getLocalState();
        if (state.user) {
          setCurrentUser(state.user);
          setHouse(state.house);
          setMembers(state.members || []);
          setExpenses(state.expenses || []);
          setSettlements(state.settlements || []);
          setDeadlines(state.deadlines || []);
          setTasks(state.tasks || []);
          setShoppingList(state.shopping_list || []);
          setBathroomSlots(state.bathroom_slots || []);
          setGuests(state.guests || []);
          setRules(state.rules || []);
          setBoardMessages(state.board_messages || []);
          setNotifications(state.notifications || []);
        }
      }
      setLoading(false);
    }
    init();

    // Listener Cambi di Stato Supabase Auth
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const userWithProfile = await syncUserProfile(session.user);
          if (userWithProfile?.id) {
            await loadSupabaseData(userWithProfile.id);
          }
        } else {
          setCurrentUser(null);
          setHouse(null);
          setMembers([]);
        }
      });
      return () => subscription?.unsubscribe();
    }
  }, []);

  // Supabase Realtime Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured || !house?.id) return;

    const channel = supabase
      .channel(`house-realtime-${house.id}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (currentUser?.id) loadSupabaseData(currentUser.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [house?.id, currentUser?.id]);

  const loadSupabaseData = async (userId) => {
    if (!userId) return;
    try {
      // 1. Carica e sincronizza profilo utente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setCurrentUser(prev => ({ ...(prev || {}), ...profileData }));
      }

      // 2. Carica membro e casa dell'utente
      const { data: memberData } = await supabase
        .from('house_members')
        .select('*, house:houses(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!memberData || !memberData.house) {
        setHouse(null);
        setMembers([]);
        return;
      }

      const houseObj = memberData.house;
      setHouse(houseObj);

      // 3. Carica tutti i membri della casa
      const { data: allMembers } = await supabase
        .from('house_members')
        .select('*, profile:profiles(*)')
        .eq('house_id', houseObj.id);

      const formattedMembers = (allMembers || []).map(m => ({
        id: m.user_id,
        full_name: m.profile?.full_name || 'Coinquilino',
        email: m.profile?.email || '',
        avatar_url: m.profile?.avatar_url || '',
        iban: m.profile?.iban || '',
        paypal: m.profile?.paypal || '',
        revolut: m.profile?.revolut || '',
        satispay: m.profile?.satispay || '',
        role: m.role
      }));
      setMembers(formattedMembers);

      // 4. Carica spese e partecipanti
      const { data: expData } = await supabase
        .from('expenses')
        .select('*, expense_participants(user_id)')
        .eq('house_id', houseObj.id)
        .order('date', { ascending: false });

      const formattedExp = (expData || []).map(e => ({
        ...e,
        participants: e.expense_participants ? e.expense_participants.map(p => p.user_id) : []
      }));
      setExpenses(formattedExp);

      // 4. Carica settlements
      const { data: setData } = await supabase
        .from('settlements')
        .select('*')
        .eq('house_id', houseObj.id);
      setSettlements(setData || []);

      // 5. Carica deadlines
      const { data: dlData } = await supabase
        .from('deadlines')
        .select('*')
        .eq('house_id', houseObj.id)
        .order('due_date', { ascending: true });
      setDeadlines(dlData || []);

      // 6. Carica tasks
      const { data: tData } = await supabase
        .from('tasks')
        .select('*')
        .eq('house_id', houseObj.id);
      setTasks(tData || []);

      // 7. Carica shopping_list
      const { data: shopData } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('house_id', houseObj.id);
      setShoppingList(shopData || []);

      // 8. Carica bathroom_slots
      const { data: bData } = await supabase
        .from('bathroom_slots')
        .select('*')
        .eq('house_id', houseObj.id)
        .order('date', { ascending: true });
      setBathroomSlots(bData || []);

      // 9. Carica guests
      const { data: gData } = await supabase
        .from('guests')
        .select('*')
        .eq('house_id', houseObj.id)
        .order('date', { ascending: true });
      setGuests(gData || []);

      // 10. Carica rules
      const { data: rData } = await supabase
        .from('rules')
        .select('*')
        .eq('house_id', houseObj.id);
      setRules(rData || []);

      // 11. Carica board_messages
      const { data: msgData } = await supabase
        .from('board_messages')
        .select('*')
        .eq('house_id', houseObj.id)
        .order('created_at', { ascending: false });
      setBoardMessages(msgData || []);

      // 12. Carica notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setNotifications(notifData || []);

    } catch (e) {
      console.error('Error loading Supabase data:', e);
    }
  };

  // Helper per inviare notifiche agli altri membri della casa
  const pushNotificationToHouse = async (title, message) => {
    if (!currentUser?.id) return;
    const otherMembers = members.filter(m => m.id !== currentUser.id);
    if (isSupabaseConfigured && house?.id) {
      const rows = otherMembers.map(m => ({
        house_id: house.id,
        user_id: m.id,
        title,
        message
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('notifications').insert(rows);
        if (error) console.error('Error sending notifications:', error);
      }
    } else {
      const state = getLocalState();
      const newNotifs = (state.notifications || []);
      newNotifs.unshift({
        id: 'notif-' + Date.now(),
        house_id: house?.id,
        user_id: currentUser?.id,
        title,
        message,
        is_read: false,
        created_at: new Date().toISOString()
      });
      state.notifications = newNotifs;
      saveLocalState(state);
      setNotifications([...newNotifs]);
    }
  };

  // Handlers azioni di scrittura (Spese, Scadenze, Turni, etc.)
  const handleAddExpense = async (expData) => {
    if (isSupabaseConfigured && house?.id) {
      const { data: newExp, error } = await supabase.from('expenses').insert({
        house_id: house.id,
        paid_by: expData.paid_by || currentUser?.id,
        description: expData.description,
        amount: expData.amount,
        category: expData.category,
        date: expData.date
      }).select().single();

      if (error) {
        console.error('Error adding expense:', error);
        return;
      }

      if (newExp) {
        const pRows = (expData.participants || []).map(uId => ({
          expense_id: newExp.id,
          user_id: uId
        }));
        if (pRows.length > 0) {
          const { error: pError } = await supabase.from('expense_participants').insert(pRows);
          if (pError) console.error('Error adding expense participants:', pError);
        }
        await pushNotificationToHouse('Nuova Spesa Registrata', `${currentUser?.full_name || 'Un coinquilino'} ha aggiunto: ${expData.description}`);
        loadSupabaseData(currentUser.id);
      }
    } else {
      const state = getLocalState();
      const newExp = { id: 'exp-' + Date.now(), house_id: house?.id, ...expData };
      state.expenses.unshift(newExp);
      saveLocalState(state);
      setExpenses([...state.expenses]);
      pushNotificationToHouse('Nuova Spesa Registrata', `${currentUser?.full_name || 'Un coinquilino'} ha aggiunto: ${expData.description}`);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) console.error('Error deleting expense:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.expenses = state.expenses.filter(e => e.id !== id);
      saveLocalState(state);
      setExpenses([...state.expenses]);
    }
  };

  const handleAddSettlement = async (setData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('settlements').insert({
        house_id: house.id,
        payer_id: setData.payer_id,
        receiver_id: setData.receiver_id,
        amount: setData.amount,
        date: setData.date
      });
      if (error) console.error('Error adding settlement:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newSet = { id: 'set-' + Date.now(), house_id: house?.id, ...setData };
      state.settlements.unshift(newSet);
      saveLocalState(state);
      setSettlements([...state.settlements]);
    }
  };

  const handleAddDeadline = async (dData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('deadlines').insert({
        house_id: house.id,
        title: dData.title,
        due_date: dData.due_date,
        category: dData.category || 'Casa',
        priority: dData.priority || 'media',
        notes: dData.notes || null,
        created_by: dData.created_by || currentUser?.id || null
      });
      if (error) console.error('Error adding deadline:', error);
      await pushNotificationToHouse('Nuova Scadenza', `Nuova scadenza: ${dData.title}`);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newDl = { id: 'dl-' + Date.now(), house_id: house?.id, is_completed: false, ...dData };
      state.deadlines.push(newDl);
      saveLocalState(state);
      setDeadlines([...state.deadlines]);
      pushNotificationToHouse('Nuova Scadenza', `Nuova scadenza: ${dData.title}`);
    }
  };

  const handleToggleDeadlineDone = async (id) => {
    const item = deadlines.find(d => d.id === id);
    if (!item) return;
    const newStatus = !item.is_completed;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('deadlines').update({ is_completed: newStatus }).eq('id', id);
      if (error) console.error('Error updating deadline:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.deadlines = state.deadlines.map(d => d.id === id ? { ...d, is_completed: newStatus } : d);
      saveLocalState(state);
      setDeadlines([...state.deadlines]);
    }
  };

  const handleDeleteDeadline = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('deadlines').delete().eq('id', id);
      if (error) console.error('Error deleting deadline:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.deadlines = state.deadlines.filter(d => d.id !== id);
      saveLocalState(state);
      setDeadlines([...state.deadlines]);
    }
  };

  const handleAddTask = async (tData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('tasks').insert({
        house_id: house.id,
        title: tData.title,
        assigned_to: tData.assigned_to ? tData.assigned_to : null,
        frequency: tData.frequency || 'Settimanale'
      });
      if (error) console.error('Error adding task:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newTask = { id: 'task-' + Date.now(), house_id: house?.id, is_completed: false, ...tData };
      state.tasks.push(newTask);
      saveLocalState(state);
      setTasks([...state.tasks]);
    }
  };

  const handleToggleTaskDone = async (id) => {
    const item = tasks.find(t => t.id === id);
    if (!item) return;
    const newStatus = !item.is_completed;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').update({ is_completed: newStatus }).eq('id', id);
      if (error) console.error('Error updating task:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.tasks = state.tasks.map(t => t.id === id ? { ...t, is_completed: newStatus } : d);
      saveLocalState(state);
      setTasks([...state.tasks]);
    }
  };

  const handleDeleteTask = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) console.error('Error deleting task:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveLocalState(state);
      setTasks([...state.tasks]);
    }
  };

  const handleAddShoppingItem = async (sData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('shopping_list_items').insert({
        house_id: house.id,
        item_name: sData.item_name,
        quantity: sData.quantity || null,
        requested_by: sData.requested_by ? sData.requested_by : null
      });
      if (error) console.error('Error adding shopping item:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newItem = { id: 'shop-' + Date.now(), house_id: house?.id, is_purchased: false, ...sData };
      state.shopping_list.push(newItem);
      saveLocalState(state);
      setShoppingList([...state.shopping_list]);
    }
  };

  const handleToggleShoppingItemPurchased = async (id) => {
    const item = shoppingList.find(s => s.id === id);
    if (!item) return;
    const newStatus = !item.is_purchased;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('shopping_list_items').update({ is_purchased: newStatus }).eq('id', id);
      if (error) console.error('Error updating shopping item:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.shopping_list = state.shopping_list.map(s => s.id === id ? { ...s, is_purchased: newStatus } : s);
      saveLocalState(state);
      setShoppingList([...state.shopping_list]);
    }
  };

  const handleDeleteShoppingItem = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id);
      if (error) console.error('Error deleting shopping item:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.shopping_list = state.shopping_list.filter(s => s.id !== id);
      saveLocalState(state);
      setShoppingList([...state.shopping_list]);
    }
  };

  const handleAddBathroomSlot = async (bData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('bathroom_slots').insert({
        house_id: house.id,
        user_id: bData.user_id || currentUser?.id,
        date: bData.date,
        start_time: bData.start_time,
        duration_minutes: bData.duration_minutes,
        notes: bData.notes || null
      });
      if (error) console.error('Error adding bathroom slot:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newSlot = { id: 'bath-' + Date.now(), house_id: house?.id, ...bData };
      state.bathroom_slots.push(newSlot);
      saveLocalState(state);
      setBathroomSlots([...state.bathroom_slots]);
    }
  };

  const handleDeleteBathroomSlot = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('bathroom_slots').delete().eq('id', id);
      if (error) console.error('Error deleting bathroom slot:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.bathroom_slots = state.bathroom_slots.filter(b => b.id !== id);
      saveLocalState(state);
      setBathroomSlots([...state.bathroom_slots]);
    }
  };

  const handleAddGuest = async (gData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('guests').insert({
        house_id: house.id,
        guest_name: gData.guest_name,
        host_id: gData.host_id || currentUser?.id,
        date: gData.date,
        stays_overnight: Boolean(gData.stays_overnight),
        notes: gData.notes || null
      });
      if (error) console.error('Error adding guest:', error);
      await pushNotificationToHouse('Nuovo Ospite', `${currentUser?.full_name || 'Un coinquilino'} ha annunciato un ospite: ${gData.guest_name}`);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newGuest = { id: 'guest-' + Date.now(), house_id: house?.id, ...gData };
      state.guests.push(newGuest);
      saveLocalState(state);
      setGuests([...state.guests]);
      pushNotificationToHouse('Nuovo Ospite', `${currentUser?.full_name || 'Un coinquilino'} ha annunciato un ospite: ${gData.guest_name}`);
    }
  };

  const handleDeleteGuest = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('guests').delete().eq('id', id);
      if (error) console.error('Error deleting guest:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.guests = state.guests.filter(g => g.id !== id);
      saveLocalState(state);
      setGuests([...state.guests]);
    }
  };

  const handleAddRule = async (rData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('rules').insert({
        house_id: house.id,
        rule_text: rData.rule_text,
        created_by: rData.created_by || currentUser?.id || null
      });
      if (error) console.error('Error adding rule:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newRule = { id: 'rule-' + Date.now(), house_id: house?.id, ...rData };
      state.rules.push(newRule);
      saveLocalState(state);
      setRules([...state.rules]);
    }
  };

  const handleDeleteRule = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('rules').delete().eq('id', id);
      if (error) console.error('Error deleting rule:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.rules = state.rules.filter(r => r.id !== id);
      saveLocalState(state);
      setRules([...state.rules]);
    }
  };

  const handleAddBoardMessage = async (mData) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('board_messages').insert({
        house_id: house.id,
        user_id: mData.user_id || currentUser?.id,
        message: mData.message
      });
      if (error) console.error('Error adding board message:', error);
      await pushNotificationToHouse('Nuovo Messaggio in Bacheca', `${currentUser?.full_name || 'Un coinquilino'}: ${mData.message}`);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      const newMsg = { id: 'msg-' + Date.now(), house_id: house?.id, ...mData, created_at: new Date().toISOString() };
      state.board_messages.unshift(newMsg);
      saveLocalState(state);
      setBoardMessages([...state.board_messages]);
      pushNotificationToHouse('Nuovo Messaggio in Bacheca', `${currentUser?.full_name || 'Un coinquilino'}: ${mData.message}`);
    }
  };

  const handleDeleteBoardMessage = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('board_messages').delete().eq('id', id);
      if (error) console.error('Error deleting board message:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.board_messages = state.board_messages.filter(m => m.id !== id);
      saveLocalState(state);
      setBoardMessages([...state.board_messages]);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (isSupabaseConfigured && currentUser?.id) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
      if (error) console.error('Error marking notifications read:', error);
      loadSupabaseData(currentUser.id);
    } else {
      const state = getLocalState();
      state.notifications = (state.notifications || []).map(n => ({ ...n, is_read: true }));
      saveLocalState(state);
      setNotifications([...state.notifications]);
    }
  };

  const handleUpdateHouse = async (houseUpdates) => {
    if (isSupabaseConfigured && house?.id) {
      const { error } = await supabase.from('houses').update(houseUpdates).eq('id', house.id);
      if (error) console.error('Error updating house:', error);
      loadSupabaseData(currentUser?.id);
    } else {
      const state = getLocalState();
      state.house = { ...state.house, ...houseUpdates };
      saveLocalState(state);
      setHouse({ ...state.house });
    }
  };

  const handleUpdateProfile = async (profileUpdates) => {
    if (isSupabaseConfigured && currentUser?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', currentUser.id)
        .select()
        .maybeSingle();

      if (!error && data) {
        setCurrentUser(prev => ({ ...(prev || {}), ...data }));
      } else {
        setCurrentUser(prev => ({ ...(prev || {}), ...profileUpdates }));
      }
      await loadSupabaseData(currentUser.id);
    } else {
      const state = getLocalState();
      state.user = { ...state.user, ...profileUpdates };
      state.members = state.members.map(m => m.id === currentUser.id ? { ...m, ...profileUpdates } : m);
      saveLocalState(state);
      setCurrentUser({ ...state.user });
      setMembers([...state.members]);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setHouse(null);
    setMembers([]);
    setExpenses([]);
    setSettlements([]);
    setDeadlines([]);
    setTasks([]);
    setShoppingList([]);
    setBathroomSlots([]);
    setGuests([]);
    setRules([]);
    setBoardMessages([]);
    setNotifications([]);
    setCurrentTab('home');
  };

  const handleLeaveHouse = async () => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('leave_house');
      if (error) {
        console.error('Error leaving house:', error);
        return;
      }
    } else {
      const state = getLocalState();
      state.house = null;
      state.members = [];
      state.notifications = [];
      saveLocalState(state);
    }

    setHouse(null);
    setMembers([]);
    setNotifications([]);
    setCurrentTab('home');
  };

  // Calcolo saldi e rimborsi minimi tramite algoritmo dedicato
  const balancesObj = calculateBalancesAndSettlements(expenses, settlements, members);

  // Mappa dei titoli per la Topbar
  const pageTitles = {
    home: 'Home',
    expenses: 'Spese e Conti',
    deadlines: 'Scadenze Casa',
    tasks: 'Turni e Pulizie',
    shopping_list: 'Lista della Spesa',
    bathroom: 'Prenotazione Bagno',
    guests: 'Registro Ospiti',
    rules: 'Regole della Casa',
    board: 'Bacheca Messaggi',
    settings: 'Impostazioni'
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
        <div style={{ fontWeight: 600, color: 'var(--muted)' }}>Caricamento in corso...</div>
      </div>
    );
  }

  // 1. Utente non autenticato -> Schermata Login/Registrazione
  if (!currentUser) {
    return <AuthView onAuthSuccess={async (user) => {
      if (isSupabaseConfigured) {
        const synced = await syncUserProfile(user);
        if (synced?.id) await loadSupabaseData(synced.id);
      } else {
        setCurrentUser(user);
      }
    }} />;
  }

  // 2. Utente autenticato ma non ancora in una casa -> Schermata Setup Casa
  if (!house) {
    return <SetupHouseView currentUser={currentUser} onHouseJoined={async () => {
      if (isSupabaseConfigured && currentUser?.id) {
        await loadSupabaseData(currentUser.id);
      } else {
        const state = getLocalState();
        setHouse(state.house);
        setMembers(state.members || []);
      }
    }} />;
  }

  // 3. Layout completo App
  return (
    <div className="app-container">
      <Sidebar 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        houseName={house.name}
        features={house.features}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="main-wrapper">
        <Topbar 
          title={pageTitles[currentTab] || 'Coinquilini'}
          currentTab={currentTab}
          onBackToHome={() => setCurrentTab('home')}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          members={members}
          notifications={notifications}
          onMarkAllRead={handleMarkAllNotificationsRead}
          currentTheme={theme}
          onSelectTheme={setTheme}
        />

        <main className="main-content">
          {currentTab === 'home' && (
            <HomeView 
              currentUser={currentUser}
              house={house}
              members={members}
              expenses={expenses}
              settlements={settlements}
              deadlines={deadlines}
              tasks={tasks}
              shoppingList={shoppingList}
              bathroomSlots={bathroomSlots}
              guests={guests}
              rules={rules}
              boardMessages={boardMessages}
              balancesObj={balancesObj}
              setCurrentTab={setCurrentTab}
              features={house.features}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView 
              currentUser={currentUser}
              members={members}
              expenses={expenses}
              settlements={settlements}
              features={house.features}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddSettlement={handleAddSettlement}
              balancesObj={balancesObj}
            />
          )}

          {currentTab === 'deadlines' && (
            <DeadlinesView 
              currentUser={currentUser}
              deadlines={deadlines}
              onAddDeadline={handleAddDeadline}
              onToggleDeadlineDone={handleToggleDeadlineDone}
              onDeleteDeadline={handleDeleteDeadline}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView 
              currentUser={currentUser}
              members={members}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTaskDone={handleToggleTaskDone}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {currentTab === 'shopping_list' && (
            <ShoppingListView 
              currentUser={currentUser}
              members={members}
              shoppingList={shoppingList}
              onAddItem={handleAddShoppingItem}
              onToggleItemPurchased={handleToggleShoppingItemPurchased}
              onDeleteItem={handleDeleteShoppingItem}
            />
          )}

          {currentTab === 'bathroom' && (
            <BathroomView 
              currentUser={currentUser}
              members={members}
              bathroomSlots={bathroomSlots}
              onAddBathroomSlot={handleAddBathroomSlot}
              onDeleteBathroomSlot={handleDeleteBathroomSlot}
            />
          )}

          {currentTab === 'guests' && (
            <GuestsView 
              currentUser={currentUser}
              members={members}
              guests={guests}
              onAddGuest={handleAddGuest}
              onDeleteGuest={handleDeleteGuest}
            />
          )}

          {currentTab === 'rules' && (
            <RulesView 
              currentUser={currentUser}
              rules={rules}
              onAddRule={handleAddRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {currentTab === 'board' && (
            <BoardView 
              currentUser={currentUser}
              members={members}
              boardMessages={boardMessages}
              onAddBoardMessage={handleAddBoardMessage}
              onDeleteBoardMessage={handleDeleteBoardMessage}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView 
              currentUser={currentUser}
              house={house}
              features={house.features}
              onUpdateHouse={handleUpdateHouse}
              onUpdateProfile={handleUpdateProfile}
              onLeaveHouse={handleLeaveHouse}
              onLogout={handleLogout}
              currentTheme={theme}
              onSelectTheme={setTheme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
