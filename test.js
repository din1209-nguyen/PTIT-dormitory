const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ktx_ptit');
  const m = require('./backend/dist/models/utilityBillMember.model.js').UtilityBillMember;
  const res = await m.find({}).populate('billId').limit(1).lean();
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

check().catch(console.error);
