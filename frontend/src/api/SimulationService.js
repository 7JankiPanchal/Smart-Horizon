import { createTransaction } from './client';

/**
 * Spoofs a high-risk transaction to demonstrate the ML pipeline working live.
 */
export const triggerHackathonSimulation = async () => {
  const payloads = [
    {
      amount: 125000,
      type: 'crypto',
      sender: '66feccad0000000000000000', // Mock Sender ID
      receiver: '66feccad0000000000000001', // Mock Receiver ID
      location: { country: 'IR', city: 'Tehran' }, // FATF Sanctioned
      ipAddress: '192.168.1.1',
    },
    {
      amount: 48000,
      type: 'wire',
      sender: '66feccad0000000000000002', 
      receiver: '66feccad0000000000000003',
      location: { country: 'NG', city: 'Lagos' }, // FATF High-Risk
      ipAddress: '41.190.2.100',
    }
  ];

  // Pick a random high-risk payload
  const payload = payloads[Math.floor(Math.random() * payloads.length)];
  
  try {
    const res = await createTransaction(payload);
    return res;
  } catch (error) {
    console.error('Simulation Failed:', error);
    throw error;
  }
};
