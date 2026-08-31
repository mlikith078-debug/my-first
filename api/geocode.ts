import { geocode } from '../lib/weather';
export default async function handler(req: any, res: any) { try { const q = String(req.query.q || '').trim(); if (q.length < 2) return res.status(200).json([]); return res.status(200).json(await geocode(q)); } catch (error: any) { console.error('geocode:', error); return res.status(500).json({ error: error.message || 'Location search failed' }); } }
