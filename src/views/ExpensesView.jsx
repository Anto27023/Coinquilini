import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, ArrowRight, Trash2, CheckCircle2, UserCheck, DollarSign } from 'lucide-react';
import Modal from '../components/Modal';
import { formatEuro } from '../lib/debtAlgorithm';

export default function ExpensesView({ 
  currentUser, 
  members = [], 
  expenses = [], 
  settlements = [], 
  features = {}, 
  onAddExpense, 
  onDeleteExpense, 
  onAddSettlement,
  balancesObj
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Form stato nuova spesa
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Spesa comune');
  const [paidBy, setPaidBy] = useState(currentUser?.id || (members[0]?.id || ''));
  const [selectedParticipants, setSelectedParticipants] = useState(members.map(m => m.id));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form stato nuovo rimborso
  const [settlePayer, setSettlePayer] = useState(currentUser?.id || '');
  const [settleReceiver, setSettleReceiver] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  useEffect(() => {
    if (members.length > 0) {
      if (!paidBy) {
        setPaidBy(currentUser?.id || members[0]?.id || '');
      }
      if (selectedParticipants.length === 0) {
        setSelectedParticipants(members.map(m => m.id));
      }
    }
  }, [members, currentUser]);

  // Categorie disponibili in base ai feature flag attivi + default
  const categories = [];
  if (features.rent !== false) categories.push('Affitto');
  if (features.bills !== false) categories.push('Bollette');
  if (features.groceries !== false) categories.push('Spesa comune');
  if (features.products !== false) categories.push('Prodotti casa');
  categories.push('Manutenzione', 'Altro');

  const toggleParticipant = (memberId) => {
    if (selectedParticipants.includes(memberId)) {
      if (selectedParticipants.length > 1) {
        setSelectedParticipants(selectedParticipants.filter(id => id !== memberId));
      }
    } else {
      setSelectedParticipants([...selectedParticipants, memberId]);
    }
  };

  const handleCreateExpense = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) return;

    onAddExpense({
      description: description.trim(),
      amount: numAmount,
      category,
      paid_by: paidBy,
      participants: selectedParticipants,
      date
    });

    // Reset form
    setDescription('');
    setAmount('');
    setIsModalOpen(false);
  };

  const handleCreateSettlement = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(settleAmount.replace(',', '.'));
    if (!settlePayer || !settleReceiver || settlePayer === settleReceiver || isNaN(numAmount) || numAmount <= 0) return;

    onAddSettlement({
      payer_id: settlePayer,
      receiver_id: settleReceiver,
      amount: numAmount,
      date: new Date().toISOString().split('T')[0]
    });

    setSettleAmount('');
    setIsSettlementModalOpen(false);
  };

  const { balanceList = [], suggestedSettlements = [] } = balancesObj || {};

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Gestione Spese e Saldi
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsSettlementModalOpen(true)}>
            <DollarSign size={16} />
            Registra Rimborso
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Aggiungi Spesa
          </button>
        </div>
      </div>

      {/* Riquadro Saldi & Compensazioni Minime */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <h3 className="card-title">
            <CreditCard size={20} />
            <span>Compensazione Automatica Conti</span>
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Saldi netti individuali */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Saldi Netti Personali
            </h4>
            <div className="item-list">
              {balanceList.map(b => (
                <div key={b.userId} className="item-row">
                  <div className="item-info">
                    <span className="item-title">{b.user.full_name}</span>
                    <span className="item-meta">
                      {b.netBalance > 0 ? 'A credito' : b.netBalance < 0 ? 'A debito' : 'In pareggio'}
                    </span>
                  </div>
                  <span className={`badge ${b.netBalance > 0 ? 'badge-success' : b.netBalance < 0 ? 'badge-danger' : 'badge-muted'}`} style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {formatEuro(b.netBalance)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trasferimenti minimi suggeriti */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Rimborso Minimo Suggerito
            </h4>
            {suggestedSettlements.length === 0 ? (
              <div className="empty-state" style={{ backgroundColor: 'var(--surface-soft)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                Tutti i conti sono perfettamente pareggiati! 👍
              </div>
            ) : (
              <div className="item-list">
                {suggestedSettlements.map((s, idx) => (
                  <div key={idx} className="item-row" style={{ backgroundColor: 'var(--primary-soft)', borderColor: 'var(--primary-soft)' }}>
                    <div className="item-info">
                      <span className="item-title" style={{ fontSize: '0.9rem' }}>
                        <strong>{s.from.full_name}</strong> paga a <strong>{s.to.full_name}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {formatEuro(s.amount)}
                      </span>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSettlePayer(s.from.id);
                          setSettleReceiver(s.to.id);
                          setSettleAmount(String(s.amount));
                          setIsSettlementModalOpen(true);
                        }}
                      >
                        Salda
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storico Cronologico Spese Inserite */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Storico Spese</h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{expenses.length} spese registrate</span>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">
            Nessuna spesa presente. Clicca su "Aggiungi Spesa" per registrane una.
          </div>
        ) : (
          <div className="item-list">
            {expenses.map(exp => {
              const payer = members.find(m => m.id === exp.paid_by);
              const partCount = exp.participants ? exp.participants.length : members.length;

              return (
                <div key={exp.id} className="item-row">
                  <div className="item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="item-title">{exp.description}</span>
                      <span className="badge badge-muted">{exp.category}</span>
                    </div>
                    <div className="item-meta">
                      <span>Pagato da: <strong>{payer?.full_name || 'Coinquilino'}</strong></span>
                      <span>•</span>
                      <span>Diviso tra {partCount} pers.</span>
                      <span>•</span>
                      <span>Data: {new Date(exp.date).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      {formatEuro(exp.amount)}
                    </span>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => onDeleteExpense(exp.id)}
                      title="Elimina spesa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE AGGIUNGI SPESA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aggiungi una nuova spesa">
        <form onSubmit={handleCreateExpense}>
          <div className="form-group">
            <label className="form-label">Cosa hai pagato?</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Spesa supermercato, Bolletta luce..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Importo (€)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. 24,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Chi ha pagato?</label>
            <select
              className="form-control"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '8px' }}>Tra chi va divisa la spesa?</label>
            <div className="chip-container">
              {members.map(m => {
                const isSelected = selectedParticipants.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleParticipant(m.id)}
                  >
                    {m.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Data pagamento</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Salva Spesa
          </button>
        </form>
      </Modal>

      {/* MODALE REGISTRA RIMBORSO */}
      <Modal isOpen={isSettlementModalOpen} onClose={() => setIsSettlementModalOpen(false)} title="Registra un rimborso effettuato">
        <form onSubmit={handleCreateSettlement}>
          <div className="form-group">
            <label className="form-label">Chi ha pagato il rimborso? (Debitore)</label>
            <select
              className="form-control"
              value={settlePayer}
              onChange={(e) => setSettlePayer(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Chi ha ricevuto il denaro? (Creditore)</label>
            <select
              className="form-control"
              value={settleReceiver}
              onChange={(e) => setSettleReceiver(e.target.value)}
            >
              <option value="">Seleziona coinquilino...</option>
              {members.filter(m => m.id !== settlePayer).map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Importo rimborsato (€)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. 15,00"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Conferma e Salda Rimborso
          </button>
        </form>
      </Modal>
    </div>
  );
}
