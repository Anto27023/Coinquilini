import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Check, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';

export default function ShoppingListView({ 
  currentUser, 
  members = [], 
  shoppingList = [], 
  onAddItem, 
  onToggleItemPurchased, 
  onDeleteItem 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [requestedBy, setRequestedBy] = useState(currentUser?.id || (members[0]?.id || ''));

  useEffect(() => {
    if (!requestedBy && (currentUser?.id || members[0]?.id)) {
      setRequestedBy(currentUser?.id || members[0]?.id || '');
    }
  }, [members, currentUser]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    onAddItem({
      item_name: itemName.trim(),
      quantity: quantity.trim(),
      requested_by: requestedBy ? requestedBy : null
    });

    setItemName('');
    setQuantity('');
    setIsModalOpen(false);
  };

  const pendingItems = shoppingList.filter(item => !item.is_purchased);
  const purchasedItems = shoppingList.filter(item => item.is_purchased);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
          Lista della Spesa Condivisa
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Aggiungi Articolo
        </button>
      </div>

      {/* Articoli Da Comprare */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h3 className="card-title text-warning">
            <ShoppingBag size={20} />
            <span>Da Comprare ({pendingItems.length})</span>
          </h3>
        </div>

        {pendingItems.length === 0 ? (
          <div className="empty-state">
            La lista della spesa è vuota! Nessun articolo da comprare al momento.
          </div>
        ) : (
          <div className="item-list">
            {pendingItems.map(item => {
              const requester = members.find(m => m.id === item.requested_by);
              return (
                <div key={item.id} className="item-row">
                  <div className="item-info">
                    <span className="item-title">{item.item_name}</span>
                    <div className="item-meta">
                      {item.quantity && <span>Quantità: <strong>{item.quantity}</strong></span>}
                      {item.quantity && <span>•</span>}
                      <span>Richiesto da: {requester?.full_name || 'Coinquilino'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => onToggleItemPurchased(item.id)}
                    >
                      <Check size={14} />
                      Preso!
                    </button>

                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => onDeleteItem(item.id)}
                      title="Elimina articolo"
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

      {/* Articoli Già Presi */}
      {purchasedItems.length > 0 && (
        <div className="card" style={{ opacity: 0.85 }}>
          <div className="card-header">
            <h3 className="card-title text-muted">
              <CheckCircle2 size={20} />
              <span>Già Presi ({purchasedItems.length})</span>
            </h3>
          </div>

          <div className="item-list">
            {purchasedItems.map(item => (
              <div key={item.id} className="item-row" style={{ backgroundColor: 'var(--surface-soft)' }}>
                <div className="item-info">
                  <span className="item-title" style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>
                    {item.item_name}
                  </span>
                  {item.quantity && <span className="item-meta">Quantità: {item.quantity}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onToggleItemPurchased(item.id)}
                  >
                    <RotateCcw size={14} />
                    Rimetti in lista
                  </button>

                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => onDeleteItem(item.id)}
                    title="Elimina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALE NUOVO ARTICOLO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aggiungi articolo alla lista">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Nome articolo</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. Latte parzialmente scremato, Olio EVO..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quantità facoltativa</label>
            <input
              type="text"
              className="form-control"
              placeholder="Es. 2 bottiglie, 1 pacco da 6..."
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Chi lo ha richiesto?</label>
            <select
              className="form-control"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            Aggiungi in Lista
          </button>
        </form>
      </Modal>
    </div>
  );
}
