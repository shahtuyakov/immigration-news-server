import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  headline: string;
  contentSummary: string;
  source: string;
  sourceUrl: string;
  publishedAt: Date;
  categories: string[];
  tags: string[];
  timezone: string;
}

const NewsSchema = new Schema<INews>({
  headline: { type: String, required: true, index: true },
  contentSummary: { type: String, required: true },
  source: { type: String, required: true, index: true },
  sourceUrl: { type: String, required: true, index: true },
  publishedAt: { type: Date, required: true, index: true },
  categories: { type: [String], required: true, index: true },
  tags: { type: [String], required: true, index: true },
  timezone: { type: String, required: true }
}, {
  timestamps: true
});

// Create a compound index for efficient querying
NewsSchema.index({ publishedAt: -1, source: 1, sourceUrl: 1 });

// Add a method to check if content needs updating
NewsSchema.methods.needsUpdate = function(newContent: string): boolean {
  return this.content !== newContent || !this.contentSummary;
};

export default mongoose.model<INews>('News', NewsSchema);