import React, { useState, useEffect } from 'react';
import { Plus, Bath, Trash2, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function BathroomView({ 
  currentUser, 
  members = [], 
  bathroomSlots = [], 
  onAddBathroomSlot, 
  onDeleteBathroomSlot 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState(currentUser?.id || (members[0]?.id || ''));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!userId && (currentUser?.id || members[0]?.id)) {
      setUserId(currentUser?.id || members[0]?.id || '');
    }
  }, [members, currentUser]);

  // Helper per convertire l'ora "HH:MM" in minuti totali dall'inizio della giornata
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const newStart = timeToMinutes(startTime);
    const newEnd = newStart + Number(durationMinutes);

    // Controllo sovrapposizione orari nello stesso giorno
    const isOverlapping = bathroomSlots.some(slot => {
      if (slot.date !== date) return false;
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = slotStart + Number(slot.duration_minutes);
      return (newStart < slotEnd && newEnd > slotStart);
    });

    if (isOverlapping) {
      setErrorMsg('Attenzione! L\'orario scelto si sovrappone a una prenotazione già esistente per questo giorno.');
      return;
    }

    onAddBathroomSlot({
      user_id: userId,
      date,
      start_time: startTime,
      duration_minutes: Number(durationMinutes),
      notes: notes.trim()
    });

    setNotes('');
    setErrorMsg('');
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Prenotazione Turni Bagno
        </h2>
        <button className="btn btn-primary" onClick={() => { setErrorMsg(''); setIsModalOpen(true); }}>
          <Plus size={18} />
          Prenota Bagno
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Bath size={20} />
            <span>Prossime Prenotazioni</span>
          </h3>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{bathroomSlots.length} prenotazioni</span>
        </div>

        {bathroomSlots.length === 0 ? (
          <div className="empty-state">
            Nessuna prenotazione bagno inserita. Clicca su "Prenota Bagno" per riservare uno slot.
          </div>
        ) : (
          <div className="item-list">
            {bathroomSlots.map(slot => {
              const user = members.find(m => m.id === slot.user_id);
              const startMin = timeToMinutes(slot.start_time);
              const endMin = startMin + slot.duration_minutes;
              const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
              const endM = String(endMin % 60).padStart(2, '0');
              const endTimeStr = `${endH}:${endM}`;

              return (
                <div key={slot.id} className="item-row">
                  <div className="item-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="item-title">
                        {user?.full_name || 'Coinquilino'} — dalle {slot.start_time} alle {endTimeStr}
                      </span>
                      <span className="badge badge-neutral">{slot.duration_minutes} min</span>
                    </div>
                    <div className="item-meta">
                      <span>Giorno: {new Date(slot.date).toLocaleDateString('it-IT')}</span>
                      {slot.notes && <span>• Note: {slot.notes}</span>}
                    </div>
                  </div>

                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => onDeleteBathroomSlot(slot.id)}
                    title="Cancella prenotazione"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE NUOVA PRENOTAZIONE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Prenota uno slot per il bagno">
        <form onSubmit={handleCreate}>
          {errorMsg && (
            <div className="badge badge-danger" style={{ width: '100%', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Persona</label>
            <select
              className="form-control"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Giorno</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ora d'inizio</label>
            <input
              type="time"
              className="form-control"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Durata (in minuti)</label>
            <select
              className="form-control"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            >
              <option value={15}>15 minuti</option>
              <option value={30}>30 minuti</option>
              <option value={45}>45 minuti</option>
              <option value={60}>60 minuti (1 ora)</option>
              <option value={90}>90 minuti (1 ora e mezza)</option>
              <option value={120}>120 minuti (2 ore)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Note facoltative</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Doccia veloci, tinte per capelli..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Conferma Prenotazione
          </button>
        </form>
      </Modal>
    </div>
  );
}
