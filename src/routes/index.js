// import adminRouter from "./AdminRoute.js";
import contestRouter from "./ContestRoute.js";
import manageIssueRoute from "./ManageIssueRoute.js";
const initWebRoute = (app) => {
  app.use('/api/v1/judge-submition', contestRouter);
  app.use('/api/v1/manage-issue', manageIssueRoute);
  return app.use('/', function (req, res) {
    res.send('Hello World 23');
  });
};

export default initWebRoute;