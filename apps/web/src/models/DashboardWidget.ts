import mongoose, { Document, Schema, Model } from "mongoose";

export interface IDashboardWidget extends Document {
    userId: string;
    organizationId?: string;
    widget_type: string;
    widget_position: number;
    is_visible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const dashboardWidgetSchema = new Schema<IDashboardWidget>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        organizationId: {
            type: String,
            index: true,
        },
        widget_type: {
            type: String,
            required: true,
        },
        widget_position: {
            type: Number,
            required: true,
            min: 0,
            max: 99,
        },
        is_visible: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Define compound index to ensure one widget per position per user
dashboardWidgetSchema.index({ userId: 1, widget_position: 1 }, { unique: true });

export const DashboardWidget: Model<IDashboardWidget> =
    mongoose.models.DashboardWidget ||
    mongoose.model<IDashboardWidget>("DashboardWidget", dashboardWidgetSchema);
