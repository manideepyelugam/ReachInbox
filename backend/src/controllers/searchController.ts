import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { searchEmailsInEs } from '../services/elasticsearchService';

/**
 * Live search endpoint querying Elasticsearch
 */
export async function searchEmails(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { q, status, page = '1', limit = '50' } = req.query;

    const from = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const size = parseInt(limit as string, 10);

    const result = await searchEmailsInEs({
      userId,
      query: (q as string) || '',
      status: (status as string) || undefined,
      from,
      size,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: 'Search failed', message: error.message });
  }
}
