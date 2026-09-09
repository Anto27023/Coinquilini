import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Moon, Sun } from 'lucide-react';
import Modal from '../components/Modal';

export default function GuestsView({ 
  currentUser, 
  members = [], 
  guests = [], 
  onAddGuest, 
  onDeleteGuest 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [hostId, setHostId] = useState(currentUser?.id || (members[0]?.id || ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staysOvernight, setStaysOvernight] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!hostId && (currentUser?.id || members[0]?.id)) {
      setHostId(currentUser?.id || members[0]?.id || '');
    }
  }, [members, currentUser]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    onAddGuest({
      guest_name: guestName.trim(),
      host_id: hostId || currentUser?.id,
      date,
      stays_overnight: staysOvernight,
      notes: notes.trim()
    });

    setGuestName('');
    setNotes('');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Registro Ospiti della Casa
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Annuncia Ospite
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Users size={20} />
            <span>Ospiti Annunciati</span>
          </h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{guests.length} annunci</span>
        </div>

        {guests.length === 0 ? (
          <div className="empty-state">
            Nessun ospite annunciato. Clicca su "Annuncia Ospite" per informare i tuoi coinquilini.
          </div>
        ) : (
          <div className="item-list">
            {guests.map(g => {
              const host = members.find(m => m.id === g.host_id);
              return (
                <div key={g.id} className="item-row">
                  <div className="item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="item-title">{g.guest_name}</span>
                      <span className={`badge ${g.stays_overnight ? 'badge-warning' : 'badge-neutral'}`}>
                        {g.stays_overnight ? 'Pernotta' : 'Visita diurna'}
                      </span>
                    </div>
                    <div className="item-meta">
                      <span>Invitato da: <strong>{host?.full_name || 'Coinquilino'}</strong></span>
                      <span>•</span>
                      <span>Data arrivo: {new Date(g.date).toLocaleDateString('it-IT')}</span>
                      {g.notes && <span>• Note: {g.notes}</span>}
                    </div>
                  </div>

                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => onDeleteGuest(g.id)}
                    title="Rimuovi ospite"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE NUOVO OSPITE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Annuncia l'arrivo di un ospite">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nome dell'ospite</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Marco Rossi (amico d'infanzia)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invitato da</label>
            <select
              className="form-control"
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Data dell'arrivo</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '8px' }}>Si ferma a dormire?</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label className={`chip ${!staysOvernight ? 'selected' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                <input
                  type="radio"
                  name="overnight"
                  checked={!staysOvernight}
                  onChange={() => setStaysOvernight(false)}
                  style={{ display: 'none' }}
                />
                Solo visita diurna
              </label>
              <label className={`chip ${staysOvernight ? 'selected' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                <input
                  type="radio"
                  name="overnight"
                  checked={staysOvernight}
                  onChange={() => setStaysOvernight(true)}
                  style={{ display: 'none' }}
                />
                Pernotta a casa
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Note facoltative</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Dorme sul divano in soggiorno..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Salva Annuncio Ospite
          </button>
        </form>
      </Modal>
    </div>
  );
}
