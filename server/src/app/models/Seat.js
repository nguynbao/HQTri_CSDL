const { default: mongoose } = require('mongoose');
const Schema = mongoose.Schema;

const Seat = new Schema(
  {
    seat_id: {
      type: String,
      required: true,
    },
    // Legacy support for older documents
    seatCode: {
      type: String,
      required: false,
    },
    row: {
      type: String,
      required: false,
    },
    number: {
      type: Number,
      required: false,
    },
    type: {
      type: String,
      enum: ['standard', 'vip'],
      default: 'standard',
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'maintenance'],
      default: 'available',
      required: true,
    },
    showtime_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Showtime',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

Seat.index({ seat_id: 1, showtime_id: 1 }, { unique: true });

module.exports = mongoose.model('Seat', Seat);
