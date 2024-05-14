export class SchemaClass {

  getJudgeEnvironment(){
    
  }

  getTableList() {
    return [
      
    ];
  }


  async syncAllTable() {
    const modelList = this.getTableList();
    for(const model of modelList){
      await model.sync();
    }
  }
}

const schemaObject = new SchemaClass();
export default schemaObject;