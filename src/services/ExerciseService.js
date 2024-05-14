import Sequelize from "sequelize";
import { readOnlyProblemSequelize, systemSequelize, temporaryProblemSequelize } from "../models/orm/Sequelize.js";
import statementService from "./problem/StatementService.js";
import compareOutputService from "./problem/CompareOutputService.js";

class ExerciseService {
  async handleRawQueryStatement(statement, sequelizeInstance = readOnlyProblemSequelize, queryType){
    try {
      let executionTimeMs = 1e9;
      const config = { 
        raw: true, 
        plain: false, 
        benchmark: true,
        logging: (sql, timingMs) => {
          console.info(`${sql} - [Execution time: ${timingMs}ms]`);
          executionTimeMs = timingMs;
        }, 
      };
      if(queryType){
        config.type = Sequelize.QueryTypes[queryType];
      }
      const data = await sequelizeInstance.query(statement, config);
      console.log(">>> DATA", data);
      return {
        isSuccess: true,
        data,
        executionTimeMs
      };
    } catch (error) {
      return {
        isSuccess: false,
        error,
      };
    }
  }

  addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName){
    try {
      const lines = statement.split('\n').filter(line => line.length > 0);
      let insertedStatement = '';
      for(const line of lines){
        insertedStatement = `${insertedStatement}  ${line.replace(/'/g, '"').replace(new RegExp(fromTableName, 'g'), temporaryTableName)}`;
      }
      return insertedStatement.trim();
    } catch (error) {
      return null;
    }
  }

  async handleUserSubmitUpdateStatement(problemCode, statement, prefixTempTable, problemSqlType = null){
    try {
      const fromDatabaseName = `${process.env.DB_PROBLEM_READ_ONLY_NAME}`;
      const fromTableName = `Category`;
      const temporaryTableName = prefixTempTable + "_B20DCCN123_" + fromTableName;
      const limit = problemSqlType === 'INSERT' ? 0 : null;
       
      const insertedPrefixStatementOfUser = this.addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName);
      console.log(">>> insertedPrefixStatementOfUser", insertedPrefixStatementOfUser);
      const storeProcedureQuery = `
      CALL CreateAndQueryTemporaryTable('${temporaryTableName}', '${fromDatabaseName}.Category', ${limit}, '${insertedPrefixStatementOfUser}', "SELECT * FROM ${temporaryTableName};");
      `;
      console.log(">>> storeProcedureQuery", storeProcedureQuery);
      const temporaryTableRowsAfterExecute = await this.handleRawQueryStatement(storeProcedureQuery, temporaryProblemSequelize);
      console.log(">>> result", temporaryTableRowsAfterExecute);
      
      if(!temporaryTableRowsAfterExecute.isSuccess){
        return {
          submitStatus: "RTE",
          message: temporaryTableRowsAfterExecute.error.parent.code,
        };
      }

      const userOutput = {
        rows: temporaryTableRowsAfterExecute.data,
        affectedRows: null,
      };
      const compareOutput = await compareOutputService.compareUserOutput(userOutput, problemCode);
      console.log(">>> userOutput", userOutput);
      console.log(">>> compareOutput", compareOutput);
      
      return {
        executionTimeMs: temporaryTableRowsAfterExecute.executionTimeMs + 'ms',
        submitStatus: compareOutput.submitStatus,
      };
    } catch (error) {
      return {
        submitStatus: "ERROR",
        message: error.code,
      };
    }
  }

}

const exerciseService = new ExerciseService();
export default exerciseService;

