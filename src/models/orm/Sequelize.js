/* eslint-disable no-undef */
import Sequelize from "sequelize";
import 'dotenv/config';

export const baseSequelize = new Sequelize(
  process.env.DB_BASE_NAME,
  process.env.DB_BASE_USERNAME,
  process.env.DB_BASE_PASSWORD,
  {
    host: process.env.DB_BASE_HOST,
    port: process.env.DB_BASE_PORT,
    dialect: process.env.DB_BASE_TYPE,
    dialectOptions: {
      multipleStatements: true
    }
  },
);


export const readOnlyProblemSequelize = new Sequelize(
  process.env.DB_PROBLEM_READ_ONLY_NAME,
  process.env.DB_PROBLEM_READ_ONLY_USERNAME,
  process.env.DB_PROBLEM_READ_ONLY_PASSWORD,
  {
    host: process.env.DB_BASE_HOST,
    port: process.env.DB_BASE_PORT,
    dialect: process.env.DB_PROBLEM_READ_ONLY_TYPE,
  },
);

export const temporaryProblemSequelize = new Sequelize(
  process.env.DB_PROBLEM_TEMPORARY_NAME,
  process.env.DB_PROBLEM_TEMPORARY_USERNAME,
  process.env.DB_PROBLEM_TEMPORARY_PASSWORD,
  {
    host: process.env.DB_BASE_HOST,
    port: process.env.DB_BASE_PORT,
    dialect: process.env.DB_PROBLEM_TEMPORARY_TYPE,
  },
);


async function authenticateSequelize() {
  console.log("Try connect db...");
  await baseSequelize.authenticate();
  console.log("[MYSQL_JUDGE] Connect to baseSequelize successfully!");
  await readOnlyProblemSequelize.authenticate();
  console.log("[MYSQL_JUDGE] Connect to readOnlyProblemSequelize successfully!");
  await temporaryProblemSequelize.authenticate();
  console.log("[MYSQL_JUDGE] Connect to temporaryProblemSequelize successfully!");
}

export default authenticateSequelize;