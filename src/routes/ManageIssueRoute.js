import express from 'express';
import ManageIssueController from '../controllers/ManageIssueController.js';
const manageIssueRoute = express.Router();

manageIssueRoute.post('/create-issue', ManageIssueController.createIssue);

export default manageIssueRoute;

