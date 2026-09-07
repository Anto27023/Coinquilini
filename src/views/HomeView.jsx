import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  CheckSquare, 
  ShoppingBag, 
  Bath, 
  Users, 
  FileText, 
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  EyeOff,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatEuro } from '../lib/debtAlgorithm';

export default function HomeView({ 
  currentUser, 
  house, 
  members = [], 
  expenses = [], 
  settlements = [], 
  deadlines = [], 
  tasks = [], 
  shoppingList = [], 
  bathroomSlots = [], 
  guests = [], 
  rules = [], 
  boardMessages = [], 
  balancesObj, 
  setCurrentTab,
  features = {}
}) {
  const { balanceList = [], suggestedSettlements = [] } = balancesObj || {};

  // Saldo dell'utente corrente
  const myBalanceItem = balanceList.find(b => b.userId === currentUser?.id);
  const myNetBalance = myBalanceItem ? myBalanceItem.netBalance : 0;

  // Usa il nome completo inserito dall'utente durante la registrazione.
  const displayName = currentUser?.full_name?.trim() || 'Coinquilino';

  // Calcolo scadenze prossime (entro 7 giorni) ed urgenti (entro 3 giorni o scadute)
  const now = new Date();
  
  const upcomingDeadlines = deadlines.filter(d => !d.is_completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const urgentDeadlines = upcomingDeadlines.filter(d => {
    const diffDays = Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  const next7DaysDeadlines = upcomingDeadlines.filter(d => {
    const diffDays = Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  // --- PERSONALIZZAZIONE DASHBOARD (Ordinamento e Nascita schede) ---
  const defaultCardKeys = [
    'guests',         // 3. OSPITI IN ALTO PER PRIORITA'
    'expenses',
    'deadlines',
    'tasks',
    'shopping_list',
    'bathroom',
    'rules',
    'board'
  ];

  const STORAGE_LAYOUT_KEY = 'coinquilini_dashboard_cards_v2';

  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LAYOUT_KEY);
      return saved ? JSON.parse(saved) : defaultCardKeys;
    } catch (e) {
      return defaultCardKeys;
    }
  });

  const [hiddenCards, setHiddenCards] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LAYOUT_KEY + '_hidden');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [cardSizes, setCardSizes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LAYOUT_KEY + '_sizes')) || {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYOUT_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYOUT_KEY + '_hidden', JSON.stringify(hiddenCards));
  }, [hiddenCards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYOUT_KEY + '_sizes', JSON.stringify(cardSizes));
  }, [cardSizes]);

  const moveCard = (index, direction) => {
    const newOrder = [...cardOrder];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setCardOrder(newOrder);
  };

  const hideCard = (key) => {
    setHiddenCards([...hiddenCards, key]);
  };

  const toggleCardSize = (key) => {
    setCardSizes(prev => ({ ...prev, [key]: prev[key] === 'large' ? 'normal' : 'large' }));
  };

  const resetLayout = () => {
    setCardOrder(defaultCardKeys);
    setHiddenCards([]);
    localStorage.removeItem(STORAGE_LAYOUT_KEY);
    localStorage.removeItem(STORAGE_LAYOUT_KEY + '_hidden');
    localStorage.removeItem(STORAGE_LAYOUT_KEY + '_sizes');
    setCardSizes({});
  };

  const cardClassName = (key) => `card ${cardSizes[key] === 'large' ? 'card-large' : ''}`;

  // Mappa delle schede renderizzabili
  const renderCardMap = {
    guests: (features.guests !== false && !hiddenCards.includes('guests')) && (
      <div className={cardClassName('guests')} key="guests">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={18} />
            <span>Prossimi Ospiti Annunciati</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('guests'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('guests'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('guests')} title={cardSizes.guests === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.guests === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('guests')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('guests')}>
              Registro <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {guests.length === 0 ? (
          <p className="empty-state">Nessun ospite annunciato.</p>
        ) : (
          <div className="item-list">
            {guests.slice(0, 3).map(g => (
              <div key={g.id} className="item-row">
                <div className="item-info">
                  <span className="item-title">{g.guest_name}</span>
                  <span className="item-meta">Arrivo: {new Date(g.date).toLocaleDateString('it-IT')}</span>
                </div>
                <span className={`badge ${g.stays_overnight ? 'badge-warning' : 'badge-neutral'}`}>
                  {g.stays_overnight ? 'Pernotta' : 'Visita'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    expenses: (!hiddenCards.includes('expenses')) && (
      <div className={cardClassName('expenses')} key="expenses">
        <div className="card-header">
          <h3 className="card-title">
            <CreditCard size={18} />
            <span>Saldo Coinquilini</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('expenses'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('expenses'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('expenses')} title={cardSizes.expenses === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.expenses === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('expenses')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('expenses')}>
              Vedi Spese <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {suggestedSettlements.length === 0 ? (
          <p className="empty-state">Tutti i conti sono in pareggio.</p>
        ) : (
          <div className="item-list">
            {suggestedSettlements.slice(0, 3).map((s, idx) => (
              <div key={idx} className="item-row">
                <div className="item-info">
                  <span className="item-title" style={{ fontSize: '0.88rem' }}>
                    <strong>{s.from.full_name}</strong> deve dare a <strong>{s.to.full_name}</strong>
                  </span>
                </div>
                <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
                  {formatEuro(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    deadlines: (!hiddenCards.includes('deadlines')) && (
      <div className={cardClassName('deadlines')} key="deadlines">
        <div className="card-header">
          <h3 className="card-title">
            <Calendar size={18} />
            <span>Scadenze (Prossimi 7 giorni)</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('deadlines'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('deadlines'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('deadlines')} title={cardSizes.deadlines === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.deadlines === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('deadlines')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('deadlines')}>
              Gestisci <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {next7DaysDeadlines.length === 0 ? (
          <p className="empty-state">Nessuna scadenza nei prossimi 7 giorni.</p>
        ) : (
          <div className="item-list">
            {next7DaysDeadlines.slice(0, 3).map(dl => (
              <div key={dl.id} className="item-row">
                <div className="item-info">
                  <span className="item-title">{dl.title}</span>
                  <span className="item-meta">{new Date(dl.due_date).toLocaleDateString('it-IT')}</span>
                </div>
                <span className="badge badge-warning">Entro 7 gg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    tasks: (!hiddenCards.includes('tasks')) && (
      <div className={cardClassName('tasks')} key="tasks">
        <div className="card-header">
          <h3 className="card-title">
            <CheckSquare size={18} />
            <span>Turni di Casa</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('tasks'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('tasks'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('tasks')} title={cardSizes.tasks === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.tasks === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('tasks')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('tasks')}>
              Vedi Turni <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {tasks.length === 0 ? (
          <p className="empty-state">Nessun turno inserito.</p>
        ) : (
          <div className="item-list">
            {tasks.slice(0, 3).map(t => {
              const assignedUser = members.find(m => m.id === t.assigned_to);
              return (
                <div key={t.id} className="item-row">
                  <div className="item-info">
                    <span className="item-title">{t.title}</span>
                    <span className="item-meta">Assegnato a: {assignedUser?.full_name || 'Tutti'}</span>
                  </div>
                  <span className={`badge ${t.is_completed ? 'badge-success' : 'badge-neutral'}`}>
                    {t.is_completed ? 'Fatto' : t.frequency}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),

    shopping_list: (features.shopping_list !== false && !hiddenCards.includes('shopping_list')) && (
      <div className={cardClassName('shopping_list')} key="shopping_list">
        <div className="card-header">
          <h3 className="card-title">
            <ShoppingBag size={18} />
            <span>Lista della Spesa</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('shopping_list'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('shopping_list'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('shopping_list')} title={cardSizes.shopping_list === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.shopping_list === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('shopping_list')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('shopping_list')}>
              Apri Lista <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {shoppingList.filter(s => !s.is_purchased).length === 0 ? (
          <p className="empty-state">Niente da comprare al momento.</p>
        ) : (
          <div className="item-list">
            {shoppingList.filter(s => !s.is_purchased).slice(0, 3).map(item => (
              <div key={item.id} className="item-row">
                <div className="item-info">
                  <span className="item-title">{item.item_name}</span>
                  {item.quantity && <span className="item-meta">Q.tà: {item.quantity}</span>}
                </div>
                <span className="badge badge-warning">Da comprare</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    bathroom: (features.bathroom !== false && !hiddenCards.includes('bathroom')) && (
      <div className={cardClassName('bathroom')} key="bathroom">
        <div className="card-header">
          <h3 className="card-title">
            <Bath size={18} />
            <span>Prossime Prenotazioni Bagno</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('bathroom'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('bathroom'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('bathroom')} title={cardSizes.bathroom === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.bathroom === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('bathroom')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('bathroom')}>
              Prenota <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {bathroomSlots.length === 0 ? (
          <p className="empty-state">Nessuna prenotazione imminente.</p>
        ) : (
          <div className="item-list">
            {bathroomSlots.slice(0, 3).map(b => {
              const user = members.find(m => m.id === b.user_id);
              return (
                <div key={b.id} className="item-row">
                  <div className="item-info">
                    <span className="item-title">{user?.full_name || 'Coinquilino'} — {b.start_time}</span>
                    <span className="item-meta">{new Date(b.date).toLocaleDateString('it-IT')} ({b.duration_minutes} min)</span>
                  </div>
                  <span className="badge badge-neutral">Prenotato</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),

    rules: (features.rules !== false && !hiddenCards.includes('rules')) && (
      <div className={cardClassName('rules')} key="rules">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} />
            <span>Regole della Casa</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('rules'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('rules'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('rules')} title={cardSizes.rules === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.rules === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('rules')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('rules')}>
              Tutte le Regole <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {rules.length === 0 ? (
          <p className="empty-state">Nessuna regola stabilita.</p>
        ) : (
          <div className="item-list">
            {rules.slice(0, 2).map(r => (
              <div key={r.id} className="item-row">
                <div className="item-info">
                  <span className="item-title" style={{ fontSize: '0.88rem' }}>"{r.rule_text}"</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    board: (!hiddenCards.includes('board')) && (
      <div className={cardClassName('board')} key="board">
        <div className="card-header">
          <h3 className="card-title">
            <MessageSquare size={18} />
            <span>Bacheca Messaggi</span>
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditMode && (
              <div className="card-controls">
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('board'), -1)} title="Sposta su"><ChevronUp size={16} /></button>
                <button className="card-control-btn" onClick={() => moveCard(cardOrder.indexOf('board'), 1)} title="Sposta giù"><ChevronDown size={16} /></button>
                <button className="card-control-btn" onClick={() => toggleCardSize('board')} title={cardSizes.board === 'large' ? 'Riduci scheda' : 'Ingrandisci scheda'}>{cardSizes.board === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                <button className="card-control-btn" onClick={() => hideCard('board')} title="Nascondi scheda"><EyeOff size={16} /></button>
              </div>
            )}
            <button className="card-action-link" onClick={() => setCurrentTab('board')}>
              Apri Bacheca <ArrowRight size={14} />
            </button>
          </div>
        </div>
        {boardMessages.length === 0 ? (
          <p className="empty-state">Nessun messaggio in bacheca.</p>
        ) : (
          <div className="item-list">
            {boardMessages.slice(0, 2).map(msg => {
              const author = members.find(m => m.id === msg.user_id);
              return (
                <div key={msg.id} className="item-row">
                  <div className="item-info">
                    <span className="item-title" style={{ fontSize: '0.88rem' }}>
                      <strong>{author?.full_name || 'Coinquilino'}:</strong> {msg.message}
                    </span>
                    <span className="item-meta">
                      {new Date(msg.created_at || Date.now()).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )
  };

  return (
    <div>
      {/* 1. Hero Welcome & Stats — REQUISITO 7: "Ciao (nome), benvenuto a casa!" senza emoticon */}
      <div className="welcome-hero">
        <div className="welcome-text">
          <h2>Ciao {displayName}, benvenuto a casa!</h2>
          <p>Dashboard della casa: <strong>{house?.name || 'Coinquilini'}</strong></p>
        </div>
        <div className="welcome-stats">
          <div className="stat-pill">
            <span className="stat-label">Tuo Saldo</span>
            <span className="stat-value" style={{ color: myNetBalance > 0 ? '#4ade80' : myNetBalance < 0 ? '#f87171' : 'white' }}>
              {formatEuro(myNetBalance)}
            </span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Scadenze Vicine</span>
            <span className="stat-value">{upcomingDeadlines.length}</span>
          </div>
        </div>
      </div>

      {/* Pulsante per personalizzare o ripristinare il layout della Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        {hiddenCards.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={resetLayout}>
            <RotateCcw size={14} />
            Ripristina schede nascoste ({hiddenCards.length})
          </button>
        )}
        <button 
          className={`btn btn-sm ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          <Sliders size={14} />
          {isEditMode ? 'Finito' : 'Personalizza Schede'}
        </button>
      </div>

      {/* 2. Riquadro Urgenze (se ci sono scadenze urgenti entro 3 giorni o scadute) */}
      {urgentDeadlines.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid var(--danger)', backgroundColor: 'var(--danger-soft)' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="card-title text-danger">
              <AlertTriangle size={20} />
              <span>Urgenze in Scadenza</span>
            </div>
            <button className="card-action-link text-danger" onClick={() => setCurrentTab('deadlines')}>
              Vedi tutte ({urgentDeadlines.length}) <ArrowRight size={14} />
            </button>
          </div>
          <div className="item-list">
            {urgentDeadlines.slice(0, 2).map(dl => {
              const diffDays = Math.ceil((new Date(dl.due_date) - now) / (1000 * 60 * 60 * 24));
              const badgeText = diffDays < 0 
                ? `Scaduta da ${Math.abs(diffDays)} giorni` 
                : diffDays === 0 
                ? 'Scade oggi' 
                : `Mancano ${diffDays} giorni`;
              
              return (
                <div key={dl.id} className="item-row" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="item-info">
                    <span className="item-title">{dl.title}</span>
                    <span className="item-meta">Data: {new Date(dl.due_date).toLocaleDateString('it-IT')}</span>
                  </div>
                  <span className="badge badge-danger">{badgeText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Griglia di Riquadri Anteprima nell'ordine personalizzabile dall'utente */}
      <div className="grid-dashboard">
        {cardOrder.map(key => renderCardMap[key])}
      </div>
    </div>
  );
}
