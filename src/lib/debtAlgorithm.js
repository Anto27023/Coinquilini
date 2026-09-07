/**
 * Algoritmo di compensazione minima dei debiti e crediti tra coinquilini.
 * 
 * Calcola i saldi netti di ogni persona e produce la lista minima di trasferimenti
 * di denaro (rimborsi) necessari per pareggiare perfettamente i conti.
 */

export function calculateBalancesAndSettlements(expenses = [], settlements = [], members = []) {
  const memberMap = new Map();
  const balances = new Map();

  // Inizializza saldi a 0 per tutti i membri
  members.forEach(member => {
    memberMap.set(member.id, member);
    balances.set(member.id, 0);
  });

  // 1. Elabora ogni spesa
  expenses.forEach(exp => {
    const amount = Number(exp.amount) || 0;
    const paidBy = exp.paid_by;
    const participants = exp.participants || [];

    if (amount <= 0 || participants.length === 0) return;

    const perPersonShare = amount / participants.length;

    // Chi ha pagato incrementa il suo credito dell'importo totale
    if (balances.has(paidBy)) {
      balances.set(paidBy, balances.get(paidBy) + amount);
    }

    // Ogni partecipante decrementa il suo saldo della propria quota
    participants.forEach(pId => {
      if (balances.has(pId)) {
        balances.set(pId, balances.get(pId) - perPersonShare);
      }
    });
  });

  // 2. Elabora i rimborsi già effettuati (settlements)
  settlements.forEach(set => {
    const amount = Number(set.amount) || 0;
    const payerId = set.payer_id;
    const receiverId = set.receiver_id;

    if (amount <= 0) return;

    // Chi ha inviato il rimborso (payer) aumenta il suo saldo netto (ha pagato il debito)
    if (balances.has(payerId)) {
      balances.set(payerId, balances.get(payerId) + amount);
    }
    // Chi ha ricevuto il rimborso (receiver) riduce il suo credito
    if (balances.has(receiverId)) {
      balances.set(receiverId, balances.get(receiverId) - amount);
    }
  });

  // Costruisci lista saldi dettagliati
  const balanceList = Array.from(balances.entries()).map(([userId, netBalance]) => {
    const roundedBalance = Math.round(netBalance * 100) / 100;
    return {
      userId,
      user: memberMap.get(userId) || { id: userId, full_name: 'Coinquilino' },
      netBalance: roundedBalance
    };
  });

  // 3. Algoritmo di compensazione dei debiti
  const debtors = [];
  const creditors = [];

  balanceList.forEach(item => {
    if (item.netBalance < -0.01) {
      debtors.push({ userId: item.userId, amount: Math.abs(item.netBalance) });
    } else if (item.netBalance > 0.01) {
      creditors.push({ userId: item.userId, amount: item.netBalance });
    }
  });

  // Ordina debitori e creditori per importo decrescente per ottimizzare i trasferimenti
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggestedSettlements = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    const roundedTransfer = Math.round(transferAmount * 100) / 100;

    if (roundedTransfer > 0) {
      suggestedSettlements.push({
        from: memberMap.get(debtor.userId) || { id: debtor.userId, full_name: 'Coinquilino' },
        to: memberMap.get(creditor.userId) || { id: creditor.userId, full_name: 'Coinquilino' },
        amount: roundedTransfer
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (Math.round(debtor.amount * 100) <= 0) i++;
    if (Math.round(creditor.amount * 100) <= 0) j++;
  }

  return {
    balanceList,
    suggestedSettlements
  };
}

/**
 * Formatta un importo numerico nel formato monetario italiano (es. "24,00 €")
 */
export function formatEuro(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(num);
}
