import submitionService from "../services/submition/SubmitionService.js";

class ContestController {
  async submitIssue(req, res){
    try {
      const {statement, executeType, issue, user} = req.body;

      const prefixTempTable = "tmp_reqId_002_" + user.username + "_";
  
      let result = null;
      if(executeType !== 'SELECT'){
        result = await submitionService.handleUserSubmitModifyStatement(issue, statement, prefixTempTable, executeType);
      } else if(executeType === "SELECT") {
        result = await submitionService.handleUserSubmitQueryStatement(issue, statement);
      }
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({
        meesage: error.meesage
      });
    }
  }
}
  
const contestController = new ContestController();
export default contestController;