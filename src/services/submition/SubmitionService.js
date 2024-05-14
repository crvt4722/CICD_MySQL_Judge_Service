/* eslint-disable no-undef */
import Sequelize from "sequelize";
import { readOnlyProblemSequelize, baseSequelize, temporaryProblemSequelize } from "../../models/orm/Sequelize.js";
import compareOutputService from "./CompareOutputService.js";

class SubmitionService {
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

  getAfterExecuteQuery(executeType, schemaName, tableName){
    if(executeType === "ALTER_TABLE" ){
      return `
        "DESCRIBE ${schemaName}.${tableName};"
      `;
    } else if(executeType === "CREATE_TABLE"){
      return `
      "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${schemaName}' AND TABLE_NAME = '${tableName}';"
    `;
    }
    return `"SELECT * FROM ${tableName};"`;
    
  }

  async handleUserSubmitModifyStatement(issue, statement, prefixTempTable, executeType = null){
    try {
      const fromDatabaseName = `${process.env.DB_PROBLEM_READ_ONLY_NAME}`;
      const tempDatabaseName = `${process.env.DB_PROBLEM_TEMPORARY_NAME}`;
      const fromTableName = issue.useTables;
      const temporaryTableName = prefixTempTable + fromTableName;
      const limit = (executeType === 'INSERT' || executeType === 'ALTER_TABLE') ? 0 : null;
       
      console.log(">>> fromTableName", fromTableName);
      const insertedPrefixStatementOfUser = this.addPrefixTempTableIntoStatement(statement, temporaryTableName, fromTableName);
      console.log(">>> insertedPrefixStatementOfUser", insertedPrefixStatementOfUser);
      if(insertedPrefixStatementOfUser.includes(temporaryTableName) == false){
        return {
          submitStatus: "RTE",
          message: '',
        };
      }
      const isNeedToCreateTempTable = executeType !== "CREATE_TABLE";
      const storeProcedureQuery = `
        CALL CreateAndQueryTemporaryTable('${temporaryTableName}', '${fromDatabaseName}.${isNeedToCreateTempTable ? fromTableName : "empty_temp"}', ${limit}, '${insertedPrefixStatementOfUser}', ${this.getAfterExecuteQuery(executeType, tempDatabaseName, temporaryTableName)});
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

      if(parseFloat(temporaryTableRowsAfterExecute.executionTimeMs) > parseFloat(issue.limitedTime)){
        return {
          submitStatus: "LTE",
          executionTimeMs: temporaryTableRowsAfterExecute.executionTimeMs + 'ms',
        };
      }

      const compareOutput = await compareOutputService.compareUserOutput(userOutput, issue.testcases[0].outputPath); // TODO: handle multiple testcase
      console.log(">>> userOutput", userOutput);
      console.log(">>> compareOutput", compareOutput);
      
      return {
        executionTimeMs: temporaryTableRowsAfterExecute.executionTimeMs + 'ms',
        submitStatus: compareOutput.submitStatus,
      };
    } catch (error) {
      console.log(">>> error", error);
      return {
        submitStatus: "ERROR",
        message: error.code,
      };
    }
  }

  async handleUserSubmitQueryStatement(issue, statement){
    try {
      const executedUserStatementResult = await this.handleRawQueryStatement(statement, readOnlyProblemSequelize, 'SELECT');
      if(executedUserStatementResult.isSuccess === false){
        throw new Error(executedUserStatementResult.error.message);
      }
      const userOutput = {
        rows: executedUserStatementResult.data,
      };
      console.log(">>> executedUserStatementResult.data", executedUserStatementResult.data);

      if(parseFloat(executedUserStatementResult.executionTimeMs) > parseFloat(issue.limitedTime)){
        return {
          submitStatus: "LTE",
          executionTimeMs: executedUserStatementResult.executionTimeMs + 'ms',
        };
      }

      const compareOutput = await compareOutputService.compareUserOutput(userOutput, issue.testcases[0].outputPath); // TODO: handle multiple testcases
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

  /**
   * Solution to handle modify statement of user: 
   * - Create isolated environment (create a specific database to execute the statement, then drop the database)
   * @param {*} issue 
   * @param {*} statement 
   * @param {*} prefixTempTable 
   * @param {*} executeType 
   * @returns 
   */
  async handleUserSubmitModifyStatementV2(issue, statement, prefixTempTable, executeType = null){
    try {
      // user root (baseSequelize) create temp database for this submit query
      const createDBStatement = "CREATE SCHEMA `B20DCCN_tmp_123`;";
      const temporaryDB = await this.handleRawQueryStatement(createDBStatement, baseSequelize);
      console.log(">>>  temporaryDB", temporaryDB);
      // user temporaryProblemSequelize run user's statement
      const userStatementOutput = await this.handleRawQueryStatement(statement, temporaryProblemSequelize);
      console.log(">>> userStatementOutput", userStatementOutput);
      // user root drop temp database
    } catch (error) {
      return null;
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

const submitionService = new SubmitionService();
export default submitionService;

