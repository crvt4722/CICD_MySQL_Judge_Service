import Sequelize from "sequelize";
import { readOnlyProblemSequelize, systemSequelize, temporaryProblemSequelize } from "../../models/orm/Sequelize.js";
import statementService from "./StatementService.js";
import compareOutputService from "./CompareOutputService.js";

class ProblemService {
  async handleRawQueryStatement(statement, sequelizeInstance = readOnlyProblemSequelize, queryType){
    try {
      let executionTimeMs = -1;
      const config = { 
        raw: true, 
        plain: false, 
        benchmark: true,
        logging: (sql, timingMs) => {
          console.info(`${sql} - [Execution time: ${timingMs}ms]`);
          executionTimeMs = timingMs;
        }, 
        timeout: 1,
      };
      if(queryType){
        config.type = Sequelize.QueryTypes[queryType];
      }
      const data = await sequelizeInstance.query(statement, config);
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

  async handleEditQuery(statement){
    try {
      let executionTimeMs = -1;
      
      const [data] = await systemSequelize.query(statement, { raw: true, plain: false, benchmark: true,
        logging: (sql, timingMs) => {
          console.info(`${sql} - [Execution time: ${timingMs}ms]`);
          executionTimeMs = timingMs;
          
        }, 
      });
      return {
        data,
        executionTimeMs
      };
    } catch (error) {
      return error.message;
    }
  }

  async getTableListBySequelizeInstance(sequelizeInstance){
    try {
      const query = "SHOW TABLES";
      const results = await sequelizeInstance.query(query, { type: Sequelize.QueryTypes.SHOWTABLES });
      return results;
    } catch (error) {
      return [];
    }
  }

  async createTemporaryTable(sequelizeInstance, temporaryTableName, fromDatabaseName, fromTableName, config = null){
    try {
      let createTemporaryTableQuery = `
        CREATE TEMPORARY TABLE ${temporaryTableName}
        SELECT *
        FROM ${fromDatabaseName}.${fromTableName}
      `;
      if(config && `${config.limit}`){
        createTemporaryTableQuery += ` LIMIT ${config.limit}`;
      }
      const result = await sequelizeInstance.query(createTemporaryTableQuery);
    
      return {
        isSuccess: true,
        result,
      };
    } catch (error) {
      console.log(error.message);
      return {
        isSuccess: false,
        message: error.message,
      };
    }
  }

  async dropTemporaryTable(sequelizeInstance, temporaryTableName){
    try {
      const dropTemporaryTableQuery = `
        DROP TABLE ${temporaryTableName}
      `;
      const result = await sequelizeInstance.query(dropTemporaryTableQuery);
      return {
        isSuccess: true,
        result,
      };
    } catch (error) {
      console.log(error.message);
      return {
        isSuccess: false,
        message: error.message,
      };
    }
  }

  addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName){
    try {
      const lines = statement.split('\n').filter(line => line.length > 0);
      let insertedStatement = '';
      for(const line of lines){
        let words = line.split(' ').filter(word => word.length > 0);
        let insertedLine = words.reduce((result, word) => {
          return result + ' ' + (word === fromTableName ? temporaryTableName : word);
        }, '');
        insertedStatement = `${insertedStatement}\n${insertedLine}`;
      }
      return insertedStatement;
    } catch (error) {
      return null;
    }
  }

  async handleUserSubmitSelectStatement(problemCode, statement){
    console.log(">>> statement", statement);
    try {
      const executedUserStatementResult = await this.handleRawQueryStatement(statement, readOnlyProblemSequelize, 'SELECT');
      console.log(">>> executedUserStatementResult", executedUserStatementResult);
      if(executedUserStatementResult.isSuccess === false){
        throw new Error(executedUserStatementResult.error.message);
      }
      const userOutput = {
        rows: executedUserStatementResult.data,
      };
      const compareOutput = await compareOutputService.compareUserOutput(userOutput, problemCode);
      return {
        submitStatus: compareOutput.submitStatus,
        executionTimeMs: executedUserStatementResult.executionTimeMs + 'ms',
      };
    } catch (error) {
      console.log(error.message);
      return {
        submitStatus: 'ERROR',
        message: error.message,
      };
    }
  }
  async handleUserSubmitUpdateStatement(problemCode, statement, prefixTempTable, problemSqlType = null){
    try {
      // const readOnlyProblemTableList = await this.getTableListBySequelizeInstance(readOnlyProblemSequelize);
      const fromDatabaseName = `${process.env.DB_PROBLEM_READ_ONLY_NAME}`;
      const fromTableName = `Category`;
      const temporaryTableName = prefixTempTable + "_B20DCCN123_" + fromTableName;
      const config = problemSqlType === 'INSERT' ? {limit: 0} : null;
      const createTemporaryTableResult = await this.createTemporaryTable(temporaryProblemSequelize, temporaryTableName, fromDatabaseName, fromTableName, config);
      
      const insertedPrefixStatementOfUser = this.addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName);
      console.log(">>> insertedPrefixStatementOfUser", insertedPrefixStatementOfUser);
      
      const executedUserStatementResult = await this.handleRawQueryStatement(insertedPrefixStatementOfUser, temporaryProblemSequelize, 'UPDATE');
      console.log(">>> executedUserStatementResult", executedUserStatementResult);

      const temporaryTableRowsAfterExecute = await this.handleRawQueryStatement(statementService.getRawSelectQueryByTableName(temporaryTableName), temporaryProblemSequelize, 'SELECT');
      console.log(">>> temporaryTableRowsAfterExecute", temporaryTableRowsAfterExecute);

      const dropTemporaryTableResult = await this.dropTemporaryTable(temporaryProblemSequelize, temporaryTableName);

      if(executedUserStatementResult.isSuccess === false){
        throw new Error(executedUserStatementResult.error.message);
      }
      const userOutput = {
        rows: temporaryTableRowsAfterExecute.data,
        affectedRows: executedUserStatementResult.data[1],
      };
      const compareOutput = await compareOutputService.compareUserOutput(userOutput, problemCode);
      console.log(">>> compareOutput", compareOutput);
      
      return {
        executionTimeMs: executedUserStatementResult.executionTimeMs + 'ms',
        submitStatus: compareOutput.submitStatus,
      };
    } catch (error) {
      return {
        submitStatus: "ERROR",
        message: error.message,
      };
    }
  }

  async handleUserSubmitCreateTableStatement(problemCode, statement, prefixTempTable){
    try {
      const fromTableName = `Products`;
      const temporaryTableName = prefixTempTable + "_B20DCCN123_" + fromTableName;
      const insertedPrefixStatementOfUser = this.addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName);
      console.log(">>> insertedPrefixStatementOfUser", insertedPrefixStatementOfUser);

      await this.dropTemporaryTable(temporaryProblemSequelize, temporaryTableName);

      const executedUserStatementResult = await this.handleRawQueryStatement(insertedPrefixStatementOfUser, temporaryProblemSequelize, 'RAW');
      console.log(">>> executedUserStatementResult", executedUserStatementResult);

      const temporaryTableRowsAfterExecute = await this.handleRawQueryStatement(statementService.getTableStructureInfo(process.env.DB_PROBLEM_TEMPORARY_NAME, temporaryTableName), temporaryProblemSequelize, 'SELECT');
      console.log(">>> temporaryTableRowsAfterExecute", temporaryTableRowsAfterExecute);

      const userOutput = {
        rows: temporaryTableRowsAfterExecute.data,
      };
      const compareOutput = await compareOutputService.compareUserOutput(userOutput, problemCode);
      
      console.log(">>> compareOutput", compareOutput);
      const dropTemporaryTableResult = await this.dropTemporaryTable(temporaryProblemSequelize, temporaryTableName);
      return {
        executionTimeMs: executedUserStatementResult.executionTimeMs + 'ms',
        submitStatus: compareOutput.submitStatus,
      };
    } catch (error) {
      return {
        submitStatus: "ERROR",
        message: error.message,
      };
    }
  }
}

const problemService = new ProblemService();
export default problemService;

