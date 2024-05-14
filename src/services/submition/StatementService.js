class StatementService {
  getRawSelectQueryByTableName(tableName){
    const select = `
      SELECT *
      FROM ${tableName}
    `;
    return select;
  }

  getTableStructureInfo(schemaName, tableName){
    const select = `
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${schemaName}' AND TABLE_NAME = '${tableName}';
    `;
    return select;
  }
}

const statementService = new StatementService();
export default statementService;