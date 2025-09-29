import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { body } from 'express-validator';

const router = Router();

router.post('/login', [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], login);

export default router;