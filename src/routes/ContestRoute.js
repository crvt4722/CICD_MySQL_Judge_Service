import express from 'express';
import ContestController from '../controllers/ContestController.js';
const contestRoute = express.Router();

contestRoute.post('/submit', ContestController.submitIssue);

export default contestRoute;

