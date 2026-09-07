import React, { useState } from 'react';
import { Home, PlusCircle, LogIn, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured, getLocalState, saveLocalState } from '../lib/supabase';

export default function SetupHouseView({ currentUser, onHouseJoined }) {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [houseName, setHouseName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // Checkbox per le funzionalità opzionali
  const [features, setFeatures] = useState({
    rent: true,
    bills: true,
    groceries: true,
    products: true,
    guests: true,
    bathroom: true,
    rules: true,
    shopping_list: true
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleFeature = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateHouse = async (e) => {
    e.preventDefault();
    if (!houseName.trim()) {
      setErrorMsg('Inserisci il nome della tua casa (es. Casa Via Roma 42).');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('create_house', {
        p_name: houseName.trim(),
        p_features: features
      });
      setLoading(false);
      if (error) {
        setErrorMsg(error.message || 'Errore durante la creazione della casa.');
      } else {
        onHouseJoined();
      }
    } else {
      // Local fallback simulation
      setTimeout(() => {
        setLoading(false);
        const state = getLocalState();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'FS-';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const newHouse = {
          id: 'house-' + Date.now(),
          name: houseName.trim(),
          invite_code: code,
          created_by: currentUser?.id || 'demo-user-1',
          features
        };
        state.house = newHouse;
        state.members = [
          { id: currentUser?.id || 'demo-user-1', full_name: currentUser?.full_name || 'Tu', email: currentUser?.email || '', role: 'owner' }
        ];
        saveLocalState(state);
        onHouseJoined();
      }, 500);
    }
  };

  const handleJoinHouse = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Inserisci un codice invito valido nel formato FS-XXXXXX.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('join_house', {
        p_invite_code: cleanCode
      });
      setLoading(false);
      if (error) {
        setErrorMsg(error.message || 'Codice invito non valido o inesistente.');
      } else {
        onHouseJoined();
      }
    } else {
      // Local fallback simulation
      setTimeout(() => {
        setLoading(false);
        const state = getLocalState();
        if (cleanCode.length >= 5) {
          state.house = {
            ...state.house,
            name: state.house?.name || 'Casa Condivisa'
          };
          if (!state.members.some(m => m.id === currentUser.id)) {
            state.members.push({
              id: currentUser.id,
              full_name: currentUser.full_name,
              email: currentUser.email,
              role: 'member'
            });
          }
          saveLocalState(state);
          onHouseJoined();
        } else {
          setErrorMsg('Codice invito non valido. Il formato corretto è FS-XXXXXX.');
        }
      }, 400);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'var(--bg)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <Home size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
            Benvenuto in Fuorisede Facile!
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '4px' }}>
            Per iniziare, crea la tua casa condivisa o inserisci il codice fornito dai tuoi coinquilini.
          </p>
        </div>

        {/* Modalità: Crea vs Entra */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface-soft)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          <button
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontWeight: mode === 'create' ? 600 : 500,
              fontSize: '0.9rem',
              backgroundColor: mode === 'create' ? 'var(--surface)' : 'transparent',
              color: mode === 'create' ? 'var(--primary-dark)' : 'var(--muted)',
              boxShadow: mode === 'create' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => { setMode('create'); setErrorMsg(''); }}
          >
            <PlusCircle size={16} />
            Crea una casa
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontWeight: mode === 'join' ? 600 : 500,
              fontSize: '0.9rem',
              backgroundColor: mode === 'join' ? 'var(--surface)' : 'transparent',
              color: mode === 'join' ? 'var(--primary-dark)' : 'var(--muted)',
              boxShadow: mode === 'join' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => { setMode('join'); setErrorMsg(''); }}
          >
            <LogIn size={16} />
            Entra con codice
          </button>
        </div>

        {errorMsg && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreateHouse}>
            <div className="form-group">
              <label className="form-label">Nome della casa</label>
              <input
                type="text"
                className="form-control"
                placeholder="Es. Casa Garibaldi 12, Appartamento 4B..."
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
                Funzionalità da attivare nella casa:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { key: 'rent', label: 'Affitto' },
                  { key: 'bills', label: 'Bollette' },
                  { key: 'groceries', label: 'Spesa comune' },
                  { key: 'products', label: 'Prodotti casa' },
                  { key: 'shopping_list', label: 'Lista della spesa' },
                  { key: 'bathroom', label: 'Bagno (prenotazioni)' },
                  { key: 'guests', label: 'Registro Ospiti' },
                  { key: 'rules', label: 'Regole della casa' }
                ].map(item => (
                  <label 
                    key={item.key} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--surface-soft)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={features[item.key]}
                      onChange={() => toggleFeature(item.key)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creazione in corso...' : 'Crea nuova casa e genera codice'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinHouse}>
            <div className="form-group">
              <label className="form-label">Codice invito della casa</label>
              <input
                type="text"
                className="form-control"
                placeholder="FS-XXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '4px' }}>
                Richiedi il codice al coinquilino che ha creato la casa.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? 'Verifica codice...' : 'Entra nella casa'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
