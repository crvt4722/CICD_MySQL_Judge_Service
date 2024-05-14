import { systemSequelize } from "./orm/Sequelize.js";
import pkg from 'lodash';
import Sequelize, {Op} from "sequelize";
import ModelConstant from "../constants/ModelConstant.js";

export default class AbstractResource {
  constructor (tableName, modelName, schema, sequelizeInstance = systemSequelize) {
    this.tableName = tableName;
    this.modelName = modelName;
    this.schema = schema;
    this.sequelizeInstance = sequelizeInstance;
  }

  init(){
    if(!this.dataModel){
      this.dataModel = this.sequelizeInstance.define(
        this.modelName,
        this.schema,
        {
          tableName: this.tableName,
          timestamps: false,
          freezeTableName: true,
        }
      );
      this.afterInitModel();
    }
    return this.dataModel;
  }

  afterInitModel(){

  }

  getDataModel() {
    this.init();
    return this.dataModel;
  }

  getById(id) {
    this.init();
    return this.dataModel.findByPk(id);
  }
    
  sync() {
    this.init();
    return this.dataModel.sync();
  }

  drop(options = {}) {
    this.init();
    return this.dataModel.drop(options);
  }

  create(data) {
    this.init();
    return this.dataModel.create(data);
  }

  bulkCreate(data) {
    this.init();
    return this.dataModel.bulkCreate(data);
  }

  update(data, options) {
    this.init();
    return this.dataModel.update(data, options);
  }

  destroy(options) {
    this.init();
    return this.dataModel.destroy(options);
  }

  async getList(filter, pageSize, currentPage, sort = {}) {
    this.init();
    const totalCount = await this.dataModel.count(
      this.transformFindOptions(filter),
    );
    const items = await this.dataModel.findAll(
      this.transformFindOptions(filter, pageSize, currentPage, this.transformOrderBy(sort)),
    );
  
    return {
      total_count: totalCount,
      items,
      page_info: {
        page_size: pageSize,
        current_page: currentPage,
        total_pages: Math.ceil(totalCount / pageSize),
      },
    };
  }

  transformOrderBy(sort) {
    const orderBy = [];
    for (const sortField in sort) {
      if (Object.prototype.hasOwnProperty.call(sort, sortField)) {
        orderBy.push([sortField, sort[sortField]]);
      }
    }
    return orderBy;
  }

  transformFindOptions(filter, pageSize = null, currentPage = null, order = null) {
    let options = {};
    let wheres = {};
    const {isEmpty} = pkg;
    if (!isEmpty(filter)) {
      for (const field in filter) {
        if (field === 'defaultWheres') {
          const defaultWheres = filter.defaultWheres;
          wheres = {...wheres, ...defaultWheres};
        } else if (field === 'querySearch') {
          const querySearch = filter.querySearch;
          const value = querySearch.value;
          if (!value) {
            continue;
          }
          const fields = querySearch.fields;
          const orQuery = [];
          fields.forEach((key) => {
            orQuery.push({
              [key]: {[Op.iLike]: `%${value.trim()}%`},
            });
          });
          wheres[Op.or] = orQuery;
        } else {
          for (let condType in filter[field]) {
            if (Object.prototype.hasOwnProperty.call(filter[field], condType)) {
              let value = filter[field][condType];
              const likeConditions = ['like', 'iLike'];
              if (likeConditions.includes(condType)) {
                value = filter[field][condType];
                value = value.replace('%', '', value);
                value = `%${value}%`;
                condType = 'iLike';
              }
              if (condType === 'match') {
                value = Sequelize.fn('to_tsquery', value);
              }
              let operator = '';
              switch (condType) {
              case ModelConstant.equalString:
                operator = Op.like;
                break;
              case ModelConstant.iEqualString:
                operator = Op.iLike;
                break;
              default:
                operator = Op[condType];
              }
              if (operator) {
                if (!wheres[field]) {
                  wheres[field] = {};
                }
                wheres[field][operator] = value;
              }
            }
          }
        }
      }
    }
  
    options.where = wheres;
  
    if (pageSize && currentPage) {
      options.offset = (currentPage > 0 ? (currentPage - 1) : 1) * pageSize;
      options.limit = pageSize;
    }
  
    if (order) {
      options.order = order;
    }
  
    options = this.addExtraInfo(options);
  
    return options;
  }

  addExtraInfo(options) {
    return options;
  }
  
  findOne(filter) {
    this.init();
    return this.dataModel.findOne(this.transformFindOptions(filter));
  }

  async countRows(filter) {
    this.init();
    const totalCount = await this.dataModel.count(
      this.transformFindOptions(filter),
    );
    return totalCount;
  }
}