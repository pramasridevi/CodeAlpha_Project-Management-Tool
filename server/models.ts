import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUserModel extends Document {
  name: string;
  email: string;
  passwordHash: string;
  profilePicture?: string;
  role: string;
}

const UserSchema = new Schema<IUserModel>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  profilePicture: { type: String },
  role: { type: String, default: 'member' }
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model<IUserModel>('User', UserSchema);

// Project Schema
export interface IProjectModel extends Document {
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
}

const ProjectSchema = new Schema<IProjectModel>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const ProjectModel = mongoose.models.Project || mongoose.model<IProjectModel>('Project', ProjectSchema);

// Task Schema
export interface ITaskModel extends Document {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  assignedTo?: mongoose.Types.ObjectId;
  dueDate?: Date;
  projectId: mongoose.Types.ObjectId;
}

const TaskSchema = new Schema<ITaskModel>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To Do', 'In Progress', 'Review', 'Completed'], default: 'To Do' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true }
}, { timestamps: true });

export const TaskModel = mongoose.models.Task || mongoose.model<ITaskModel>('Task', TaskSchema);

// Comment Schema
export interface ICommentModel extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  message: string;
}

const CommentSchema = new Schema<ICommentModel>({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true }
}, { timestamps: true });

export const CommentModel = mongoose.models.Comment || mongoose.model<ICommentModel>('Comment', CommentSchema);

// Notification Schema
export interface INotificationModel extends Document {
  userId: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
}

const NotificationSchema = new Schema<INotificationModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const NotificationModel = mongoose.models.Notification || mongoose.model<INotificationModel>('Notification', NotificationSchema);
