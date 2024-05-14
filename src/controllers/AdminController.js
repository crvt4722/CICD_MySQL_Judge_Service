class AdminController {
  handleHello(req, res){
    res.send("hello from admin");
  }
}

const adminController = new AdminController();
export default adminController;