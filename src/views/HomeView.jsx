import React from 'react';
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
  Plus
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

  // Calcolo scadenze prossime (entro 7 giorni) ed urgenti (entro 3 giorni o scadute)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const upcomingDeadlines = deadlines.filter(d => !d.is_completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const urgentDeadlines = upcomingDeadlines.filter(d => {
    const diffDays = Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  const next7DaysDeadlines = upcomingDeadlines.filter(d => {
    const diffDays = Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  });

  return (
    <div>
      {/* 1. Hero Welcome & Stats */}
      <div className="welcome-hero">
        <div className="welcome-text">
          <h2>Ciao, {currentUser?.full_name || 'Coinquilino'}! 👋</h2>
          <p>Benvenuto nella dashboard della tua casa: <strong>{house?.name || 'Fuorisede Facile'}</strong></p>
        </div>
        <div className="welcome-stats">
          <div className="stat-pill">
            <span className="stat-label">Tuo Saldo</span>
            <span className={`stat-value ${myNetBalance > 0 ? 'text-accent' : myNetBalance < 0 ? 'text-danger' : ''}`} style={{ color: myNetBalance > 0 ? '#4ade80' : myNetBalance < 0 ? '#f87171' : 'white' }}>
              {formatEuro(myNetBalance)}
            </span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">Scadenze Vicine</span>
            <span className="stat-value">{upcomingDeadlines.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Riquadro Urgenze (se ci sono scadenze urgenti entro 3 giorni o scadute) */}
      {urgentDeadlines.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid var(--danger)', backgroundColor: 'var(--danger-soft)' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="card-title text-danger">
              <AlertTriangle size={20} />
              <span>Urgenze in Scadenza!</span>
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
                ? 'Scade oggi!' 
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

      {/* 3. Griglia di Riquadri Anteprima */}
      <div className="grid-dashboard">
        {/* Anteprima Spese e Saldi */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <CreditCard size={18} />
              <span>Saldo Coinquilini</span>
            </h3>
            <button className="card-action-link" onClick={() => setCurrentTab('expenses')}>
              Vedi Spese <ArrowRight size={14} />
            </button>
          </div>
          {suggestedSettlements.length === 0 ? (
            <p className="empty-state">Tutti i conti sono in pareggio! 🎉</p>
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

        {/* Anteprima Scadenze Entro 7 Giorni */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={18} />
              <span>Scadenze (Prossimi 7 gg)</span>
            </h3>
            <button className="card-action-link" onClick={() => setCurrentTab('deadlines')}>
              Gestisci <ArrowRight size={14} />
            </button>
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

        {/* Anteprima Turni di Pulizia */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <CheckSquare size={18} />
              <span>Turni di Casa</span>
            </h3>
            <button className="card-action-link" onClick={() => setCurrentTab('tasks')}>
              Vedi Turni <ArrowRight size={14} />
            </button>
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

        {/* Anteprima Lista della Spesa (se attivata) */}
        {features.shopping_list !== false && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <ShoppingBag size={18} />
                <span>Lista della Spesa</span>
              </h3>
              <button className="card-action-link" onClick={() => setCurrentTab('shopping_list')}>
                Apri Lista <ArrowRight size={14} />
              </button>
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
        )}

        {/* Anteprima Prenotazioni Bagno (se attivata) */}
        {features.bathroom !== false && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Bath size={18} />
                <span>Prossime Prenotazioni Bagno</span>
              </h3>
              <button className="card-action-link" onClick={() => setCurrentTab('bathroom')}>
                Prenota <ArrowRight size={14} />
              </button>
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
        )}

        {/* Anteprima Registro Ospiti (se attivata) */}
        {features.guests !== false && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} />
                <span>Prossimi Ospiti</span>
              </h3>
              <button className="card-action-link" onClick={() => setCurrentTab('guests')}>
                Registro <ArrowRight size={14} />
              </button>
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
        )}

        {/* Anteprima ultime Regole della casa (se attivata) */}
        {features.rules !== false && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FileText size={18} />
                <span>Regole della Casa</span>
              </h3>
              <button className="card-action-link" onClick={() => setCurrentTab('rules')}>
                Tutte le Regole <ArrowRight size={14} />
              </button>
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
        )}

        {/* Anteprima Ultimi Messaggi in Bacheca */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <MessageSquare size={18} />
              <span>Bacheca Messaggi</span>
            </h3>
            <button className="card-action-link" onClick={() => setCurrentTab('board')}>
              Apri Bacheca <ArrowRight size={14} />
            </button>
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
      </div>
    </div>
  );
}
