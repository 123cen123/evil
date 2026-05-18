console.log('main.js loaded');
var app = new Vue({
  el: '#app',
  data() {
    return {
        currentPageComponent: 'MerchantManagement',
        statusFilter: '',
        employeeStatusFilter: '',
        orderStatusFilter: '',
        orderDetailStatusFilter: '',
        settlementStatusFilter: '',
        // 添加加载状态变量
        loading: {
            merchant: true,
            employee: true,
            order: false,
            orderDetail: false,
            settlement: false,
            admin: false
        },
        // 错误状态
        errors: {
            merchant: false,
            employee: false,
            order: false,
            orderDetail: false,
            settlement: false,
            admin: false
        },
        // 分页相关数据
        pagination: {
            currentPage: 1,
            pageSize: 10
        },
        // 排序相关数据
        sortBy: {
            merchant: { field: 'created_at', order: 'desc' },
            employee: { field: 'created_at', order: 'desc' },
            order: { field: 'created_at', order: 'desc' },
            orderDetail: { field: 'start_time', order: 'desc' },
            settlement: { field: 'created_at', order: 'desc' }
        },
        merchantData: [],
        employeeData: [],
        orderData: [],
        orderDetailData: [],
        settlementData: [],

        adminData: [
            {
                id: 1,
                adminId: '1431',
                username: '111',
                password: 'abc',
                email: 'xxx',
                status: '已启用'
            }
        ],
        showAddDialog: false,
        newAdminForm: {
            adminId: '',
            username: '',
            password: '',
            email: '',
            status: '已启用'
        },
        showEditDialog: false,
        editForm: {
            id: '',
            adminId: '',
            username: '',
            password: '',
            email: '',
            status: '已启用'
        },
        editEmployeeDialogVisible: false,
        editEmployeeForm: {},
        editMerchantDialogVisible: false,
        editMerchantForm: {},
        // 订单详情查看
        viewOrderDialogVisible: false,
        viewOrderRecord: {}
    }
  },
  computed: {
    filteredMerchantData() {
        let filtered = this.merchantData;
        if (this.statusFilter === 'pending') {
            filtered = filtered.filter(item => item.status === '待审核');
        } else if (this.statusFilter === 'approved') {
            filtered = filtered.filter(item => item.status === '已通过');
        } else if (this.statusFilter === 'rejected') {
            filtered = filtered.filter(item => item.status === '未通过');
        }
        return this.getSortedData(filtered, 'merchant');
    },
    paginatedMerchantData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredMerchantData.slice(start, end);
    },
    filteredEmployeeData() {
        let filtered = this.employeeData;
        if (this.employeeStatusFilter === 'pending') {
            filtered = filtered.filter(item => item.status === '待审核');
        } else if (this.employeeStatusFilter === 'approved') {
            filtered = filtered.filter(item => item.status === '已通过');
        } else if (this.employeeStatusFilter === 'rejected') {
            filtered = filtered.filter(item => item.status === '未通过');
        }
        return this.getSortedData(filtered, 'employee');
    },
    paginatedEmployeeData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredEmployeeData.slice(start, end);
    },
    filteredOrderData() {
        let filtered = this.orderData;
        if (this.orderStatusFilter === 'work') {
            filtered = filtered.filter(item => item.status === '报名中');
        } else if (this.orderStatusFilter === 'finish') {
            filtered = filtered.filter(item => item.status === '已完成');
        } else if (this.orderStatusFilter === 'cansle') {
            filtered = filtered.filter(item => item.status === '已取消');
        } else if (this.orderStatusFilter === 'working') {
            filtered = filtered.filter(item => item.status === '进行中');
        }
        return this.getSortedData(filtered, 'order');
    },
    paginatedOrderData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredOrderData.slice(start, end);
    },
    filteredOrderDetailData() {
        let filtered = this.orderDetailData;
        if (this.orderDetailStatusFilter === '已完成') {
            filtered = filtered.filter(item => item.status === '已完成');
        } else if (this.orderDetailStatusFilter === '未完成') {
            filtered = filtered.filter(item => item.status === '未完成');
        }
        return this.getSortedData(filtered, 'orderDetail');
    },
    paginatedOrderDetailData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredOrderDetailData.slice(start, end);
    },
    filteredSettlementData() {
        let filtered = this.settlementData;
        if (this.settlementStatusFilter === 'paid') {
            filtered = filtered.filter(item => item.status === '已支付');
        } else if (this.settlementStatusFilter === 'unpaid') {
            filtered = filtered.filter(item => item.status === '待支付');
        }
        return this.getSortedData(filtered, 'settlement');
    },
    paginatedSettlementData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredSettlementData.slice(start, end);
    },
    filteredAdminData() {
        return this.adminData;
    },
    paginatedAdminData() {
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize;
        const end = start + this.pagination.pageSize;
        return this.filteredAdminData.slice(start, end);
    }
  },
  created() {
    console.log('Vue created');
    // 获取商家数据
    this.loading.merchant = true;
    this.errors.merchant = false;
    axios.get('http://localhost:3000/api/merchant/list').then(res => {
      if(res.data.success) {
        this.merchantData = res.data.data.map(item => ({
          id: item.id,
          name: item.shop_name,
          address: item.shop_address,
          contact: item.contact_person,
          phone: item.phone,
          password: item.password,
          created_at: item.created_at
        }));
      } else {
        this.errors.merchant = true;
        this.$message.error(res.data.message || '获取商家数据失败');
      }
      this.loading.merchant = false;
    }).catch((error) => {
      this.loading.merchant = false;
      this.errors.merchant = true;
      console.error('获取商家数据失败:', error);
      this.$message.error('获取商家数据失败，请检查网络连接');
    });
    
    // 获取零工数据
    this.loading.employee = true;
    this.errors.employee = false;
    axios.get('http://localhost:3000/api/worker/list').then(res => {
      if(res.data.success) {
        this.employeeData = res.data.data.map(item => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          gender: item.gender,
          age: item.age,
          skills: item.skills,
          password: item.password,
          created_at: item.created_at
        }));
      } else {
        this.errors.employee = true;
        this.$message.error(res.data.message || '获取零工数据失败');
      }
      this.loading.employee = false;
    }).catch((error) => {
      this.loading.employee = false;
      this.errors.employee = true;
      console.error('获取零工数据失败:', error);
      this.$message.error('获取零工数据失败，请检查网络连接');
    });
    
    // 获取订单报表数据
    this.loading.order = true;
    this.errors.order = false;
    axios.get('http://localhost:3000/api/order/report').then(res => {
      if(res.data.success) {
        this.orderData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          retime: item.retime, // 直接使用数据库返回的retime字段
          work_timme: item.work_timme, // 直接使用数据库返回的work_timme字段
          merchant: item.merchant,
          hour: item.hour,
          hourly_wage: item.hourly_wage,
          ygong: item.ygong,
          people: item.people,
          status: item.status,
          created_at: item.created_at
        }));
      } else {
        this.errors.order = true;
        this.$message.error(res.data.message || '获取订单报表数据失败');
      }
      this.loading.order = false;
    }).catch((error) => {
      this.loading.order = false;
      this.errors.order = true;
      console.error('获取订单报表数据失败:', error);
      this.$message.error('获取订单报表数据失败，请检查网络连接');
    });
    
    // 获取订单明细数据
    this.loading.orderDetail = true;
    this.errors.orderDetail = false;
    axios.get('http://localhost:3000/api/order/detail').then(res => {
      if(res.data.success) {
        this.orderDetailData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          retime: item.retime, // 直接使用数据库返回的retime字段
          merchant: item.merchant,
          hour: item.hour,
          hourly_wage: item.hourly_wage,
          empname: item.empname,
          phone: item.phone,
          starttime: item.starttime, // 直接使用数据库返回的starttime字段
          endtime: item.endtime, // 直接使用数据库返回的endtime字段
          status: item.status,
          created_at: item.created_at
        }));
      } else {
        this.errors.orderDetail = true;
        this.$message.error(res.data.message || '获取订单明细数据失败');
      }
      this.loading.orderDetail = false;
    }).catch((error) => {
      this.loading.orderDetail = false;
      this.errors.orderDetail = true;
      console.error('获取订单明细数据失败:', error);
      this.$message.error('获取订单明细数据失败，请检查网络连接');
    });
    
    // 获取结算报表数据
    this.loading.settlement = true;
    this.errors.settlement = false;
    axios.get('http://localhost:3000/api/settlement/report').then(res => {
      if(res.data.success) {
        this.settlementData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          merchant: item.merchant,
          empname: item.empname,
          phone: item.phone,
          working_hour: item.working_hour,
          hourly_wage: item.hourly_wage,
          starttime: item.starttime, // 直接使用数据库返回的starttime字段
          endtime: item.endtime, // 直接使用数据库返回的endtime字段
          amount: item.amount,
          status: item.status,
          paymentMethod: item.paymentMethod,
          created_at: item.created_at
        }));
      } else {
        this.errors.settlement = true;
        this.$message.error(res.data.message || '获取结算报表数据失败');
      }
      this.loading.settlement = false;
    }).catch((error) => {
      this.loading.settlement = false;
      this.errors.settlement = true;
      console.error('获取结算报表数据失败:', error);
      this.$message.error('获取结算报表数据失败，请检查网络连接');
    });
    // 启动自动刷新
    this.startAutoRefresh();
  },
  watch: {
    // 监听筛选条件变化，重置当前页码
    statusFilter() {
      this.pagination.currentPage = 1;
    },
    employeeStatusFilter() {
      this.pagination.currentPage = 1;
    },
    orderStatusFilter() {
      this.pagination.currentPage = 1;
    },
    orderDetailStatusFilter() {
      this.pagination.currentPage = 1;
    },
    settlementStatusFilter() {
      this.pagination.currentPage = 1;
    },
    // 监听标签页切换，重置筛选条件和分页状态
    currentPageComponent() {
      // 重置筛选条件
      this.statusFilter = '';
      this.employeeStatusFilter = '';
      this.orderStatusFilter = '';
      this.orderDetailStatusFilter = '';
      this.settlementStatusFilter = '';
      // 重置分页
      this.pagination.currentPage = 1;
    }
  },
  methods: {
    // 排序方法
    sortData(data, field, order) {
        return data.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            // 处理日期排序
            if (field.includes('time') || field.includes('created_at')) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            // 处理数字排序
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return order === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // 处理字符串排序
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            
            // 处理日期排序
            if (aVal instanceof Date && bVal instanceof Date) {
                return order === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            return 0;
        });
    },
    
    // 处理排序变化
    handleSortChange(component, field) {
        const currentSort = this.sortBy[component];
        if (currentSort.field === field) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.order = 'asc';
        }
        this.pagination.currentPage = 1; // 重置到第一页
    },
    
    // 获取排序后的数据
    getSortedData(data, component) {
        const sortConfig = this.sortBy[component];
        return this.sortData([...data], sortConfig.field, sortConfig.order);
    },
    
    getStatusType(status) {
        switch(status) {
            case '待审核': return 'warning';
            case '已通过': return 'success';
            case '未通过': return 'danger';
            default: return 'info';
        }
    },
    approveMerchant(row) {
        row.status = '已通过';
        this.$message.success('商家已通过审核');
    },
    rejectMerchant(row) {
        row.status = '未通过';
        this.$message.error('商家审核未通过');
    },
    approveEmployee(row) {
        row.status = '已通过';
        this.$message.success('员工已通过审核');
    },
    rejectEmployee(row) {
        row.status = '未通过';
        this.$message.error('员工审核未通过');
  },

  
  editAdmin(row) {
    this.$message.info('修改管理员: ' + row.username);
    // You can implement edit functionality here
},
deleteAdmin(row) {
    this.$confirm('确认删除该管理员账号?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        this.adminData = this.adminData.filter(item => item.id !== row.id);
        this.$message.success('删除成功');
    }).catch(() => {
        this.$message.info('已取消删除');
    });
},
addAdmin() {
    const newId = this.adminData.length > 0 
        ? Math.max(...this.adminData.map(item => item.id)) + 1 
        : 1;
    
    this.adminData.push({
        id: newId,
        ...this.newAdminForm
    });
    
    this.showAddDialog = false;
    this.$message.success('新增账号成功');
    this.newAdminForm = {
        adminId: '',
        username: '',
        password: '',
        email: '',
        status: '已启用'
    };
},
openEditDialog(row) {
    this.editForm = JSON.parse(JSON.stringify(row));
    this.showEditDialog = true;
},
saveEdit() {
    const index = this.adminData.findIndex(item => item.id === this.editForm.id);
    if (index !== -1) {
        // 更新数据
        this.adminData.splice(index, 1, JSON.parse(JSON.stringify(this.editForm)));
        this.$message.success('修改成功');
        this.showEditDialog = false;
    }
},
genderFormatter(row) {
    return row.gender === 'male' ? '男' : row.gender === 'female' ? '女' : row.gender;
},
editEmployee(row) {
    this.editEmployeeForm = { ...row };
    this.editEmployeeDialogVisible = true;
},
submitEditEmployee() {
    axios.put(`http://localhost:3000/api/worker/${this.editEmployeeForm.id}`, this.editEmployeeForm).then(() => {
        // 重新拉取数据，保证和数据库同步
        axios.get('http://localhost:3000/api/worker/list').then(res => {
            if(res.data.success) {
                this.employeeData = res.data.data.map(item => ({
                    id: item.id,
                    name: item.name,
                    phone: item.phone,
                    gender: item.gender,
                    age: item.age,
                    skills: item.skills,
                    password: item.password
                }));
            }
        });
        this.$message.success('修改成功');
        this.editEmployeeDialogVisible = false;
    });
},
editMerchant(row) {
    this.editMerchantForm = { ...row };
    this.editMerchantDialogVisible = true;
},
submitEditMerchant() {
    axios.put(`http://localhost:3000/api/merchant/${this.editMerchantForm.id}`, {
        shop_name: this.editMerchantForm.name,
        shop_address: this.editMerchantForm.address,
        contact_person: this.editMerchantForm.contact,
        phone: this.editMerchantForm.phone,
        password: this.editMerchantForm.password
    }).then(() => {
        // 重新拉取数据，保证和数据库同步
        axios.get('http://localhost:3000/api/merchant/list').then(res => {
            if(res.data.success) {
                this.merchantData = res.data.data.map(item => ({
                    id: item.id,
                    name: item.shop_name,
                    address: item.shop_address,
                    contact: item.contact_person,
                    phone: item.phone,
                    password: item.password
                }));
            }
        });
        this.$message.success('修改成功');
        this.editMerchantDialogVisible = false;
    });
},
// 查看订单详情
viewOrderDetail(row) {
    this.viewOrderRecord = { ...row };
    this.viewOrderDialogVisible = true;
},
deleteMerchant(row) {
    this.$confirm('确认删除该商家?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        axios.delete(`http://localhost:3000/api/merchant/${row.id}`).then(() => {
            this.merchantData = this.merchantData.filter(item => item.id !== row.id);
            this.$message.success('删除成功');
        });
    });
},
deleteEmployee(row) {
    this.$confirm('确认删除该零工?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        axios.delete(`http://localhost:3000/api/worker/${row.id}`).then(() => {
            this.employeeData = this.employeeData.filter(item => item.id !== row.id);
            this.$message.success('删除成功');
        });
    });
},
    updateSettlement(row) {
        axios.put(`http://localhost:3000/api/settlement/${row.id}`, {
            status: row.status,
            payment_method: row.paymentMethod
        }).then(() => {
            this.$message.success('结算信息更新成功');
        }).catch(() => {
            this.$message.error('结算信息更新失败');
        });
    },
    
    // 重新加载数据方法
    reloadData(component) {
        switch(component) {
            case 'merchant':
                this.loading.merchant = true;
                this.errors.merchant = false;
                axios.get('http://localhost:3000/api/merchant/list').then(res => {
                    if(res.data.success) {
                        this.merchantData = res.data.data.map(item => ({
                            id: item.id,
                            name: item.shop_name,
                            address: item.shop_address,
                            contact: item.contact_person,
                            phone: item.phone,
                            password: item.password,
                            created_at: item.created_at
                        }));
                    }
                    this.loading.merchant = false;
                }).catch((error) => {
                    this.loading.merchant = false;
                    this.errors.merchant = true;
                    this.$message.error('重新加载商家数据失败');
                });
                break;
            case 'employee':
                this.loading.employee = true;
                this.errors.employee = false;
                axios.get('http://localhost:3000/api/worker/list').then(res => {
                    if(res.data.success) {
                        this.employeeData = res.data.data.map(item => ({
                            id: item.id,
                            name: item.name,
                            phone: item.phone,
                            gender: item.gender,
                            age: item.age,
                            skills: item.skills,
                            password: item.password,
                            created_at: item.created_at
                        }));
                    }
                    this.loading.employee = false;
                }).catch((error) => {
                    this.loading.employee = false;
                    this.errors.employee = true;
                    this.$message.error('重新加载零工数据失败');
                });
                break;
            case 'order':
                this.loading.order = true;
                this.errors.order = false;
                axios.get('http://localhost:3000/api/order/report').then(res => {
                    if(res.data.success) {
                        this.orderData = res.data.data.map(item => ({
                            id: item.orderid,
                            orderid: item.orderid,
                            retime: item.retime, // 直接使用数据库返回的retime字段
                            work_timme: item.work_timme, // 直接使用数据库返回的work_timme字段
                            merchant: item.merchant,
                            hour: item.hour,
                            hourly_wage: item.hourly_wage,
                            ygong: item.ygong,
                            people: item.people,
                            status: item.status,
                            created_at: item.created_at
                        }));
                    }
                    this.loading.order = false;
                }).catch((error) => {
                    this.loading.order = false;
                    this.errors.order = true;
                    this.$message.error('重新加载订单数据失败');
                });
                break;
            case 'orderDetail':
                this.loading.orderDetail = true;
                this.errors.orderDetail = false;
                axios.get('http://localhost:3000/api/order/detail').then(res => {
                    if(res.data.success) {
                        this.orderDetailData = res.data.data.map(item => ({
                            id: item.orderid,
                            orderid: item.orderid,
                            retime: item.retime, // 直接使用数据库返回的retime字段
                            merchant: item.merchant,
                            hour: item.hour,
                            hourly_wage: item.hourly_wage,
                            empname: item.empname,
                            phone: item.phone,
                            starttime: item.starttime, // 直接使用数据库返回的starttime字段
                            endtime: item.endtime, // 直接使用数据库返回的endtime字段
                            status: item.status,
                            created_at: item.created_at
                        }));
                    }
                    this.loading.orderDetail = false;
                }).catch((error) => {
                    this.loading.orderDetail = false;
                    this.errors.orderDetail = true;
                    this.$message.error('重新加载订单明细数据失败');
                });
                break;
            case 'settlement':
                this.loading.settlement = true;
                this.errors.settlement = false;
                axios.get('http://localhost:3000/api/settlement/report').then(res => {
                    if(res.data.success) {
                        this.settlementData = res.data.data.map(item => ({
                            id: item.orderid,
                            orderid: item.orderid,
                            merchant: item.merchant,
                            empname: item.empname,
                            phone: item.phone,
                            working_hour: item.working_hour,
                            hourly_wage: item.hourly_wage,
                            starttime: item.starttime, // 直接使用数据库返回的starttime字段
                            endtime: item.endtime, // 直接使用数据库返回的endtime字段
                            amount: item.amount,
                            status: item.status,
                            paymentMethod: item.paymentMethod,
                            created_at: item.created_at
                        }));
                    }
                    this.loading.settlement = false;
                }).catch((error) => {
                    this.loading.settlement = false;
                    this.errors.settlement = true;
                    this.$message.error('重新加载结算数据失败');
                });
                break;
        }
    },
// 分页处理方法
handleSizeChange(val) {
    this.pagination.pageSize = val;
    console.log(`每页 ${val} 条`);
},
handleCurrentChange(val) {
    this.pagination.currentPage = val;
    console.log(`当前页: ${val}`);
},
startAutoRefresh() {
  this.autoRefreshTimer = setInterval(() => {
    // 刷新商家数据
    axios.get('http://localhost:3000/api/merchant/list').then(res => {
      if(res.data.success) {
        this.merchantData = res.data.data.map(item => ({
          id: item.id,
          name: item.shop_name,
          address: item.shop_address,
          contact: item.contact_person,
          phone: item.phone,
          password: item.password
        }));
      }
    });
    // 刷新零工数据
    axios.get('http://localhost:3000/api/worker/list').then(res => {
      if(res.data.success) {
        this.employeeData = res.data.data.map(item => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          gender: item.gender,
          age: item.age,
          skills: item.skills,
          password: item.password
        }));
      }
    });
    // 刷新订单报表数据
    axios.get('http://localhost:3000/api/order/report').then(res => {
      if(res.data.success) {
        this.orderData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          retime: item.retime, // 直接使用数据库返回的retime字段
          work_timme: item.work_timme, // 直接使用数据库返回的work_timme字段
          merchant: item.merchant,
          hour: item.hour,
          hourly_wage: item.hourly_wage,
          ygong: item.ygong,
          people: item.people,
          status: item.status,
          created_at: item.created_at
        }));
      }
    });
    // 刷新订单明细数据
    axios.get('http://localhost:3000/api/order/detail').then(res => {
      if(res.data.success) {
        this.orderDetailData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          retime: item.retime, // 直接使用数据库返回的retime字段
          merchant: item.merchant,
          hour: item.hour,
          hourly_wage: item.hourly_wage,
          empname: item.empname,
          phone: item.phone,
          starttime: item.starttime, // 直接使用数据库返回的starttime字段
          endtime: item.endtime, // 直接使用数据库返回的endtime字段
          status: item.status,
          created_at: item.created_at
        }));
      }
    });
    // 刷新结算报表数据
    axios.get('http://localhost:3000/api/settlement/report').then(res => {
      if(res.data.success) {
        this.settlementData = res.data.data.map(item => ({
          id: item.orderid,
          orderid: item.orderid,
          merchant: item.merchant,
          empname: item.empname,
          phone: item.phone,
          working_hour: item.working_hour,
          hourly_wage: item.hourly_wage,
          starttime: item.starttime, // 直接使用数据库返回的starttime字段
          endtime: item.endtime, // 直接使用数据库返回的endtime字段
          amount: item.amount,
          status: item.status,
          paymentMethod: item.paymentMethod,
          created_at: item.created_at
        }));
      }
    });
  }, 10000); // 10秒刷新一次
},
beforeDestroy() {
  if (this.autoRefreshTimer) {
    clearInterval(this.autoRefreshTimer);
  }
}
}
  
}) 