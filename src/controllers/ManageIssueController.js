
import manageIssueService from '../services/manage-issue/ManageIssueService.js';
class ManageIssueController {
  async createIssue(req, res){
    try {
      const {issue} = req.body;
      console.log(">>> issue", issue);
      if(issue.environment && issue.environment.createTestcaseResult){
        if(issue.environment.createEnvironmentCode){
          const environmentResult = await manageIssueService.createEnvironmentForIssue(issue.environment.createEnvironmentCode);
          console.log(">>> environmentResult", environmentResult);
        }

        if(['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(issue.executeType)){
          const result = await manageIssueService.runIssueSolutionStatement(issue.environment.createTestcaseResult, issue.executeType);
          if(!result.isSuccess){
            return res.status(400).send({
              message: "Code tạo đáp án là bị lỗi"
            });
          }
          const resultData = {
            rows: result.data
          };
          const fileName = `${issue.title.split(' ').join('_')}${Date.now()}.json`;

          manageIssueService.saveResultToFile(resultData, fileName);

          const data = {
            resultData,
            fileName,
          };
          return res.status(200).send(data);
        }
      } else {
        return res.status(400).send({
          message: "Code tạo đáp án là bắt buộc"
        });
      }
    } catch (error) {
      res.status(400).send({
        meesage: error.meesage
      });
    }
  }
}
  
const manageIssueController = new ManageIssueController();
export default manageIssueController;