const mongoose = require('mongoose');
const { tenantPlugin } = require('./tenantPlugin');

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    done: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done'],
      default: 'todo'
    },
    position: {
      type: Number,
      default: 0
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    labels: [
      {
        type: String,
        trim: true
      }
    ],
    checklist: [checklistItemSchema],
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    comments: [commentSchema]
  },
  {
    timestamps: true,
    versionKey: false,
    shardKey: { companyId: 1, projectId: 1 }
  }
);

taskSchema.index({ companyId: 1, projectId: 1, status: 1, position: 1 });
taskSchema.index({ companyId: 1, assigneeId: 1 });
taskSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Task', taskSchema);
