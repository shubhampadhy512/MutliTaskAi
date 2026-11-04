import express from 'express';
const router = express.Router();
import { SignInWithGoogle, Logout } from '../controllers/user.auth.js';

router.post('/login', SignInWithGoogle);

router.get('/logout', Logout);

export default router;