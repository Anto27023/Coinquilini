import React, { useState } from 'react';
import { Home, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured, getLocalState, saveLocalState } from '../lib/supabase';

export default function AuthView({ onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const translateError = (err) => {
    if (!err) return '';
    const msg = err.message || String(err);
    if (msg.includes('Invalid login credentials')) return 'Email o password non corretti.';
    if (msg.includes('User already registered')) return 'Esiste già un account con questa email.';
    if (msg.includes('Password should be at least')) return 'La password deve contenere almeno 6 caratteri.';
    if (msg.includes('Unable to validate email')) return 'Formato email non valido.';
    return msg || 'Si è verificato un errore. Riprova.';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password) {
      setErrorMsg('Inserisci email e password per accedere.');
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setErrorMsg(translateError(error));
      } else if (data?.user) {
        onAuthSuccess(data.user);
      }
    } else {
      // Local Fallback Login Simulation
      setTimeout(() => {
        setLoading(false);
        const state = getLocalState();
        const user = { ...state.user, email, full_name: fullName || 'Marco Rossi' };
        state.user = user;
        saveLocalState(state);
        onAuthSuccess(user);
      }, 400);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!fullName || !email || !password) {
      setErrorMsg('Tutti i campi sono obbligatori.');
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      setLoading(false);
      if (error) {
        setErrorMsg(translateError(error));
      } else {
        setSuccessMsg('Registrazione completata, controlla l\'email per confermare l\'account.');
      }
    } else {
      // Local Fallback Register Simulation
      setTimeout(() => {
        setLoading(false);
        const state = getLocalState();
        const newUser = {
          id: 'user-' + Date.now(),
          email,
          full_name: fullName,
          avatar_url: '',
          iban: '',
          paypal: '',
          revolut: '',
          satispay: ''
        };
        state.user = newUser;
        saveLocalState(state);
        setSuccessMsg('Registrazione completata, controlla l\'email per confermare l\'account.');
        setTimeout(() => onAuthSuccess(newUser), 1200);
      }, 500);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg('Inserisci la tua email per ricevere il link di ripristino.');
      return;
    }
    setLoading(true);
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);
      if (error) {
        setErrorMsg(translateError(error));
      } else {
        setSuccessMsg('Email di ripristino inviata! Controlla la tua casella di posta.');
        setShowForgot(false);
      }
    } else {
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg('Email di ripristino inviata! Controlla la tua casella di posta.');
        setShowForgot(false);
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
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '36px 32px' }}>
        {/* Brand Header */}
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
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
            Coinquilini
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginTop: '4px' }}>
            La PWA per gestire la tua casa condivisa
          </p>
        </div>

        {/* Tab Switcher */}
        {!showForgot && (
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
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: activeTab === 'login' ? 600 : 500,
                fontSize: '0.9rem',
                backgroundColor: activeTab === 'login' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'login' ? 'var(--primary-dark)' : 'var(--muted)',
                boxShadow: activeTab === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Accedi
            </button>
            <button
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: activeTab === 'register' ? 600 : 500,
                fontSize: '0.9rem',
                backgroundColor: activeTab === 'register' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'register' ? 'var(--primary-dark)' : 'var(--muted)',
                boxShadow: activeTab === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
              onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Registrati
            </button>
          </div>
        )}

        {/* Messaggi di errore o successo */}
        {errorMsg && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="badge badge-success" style={{ width: '100%', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Password Dimenticata */}
        {showForgot ? (
          <form onSubmit={handleForgotPassword}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary-dark)' }}>
              Password dimenticata
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '16px' }}>
              Inserisci l'indirizzo email con cui ti sei registrato. Ti invieremo un link per impostare una nuova password.
            </p>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? 'Invio in corso...' : 'Invia email di ripristino'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: '8px' }}
              onClick={() => setShowForgot(false)}
            >
              Torna all'accesso
            </button>
          </form>
        ) : activeTab === 'login' ? (
          /* Form Login */
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setErrorMsg(''); setSuccessMsg(''); }}
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}
                >
                  Password dimenticata?
                </button>
              </div>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        ) : (
          /* Form Registrazione */
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Es. Mario Rossi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Minimo 6 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Registrazione...' : 'Crea account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
