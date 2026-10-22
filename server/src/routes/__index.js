import express from 'express';
import transcripts from './transcripts.js';

const router = express.Router();

router.use('/', transcripts);

export default router;
