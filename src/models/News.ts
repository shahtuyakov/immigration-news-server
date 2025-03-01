import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  headline: string;
  content: string;
  contentSummary: string;
  imageUrl?: string;
  source: string;
  author: string;
  publishedAt: Date;
  updatedAt: Date;
  region: string;
  categories: string[];
  tags: string[];
  contentLength: number;
  timezone: string;
}

const NewsSchema = new Schema<INews>({
  headline: { type: String, required: true, index: true },
  content: { type: String, required: true },
  contentSummary: { type: String, required: true },
  imageUrl: { type: String },
  source: { type: String, required: true, index: true },
  author: { type: String, required: true },
  publishedAt: { type: Date, required: true, index: true },
  updatedAt: { type: Date, required: true },
  region: { type: String, required: true, index: true },
  categories: { type: [String], required: true, index: true },
  tags: { type: [String], required: true, index: true },
  contentLength: { type: Number, required: true },
  timezone: { type: String, required: true }
}, {
  timestamps: true
});

// Create a compound index for efficient querying
NewsSchema.index({ publishedAt: -1, source: 1, region: 1 });

// Add a method to check if content needs updating
NewsSchema.methods.needsUpdate = function(newContent: string): boolean {
  return this.content !== newContent || !this.contentSummary;
};

export default mongoose.model<INews>('News', NewsSchema);