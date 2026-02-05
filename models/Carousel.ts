import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICarousel extends Document {
  title: string;
  subtitle: string;
  image: string;
  link?: string;
  buttonText?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CarouselSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Başlık gereklidir'],
      trim: true,
    },
    subtitle: {
      type: String,
      required: [true, 'Alt başlık gereklidir'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Görsel gereklidir'],
    },
    link: {
      type: String,
      trim: true,
    },
    buttonText: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Carousel: Model<ICarousel> = mongoose.models.Carousel || mongoose.model<ICarousel>('Carousel', CarouselSchema);

export default Carousel;

