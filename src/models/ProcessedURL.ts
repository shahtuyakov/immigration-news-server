// src/models/ProcessedURL.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProcessedURL extends Document {
  url: string;
  processedAt: Date;
  successful: boolean;
  articleId?: mongoose.Types.ObjectId;
}

const ProcessedURLSchema = new Schema<IProcessedURL>({
  url: { type: String, required: true, unique: true, index: true },
  processedAt: { type: Date, required: true, default: Date.now },
  successful: { type: Boolean, required: true, default: true },
  articleId: { type: Schema.Types.ObjectId, ref: 'News' }
}, {
  timestamps: true
});

export default mongoose.model<IProcessedURL>('ProcessedURL', ProcessedURLSchema);