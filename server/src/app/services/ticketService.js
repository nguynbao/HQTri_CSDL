// services/ticketService.js

const Ticket = require('../models/Ticket'); 
const Seat = require('../models/Seat');
const mongoose = require('mongoose');

const MAX_RETRIES = 15;

const PENDING_RETRY_DELAY_MS = 500; // chờ 0.5s mỗi lần nếu ghế đang pending

const bookSeatsTransaction = async (userId, showtimeId, seat1Id, seat2Id, price) => {
  const session = await mongoose.startSession();

  const firstSeatId = seat1Id;
  const secondSeatId = seat2Id;

  if (firstSeatId === secondSeatId) {
    throw new Error("Hai ghế không được trùng nhau.");
  }

  const transactionBody = async () => {
    console.log(
      `[USER: ${userId}] Bắt đầu Giao tác. Khóa theo thứ tự: [${firstSeatId}, ${secondSeatId}]`
    );

    // 1. Check seat availability trong collection Seat
    const seatDocs = await Seat.find({
      showtime_id: showtimeId,
      seat_id: { $in: [firstSeatId, secondSeatId] },
    }).session(session);

    if (seatDocs.length !== 2) {
      throw new Error("Một trong hai ghế không tồn tại.");
    }

    for (const seat of seatDocs) {
      if (seat.status === "booked") {
        throw new Error(`Ghế ${seat.seat_id || seat.seatCode} đã được đặt/hạn chế.`);
      }
      if (seat.status === "pending_payment") {
        const err = new Error(
          `Ghế ${seat.seat_id || seat.seatCode} đang chờ thanh toán (pending_payment trong Seat).`
        );
        err.code = "SEAT_PENDING";
        throw err;
      }
    }

    // 2. Ghi / khóa ghế thứ nhất – nhưng chỉ coi các ticket active là blocker
    const existingSeat1 = await Ticket.findOne({
      showtime_id: showtimeId,
      seat_id: firstSeatId,
      status: { $in: ["pending_payment", "paid"] }, // chỉ quan tâm ticket đang giữ/đã trả tiền
    }).session(session);

    if (existingSeat1) {
      if (existingSeat1.status === "pending_payment") {
        const err = new Error(
          `Ghế ${firstSeatId} đang chờ thanh toán trong Ticket (pending_payment).`
        );
        err.code = "SEAT_PENDING";
        throw err;
      }
      throw new Error(`Ghế ${firstSeatId} đã có người đặt (Ticket status = ${existingSeat1.status}).`);
    }

    const ticket1 = new Ticket({
      user_id: userId,
      showtime_id: showtimeId,
      seat_id: firstSeatId,
      price,
      status: "pending_payment",
    });

    await ticket1.save({ session });
    console.log(`[USER: ${userId}] ĐÃ GIỮ KHÓA: Ghế ${firstSeatId}.`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Ghi / khóa ghế thứ hai
    console.log(`[USER: ${userId}] CHỜ KHÓA: Ghế ${secondSeatId}...`);

    const existingSeat2 = await Ticket.findOne({
      showtime_id: showtimeId,
      seat_id: secondSeatId,
      status: { $in: ["pending_payment", "paid"] },
    }).session(session);

    if (existingSeat2) {
      if (existingSeat2.status === "pending_payment") {
        const err = new Error(
          `Ghế ${secondSeatId} đang chờ thanh toán trong Ticket (pending_payment).`
        );
        err.code = "SEAT_PENDING";
        throw err;
      }
      throw new Error(
        `Ghế ${secondSeatId} đã có người đặt (Ticket status = ${existingSeat2.status}).`
      );
    }

    const ticket2 = new Ticket({
      user_id: userId,
      showtime_id: showtimeId,
      seat_id: secondSeatId,
      price,
      status: "pending_payment",
    });

    await ticket2.save({ session });
    console.log(`[USER: ${userId}] ĐÃ KHÓA: Ghế ${secondSeatId}.`);

    await Seat.updateMany(
      { showtime_id: showtimeId, seat_id: { $in: [firstSeatId, secondSeatId] } },
      { $set: { status: "booked" } },
      { session }
    );

    return [ticket1, ticket2];
  };

  let retries = 0;
  let result = null;

  try {
    while (retries < MAX_RETRIES) {
      try {
        result = await session.withTransaction(transactionBody);
        console.log(
          `[USER: ${userId}] Giao tác hoàn thành sau ${retries} lần thử lại.`
        );
        break;
      } catch (error) {
        const isWriteConflict =
          error.code === 112 ||
          error.code === 12101 ||
          (error.name === "MongoError" &&
            (error.message.includes("Write Conflict") ||
              error.message.includes("deadlock")));

        const isPendingSeat = error.code === "SEAT_PENDING";

        if (isWriteConflict || isPendingSeat) {
          retries++;
          console.log(
            `[USER: ${userId}] 💥 Xung đột (${
              isPendingSeat ? "SEAT_PENDING" : "WRITE_CONFLICT"
            }), thử lại lần ${retries}...`
          );

          if (retries === MAX_RETRIES) {
            throw new Error(
              "Giao tác thất bại sau nhiều lần thử lại do Deadlock/Xung đột/pending."
            );
          }

          const delay =
            isPendingSeat
              ? PENDING_RETRY_DELAY_MS * retries
              : 100 * retries;

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    if (!result) {
      throw new Error("Giao tác không hoàn thành trong giới hạn cho phép.");
    }
    return result;
  } catch (error) {
    console.error(
      `[USER: ${userId}] Giao tác thất bại cuối cùng:`,
      error.message
    );
    throw error;
  } finally {
    await session.endSession();
  }
};


const holdLockAndBlock = async (userId, showtimeId, seatId) => {
  try {
    console.log(`\n[T_B/LOCK HOLDER: ${userId}] Bắt đầu giữ ghế.`);

    // 1. Tìm ghế trong collection Seat
    const seat = await Seat.findOne({
      showtime_id: showtimeId,
      seat_id: seatId,
    });

    if (!seat) {
      console.log(
        `[T_B/LOCK HOLDER: ${userId}] Không tìm thấy ghế ${seatId} trong showtime ${showtimeId}.`
      );
      throw new Error(`Ghế ${seatId} không tồn tại.`);
    }

    // 2. Nếu ghế đã booked hoặc đang pending thì không cho giữ nữa
    if (seat.status === "booked") {
      console.log(
        `[T_B/LOCK HOLDER: ${userId}] Ghế ${seatId} đã BOOKED, không thể giữ.`
      );
      throw new Error(`Ghế ${seatId} đã được đặt.`);
    }

    if (seat.status === "pending_payment") {
      console.log(
        `[T_B/LOCK HOLDER: ${userId}] Ghế ${seatId} đang PENDING_PAYMENT, đã có người giữ.`
      );
      throw new Error(`Ghế ${seatId} đang được giữ (pending_payment).`);
    }

    // 3. Cập nhật ghế sang trạng thái pending_payment
    const updateResult = await Seat.updateOne(
      {
        showtime_id: showtimeId,
        seat_id: seatId,
        status: seat.status, // đảm bảo only-update nếu trạng thái chưa đổi
      },
      {
        $set: {
          status: "pending_payment",
          hold_by: userId,          // nếu trong schema có, không có thì bỏ
          hold_at: new Date(),      // if needed
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.log(
        `[T_B/LOCK HOLDER: ${userId}] Không update được ghế ${seatId}, có thể trạng thái đã đổi do process khác.`
      );
      throw new Error(
        `Không thể giữ ghế ${seatId} do trạng thái đã thay đổi.`
      );
    }

    console.log(
      `[T_B/LOCK HOLDER: ${userId}] ĐÃ GIỮ GHẾ ${seatId} (status = pending_payment) trong 30s.`
    );

    // 4. Sau 30s, nếu ghế vẫn pending_payment thì trả về available
    setTimeout(async () => {
      try {
        const resetResult = await Seat.updateOne(
          {
            showtime_id: showtimeId,
            seat_id: seatId,
            status: "pending_payment",    // chỉ reset nếu vẫn pending
            hold_by: userId,              // optional: chỉ đúng người
          },
          {
            $set: {
              status: "available",
            },
            $unset: {
              hold_by: "",
              hold_at: "",
            },
          }
        );

        if (resetResult.modifiedCount > 0) {
          console.log(
            `[T_B/LOCK HOLDER: ${userId}] Hết 30s mà chưa thanh toán. Trả ghế ${seatId} về AVAILABLE.`
          );
        } else {
          console.log(
            `[T_B/LOCK HOLDER: ${userId}] Hết 30s nhưng ghế ${seatId} kh đổi trạng thái `
          );
        }
      } catch (e) {
        console.error(
          `[T_B/LOCK HOLDER: ${userId}] Lỗi khi reset trạng thái ghế ${seatId}:`,
          e.message
        );
      }
    }, 30000);
  } catch (error) {
    console.log(
      `[T_B/LOCK HOLDER: ${userId}] Lỗi trong quá trình giữ ghế:`,
      error.message
    );
  }
};

//fix

// const bookSeatsTransaction = async (userId, showtimeId, seat1Id, seat2Id, price) => {
//     const session = await mongoose.startSession();
    
//     // Gán trực tiếp để tạo thứ tự khóa không nhất quán
//     // const firstSeatId = seat1Id;  // Tài nguyên X (T1 muốn)
//     // const secondSeatId = seat2Id; // Tài nguyên Y (T2 muốn)

//     const seatsToBook = [seat1Id, seat2Id].sort();
//     const [firstSeatId, secondSeatId] = seatsToBook;
    
//     const transactionBody = async () => {
        
//         console.log(`[USER: ${userId}] Bắt đầu Giao tác. Khóa theo thứ tự: [${firstSeatId}, ${secondSeatId}]`);

//         // 1. Ghi/Khóa Tài nguyên Thứ nhất
//         const ticket1 = new Ticket({
//             user_id: userId, showtime_id: showtimeId, seat_id: firstSeatId, price: price,
//         });
        
//         const existingSeat1 = await Ticket.findOne({ showtime_id: showtimeId, seat_id: firstSeatId }).session(session);
//         if (existingSeat1) {
//             throw new Error(`Ghế ${firstSeatId} đã có người đặt (Kiểm tra lại).`);
//         }
//         await ticket1.save({ session });
//         console.log(`[USER: ${userId}] ĐÃ GIỮ KHÓA: Ghế ${firstSeatId}.`);

//         // ĐỘ TRỄ 
//         await new Promise(resolve => setTimeout(resolve, 1000)); 

//         // 2. Ghi/Khóa Tài nguyên Thứ hai (Tài nguyên mà giao tác khác đang giữ)
//         console.log(`[USER: ${userId}] CHỜ KHÓA: Ghế ${secondSeatId}...`);
        
//         // Kiểm tra Ghế 2 trước khi save
//         const existingSeat2 = await Ticket.findOne({ showtime_id: showtimeId, seat_id: secondSeatId }).session(session);
//         if (existingSeat2) {
//              throw new Error(`Ghế ${secondSeatId} đã có người đặt (Kiểm tra lại).`);
//         }
        
//         const ticket2 = new Ticket({
//             user_id: userId, showtime_id: showtimeId, seat_id: secondSeatId, price: price,
//         });
//         await ticket2.save({ session });
//         console.log(`[USER: ${userId}] ĐÃ KHÓA: Ghế ${secondSeatId}.`);

//         return [ticket1, ticket2];
//     };

//     // Fix: Cơ chế Thử lại (Retry Logic) ---
//     let retries = 0;
//     let result = null;

//     try {
//         while (retries < MAX_RETRIES) {
//             try {
//                 result = await session.withTransaction(transactionBody);
//                 console.log(`[USER: ${userId}] Giao tác hoàn thành sau ${retries} lần thử lại.`);
//                 break; 
//             } catch (error) {
//                 // Deadlock/Write Conflict (error code 112)
//                 if (error.code === 112 || error.code === 12101 || error.name === 'MongoError' && (error.message.includes('Write Conflict') || error.message.includes('deadlock'))) {
//                     retries++;
//                     console.log(`[USER: ${userId}] 💥 DEADLOCK/XUNG ĐỘT PHÁT HIỆN, thử lại lần ${retries}...`);
//                     if (retries === MAX_RETRIES) {
//                         throw new Error("Giao tác thất bại sau nhiều lần thử lại do Deadlock/Xung đột.");
//                     }
//                     await new Promise(resolve => setTimeout(resolve, 100 * retries)); 
//                 } else {
//                     throw error; // Lỗi nghiệp vụ hoặc lỗi nghiêm trọng
//                 }
//             }
//         }
        
//         if (!result) {
//              throw new Error("Giao tác không hoàn thành trong giới hạn cho phép.");
//         }
//         return result;

//     } catch (error) {
//         console.error(`[USER: ${userId}] Giao tác thất bại cuối cùng:`, error.message);
//         throw error;
//     } finally {
//         await session.endSession();
//     }
// };
// const holdLockAndBlock = async (userId, showtimeId, seatId, price) => {
//     const session = await mongoose.startSession();
    
//     try {
//         await session.withTransaction(async () => {
//             console.log(`\n[T_B/LOCK HOLDER: ${userId}] Bắt đầu giao tác giữ khóa.`);

//             // 1. Kiểm tra và Khóa Ghế (Locking the seat document)
//             const existingTicket = await Ticket.findOne({ showtime_id: showtimeId, seat_id: seatId }).session(session);

//             if (existingTicket) {
//                 console.log(`[T_B/LOCK HOLDER: ${userId}] Ghế ${seatId} đã có người đặt trước đó. Rollback.`);
//                 // Ném lỗi để rollback giao tác này
//                 throw new Error(`Ghế ${seatId} đã đặt.`); 
//             }
            
//             // Tạo bản ghi nhưng CHƯA COMMIT
//             const ticket = new Ticket({
//                 user_id: userId,
//                 showtime_id: showtimeId,
//                 seat_id: seatId,
//                 price: price,
//                 status: 'pending_payment' // Giả lập trạng thái đang giữ chỗ
//             });
//             await ticket.save({ session });
            
//             console.log(`[T_B/LOCK HOLDER: ${userId}] ĐÃ GIỮ KHÓA (LOCK HELD) trên Ghế ${seatId} trong 30 giây.`);
            
//             // 2. Tạm dừng dài để giữ khóa và chặn giao tác khác
//             // Giao tác này đang GIỮ KHÓA và không COMMIT
//             await new Promise(resolve => setTimeout(resolve, 30000)); 

//             // Sau khi hết giờ, ROLLBACK giao tác này (để không làm bẩn DB)
//             // Lệnh throw dưới đây sẽ buộc withTransaction thực hiện rollback
//             throw new Error(`[T_B/LOCK HOLDER: ${userId}] Giữ khóa đã hết giờ. Rollback để nhả khóa.`); 
//         });

//     } catch (error) {
//         console.log(`[T_B/LOCK HOLDER: ${userId}] Giao tác giữ khóa kết thúc: ${error.message}`);
//     } finally {
//         await session.endSession();
//     }
// };



module.exports = {
    bookSeatsTransaction,
    holdLockAndBlock
};
