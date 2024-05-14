/* eslint-disable no-undef */
import _ from "lodash";
import fs from 'fs';
class CompareOutputService {
  async compareUserOutput(userOutput, problemOutputFileName){
    try {
      const filePath = `${process.cwd()}/src/data/${problemOutputFileName}`;
      const problemOutputJson = fs.readFileSync(filePath, 'utf8');
      const problemOutputObject = JSON.parse(problemOutputJson);
      let isCorrect = true;
      for(const key of Object.keys(problemOutputObject)){
        console.log(">>> key", key);
        if(!userOutput[key] || _.isEqual(userOutput[key], problemOutputObject[key]) === false){
          isCorrect = false;
          break;
        }
      }
      return {
        submitStatus: isCorrect ? "AC" : "WA",
      };
    } catch (error) {
      return {
        submitStatus: "ERROR_COMPARE",
        error,
      };
    }
  }
}

const compareOutputService = new CompareOutputService();
export default compareOutputService;