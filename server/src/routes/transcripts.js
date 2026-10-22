import express from 'express';
import { transcripts } from '../controllers/index.js';

const router = express.Router();

router.post('/transcripts', transcripts.create);
router.get('/transcripts', transcripts.list);
router.get('/transcripts/:id', transcripts.get);
router.get('/transcripts/:id/audio', transcripts.audio);
router.put('/transcripts/:id', transcripts.update);
router.delete('/transcripts/:id', transcripts.delete);

export default router;
