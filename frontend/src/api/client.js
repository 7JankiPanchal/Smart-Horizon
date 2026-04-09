import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Transactions ──
export const fetchTransactions = (params = {}) =>
  client.get('/transactions', { params }).then((r) => r.data);

export const fetchTransaction = (id) =>
  client.get(`/transactions/${id}`).then((r) => r.data);

export const createTransaction = (data) =>
  client.post('/transactions', data).then((r) => r.data);

export const updateTransactionStatus = (id, status) =>
  client.patch(`/transactions/${id}/status`, { status }).then((r) => r.data);

// ── Investigations ──
export const fetchInvestigations = (params = {}) =>
  client.get('/investigations', { params }).then((r) => r.data);

export const fetchInvestigation = (id) =>
  client.get(`/investigations/${id}`).then((r) => r.data);

export const takeAction = (id, action, reviewedBy = 'Compliance Officer', reviewNotes = '') =>
  client.patch(`/investigations/${id}/action`, { action, reviewedBy, reviewNotes }).then((r) => r.data);

// ── Users ──
export const fetchUsers = (params = {}) =>
  client.get('/users', { params }).then((r) => r.data);

export const fetchUser = (id) =>
  client.get(`/users/${id}`).then((r) => r.data);

export default client;
