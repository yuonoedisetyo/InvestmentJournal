export const sampleUser = {
  id: 7,
  name: 'Yedi Setyo',
  email: 'yedisetyo@gmail.com',
  phone: '08123456789',
};

export const samplePortfolios = [
  { id: 1, name: 'Utama', currency: 'IDR', is_active: true },
  { id: 2, name: 'Trading', currency: 'IDR', is_active: false },
];

export const samplePositions = [
  {
    stock_code: 'BBCA',
    total_shares: 200,
    average_price: 9000,
    invested_amount: 1800000,
    market_value: 1900000,
    unrealized_pnl: 100000,
    realized_pnl: 50000,
  },
];

export const sampleJournal = [
  {
    id: 10,
    entry_type: 'CASH',
    type: 'TOPUP',
    amount: 500000,
    transaction_date: '2026-03-21',
  },
];
