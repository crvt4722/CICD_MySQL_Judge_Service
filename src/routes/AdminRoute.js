import express from 'express';
import AdminController from '../controllers/AdminController.js';
const adminRouter = express.Router();

adminRouter.get('/hello', AdminController.handleHello);

export default adminRouter;

