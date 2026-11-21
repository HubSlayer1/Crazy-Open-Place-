import express from 'express';
import { getStorefrontCatalog, listPublicPackages } from '../services/packageService.ts';

export function createStorefrontRouter() {
  const router = express.Router();

  router.get('/api/storefront', async (_req, res) => {
    try {
      const data = await getStorefrontCatalog();
      res.json(data);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load storefront.',
      });
    }
  });

  router.get('/api/packages', async (_req, res) => {
    try {
      const packages = await listPublicPackages();
      res.json({ packages });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load packages.',
      });
    }
  });

  return router;
}
