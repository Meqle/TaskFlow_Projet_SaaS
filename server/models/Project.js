const mongoose = require('mongoose');
const { tenantPlugin } = require('./tenantPlugin');

const projectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    notes: {
      type: String,
      default: ''
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false,
    shardKey: { companyId: 1, _id: 1 }
  }
);

projectSchema.index({ companyId: 1, createdAt: -1 });
projectSchema.index({ companyId: 1, members: 1 });
projectSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Project', projectSchema);
