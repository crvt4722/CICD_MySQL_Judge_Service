import fs from 'fs';
import submitionService from "../submition/SubmitionService.js";
import { baseSequelize, readOnlyProblemSequelize } from '../../models/orm/Sequelize.js';
class ManageIssueService {
  async createEnvironmentForIssue(statement){
    const result = await submitionService.handleRawQueryStatement(statement, baseSequelize);
    return result;
  }

  async runIssueSolutionStatement(statement, executeType){
    const result = await submitionService.handleRawQueryStatement(statement, readOnlyProblemSequelize, executeType);
    return result;
  }

  saveResultToFile(result, fileName){
    const filePath = `${process.cwd()}/src/data/${fileName}`;
    const jsonData = JSON.stringify(result);
    fs.writeFileSync(filePath, jsonData, { encoding: 'utf-8' });
    return fileName;
  }
}

const manageIssueService = new ManageIssueService();
export default manageIssueService;

