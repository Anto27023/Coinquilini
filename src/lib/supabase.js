import { createClient } from '@supabase/supabase-js';

// Lettura delle variabili d'ambiente come specificato nei requisiti (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const REMEMBER_ME_KEY = 'fuorisede_remember_me';
const authStorage = {
  getItem: (key) => {
    const storage = localStorage.getItem(REMEMBER_ME_KEY) === 'false' ? sessionStorage : localStorage;
    return storage.getItem(key);
  },
  setItem: (key, value) => {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
    if (!rememberMe) localStorage.removeItem(key);
    (rememberMe ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export function setRememberMePreference(rememberMe) {
  localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  if (!rememberMe) {
    Object.keys(localStorage)
      .filter(key => key.startsWith('sb-'))
      .forEach(key => localStorage.removeItem(key));
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('tuoprogetto.supabase.co')
);

// Inizializzazione client Supabase (usato se le variabili d'ambiente sono valide)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { storage: authStorage } })
  : null;

/**
 * Gestione dello stato locale di Fallback/Demo (usato quando le chiavi Supabase non sono ancora configurate).
 * Permette di testare e usare l'applicazione a 360° subito dopo il clone/download!
 */
const STORAGE_KEY = 'fuorisede_facile_local_db_v1';

const defaultLocalState = {
  user: {
    id: 'demo-user-1',
    email: 'marco.rossi@fuorisede.it',
    full_name: 'Marco Rossi',
    avatar_url: '',
    iban: 'IT60X0542811101000000123456',
    paypal: 'paypal.me/marcorossi',
    revolut: '@marcorossi',
    satispay: '3331234567'
  },
  house: {
    id: 'demo-house-1',
    name: 'Casa Via Roma 42',
    invite_code: 'FS-98A72B',
    created_by: 'demo-user-1',
    features: {
      rent: true,
      bills: true,
      groceries: true,
      products: true,
      guests: true,
      bathroom: true,
      rules: true,
      shopping_list: true
    }
  },
  members: [
    { id: 'demo-user-1', full_name: 'Marco Rossi', email: 'marco.rossi@fuorisede.it', role: 'owner' },
    { id: 'demo-user-2', full_name: 'Giulia Bianchi', email: 'giulia.b@fuorisede.it', role: 'member' },
    { id: 'demo-user-3', full_name: 'Luca Verdi', email: 'luka.verdi@fuorisede.it', role: 'member' }
  ],
  expenses: [
    {
      id: 'exp-1',
      house_id: 'demo-house-1',
      description: 'Spesa Esselunga',
      amount: 48.50,
      category: 'Spesa comune',
      paid_by: 'demo-user-1',
      participants: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
    },
    {
      id: 'exp-2',
      house_id: 'demo-house-1',
      description: 'Bolletta Luce Enel',
      amount: 90.00,
      category: 'Bollette',
      paid_by: 'demo-user-2',
      participants: ['demo-user-1', 'demo-user-2', 'demo-user-3'],
      date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0]
    }
  ],
  settlements: [],
  deadlines: [
    {
      id: 'dl-1',
      house_id: 'demo-house-1',
      title: 'Scadenza Affitto Mensile',
      due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      category: 'Affitto',
      priority: 'alta',
      notes: 'Bonifico da fare entro il 10',
      is_completed: false,
      created_by: 'demo-user-1'
    },
    {
      id: 'dl-2',
      house_id: 'demo-house-1',
      title: 'Lettura contatore gas',
      due_date: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      category: 'Bollette',
      priority: 'media',
      notes: 'Inviare autolettura su app',
      is_completed: false,
      created_by: 'demo-user-2'
    }
  ],
  tasks: [
    {
      id: 'task-1',
      house_id: 'demo-house-1',
      title: 'Pulizia Bagno Principale',
      assigned_to: 'demo-user-1',
      frequency: 'Settimanale',
      is_completed: false
    },
    {
      id: 'task-2',
      house_id: 'demo-house-1',
      title: 'Portare fuori la Plastica',
      assigned_to: 'demo-user-3',
      frequency: 'Ogni 2 settimane',
      is_completed: true
    }
  ],
  shopping_list: [
    {
      id: 'shop-1',
      house_id: 'demo-house-1',
      item_name: 'Detersivo Piatti',
      quantity: '2 flaconi',
      requested_by: 'demo-user-2',
      is_purchased: false
    },
    {
      id: 'shop-2',
      house_id: 'demo-house-1',
      item_name: 'Carta Igienica',
      quantity: 'Confezione da 12',
      requested_by: 'demo-user-1',
      is_purchased: true
    }
  ],
  bathroom_slots: [
    {
      id: 'bath-1',
      house_id: 'demo-house-1',
      user_id: 'demo-user-2',
      date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      duration_minutes: 30,
      notes: 'Doccia prima dell\'università'
    }
  ],
  guests: [
    {
      id: 'guest-1',
      house_id: 'demo-house-1',
      guest_name: 'Matteo (amico di Luca)',
      host_id: 'demo-user-3',
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      stays_overnight: true,
      notes: 'Dorme sul divano in soggiorno'
    }
  ],
  rules: [
    {
      id: 'rule-1',
      house_id: 'demo-house-1',
      rule_text: 'Niente musica o rumori forti dopo le 23:00.',
      created_by: 'demo-user-1'
    },
    {
      id: 'rule-2',
      house_id: 'demo-house-1',
      rule_text: 'Lavare subito i propri piatti e pentole dopo aver cucinato.',
      created_by: 'demo-user-2'
    }
  ],
  board_messages: [
    {
      id: 'msg-1',
      house_id: 'demo-house-1',
      user_id: 'demo-user-2',
      message: 'Ciao a tutti! Stasera ordiniamo una pizza insieme?',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      house_id: 'demo-house-1',
      user_id: 'demo-user-1',
      title: 'Nuova Scadenza',
      message: 'Giulia ha aggiunto la lettura del contatore gas.',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ]
};

export function getLocalState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLocalState));
    return defaultLocalState;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultLocalState;
  }
}

export function saveLocalState(newState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
}
