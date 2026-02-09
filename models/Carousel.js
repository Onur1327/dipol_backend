import mongoose from 'mongoose';

const CarouselSchema = new mongoose.Schema(
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

const Carousel = mongoose.models.Carousel || mongoose.model('Carousel', CarouselSchema);

export default Carousel;

