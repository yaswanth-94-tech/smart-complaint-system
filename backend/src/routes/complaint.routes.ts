import { Router } from 'express';
import {
  analyzeComplaint,
  checkDuplicates,
  analyzeImage,
} from '../controllers/complaint.controller';

const router = Router();

router.post('/analyze', analyzeComplaint);
router.post('/check-duplicates', checkDuplicates);
router.post('/analyze-image', analyzeImage);

export default router;
