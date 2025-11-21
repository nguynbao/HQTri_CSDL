import "../../App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import MainButton from "../widgets/main_button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../api";

const fallbackRows = ["A", "B", "C", "D", "E"];
const fallbackSeatsPerRow = 8;
const DEMO_USER_ID =
  process.env.REACT_APP_USER_ID || "000000000000000000000001";

const SeatPage = () => {
  const [searchParams] = useSearchParams();
  const showtimeId = searchParams.get("showtimeId");

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [showtime, setShowtime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pricePerSeat = 90000;

  const navigate = useNavigate();

  useEffect(() => {
    if (!showtimeId) {
      setError("Không tìm thấy suất chiếu");
      setLoading(false);
      return;
    }

    const fetchShowtime = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/showtime/${showtimeId}`);
        if (!res.ok) throw new Error("Không thể tải thông tin suất chiếu");
        const data = await res.json();
        setShowtime(data);
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi tải suất chiếu");
      } finally {
        setLoading(false);
      }
    };

    fetchShowtime();
  }, [showtimeId]);

  const seatsByRow = useMemo(() => {
    if (showtime?.seats?.length) {
      const grouped = {};
      showtime.seats.forEach((seat) => {
        const seatId = seat.seat_id || seat.seatCode || "";
        const rowKey = seatId.charAt(0) || "?";
        if (!grouped[rowKey]) grouped[rowKey] = [];
        grouped[rowKey].push(seat);
      });
      Object.keys(grouped).forEach((row) => {
        grouped[row].sort((a, b) => {
          const numA = parseInt(a.seat_id.slice(1), 10) || 0;
          const numB = parseInt(b.seat_id.slice(1), 10) || 0;
          return numA - numB;
        });
      });
      return grouped;
    }
    const grouped = {};
    fallbackRows.forEach((row) => {
      grouped[row] = Array.from({ length: fallbackSeatsPerRow }, (_, idx) => ({
        seat_id: `${row}${idx + 1}`,
        status: "available",
      }));
    });
    return grouped;
  }, [showtime]);

  const toggleSeat = (seatId) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((s) => s !== seatId);
      }
      if (prev.length >= 2) {
        alert("Vui lòng chọn tối đa 2 ghế (phục vụ demo bookSeatsController).");
        return prev;
      }
      return [...prev, seatId];
    });
  };

  const startPayment = async () => {
    if (selectedSeats.length < 2) {
      alert("Vui lòng chọn đủ 2 ghế trước khi đặt.");
      return;
    }
    setBookingError("");
    setIsDrawerOpen(false);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/ticket/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          showtimeId,
          seats: selectedSeats.slice(0, 2),
          price: pricePerSeat,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Đặt vé thất bại");
      }

      const ticketIds = Array.isArray(data.tickets)
        ? data.tickets.map((t) => t._id).filter(Boolean)
        : [];

      const params = new URLSearchParams({
        status: "success",
        showtimeId: showtimeId || "",
        movieId: showtime?.movie_id?._id || "",
        seats: selectedSeats.join(","),
      });

      if (ticketIds.length) {
        params.set("ticketIds", ticketIds.join(","));
      }

      navigate(`/result?${params.toString()}`);
    } catch (err) {
      setBookingError(err.message || "Đặt vé thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const showTimeLabel = showtime
    ? `${showtime.movie_id?.title || "Phim"} - ${new Date(
        showtime.start_time
      ).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })}`
    : "Đang tải...";

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 text-light">
        Đang tải thông tin suất chiếu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-danger">
        {error}
        <button
          className="btn btn-outline-light mt-3"
          onClick={() => navigate("/about")}
        >
          Quay lại chọn suất chiếu
        </button>
      </div>
    );
  }

  return (
    <div className="seat-page-container container d-flex flex-column justify-content-center align-items-center gap-4 min-vh-100">
      <div className="rectangle-with-rounded-bottom w-100 d-flex align-items-center justify-content-center">
        <span className="text-light fw-bold">MÀN HÌNH</span>
      </div>

      <div className="seat-grid-wrapper w-100 justify-content-center align-items-center">
        {Object.entries(seatsByRow).map(([rowKey, seats]) => (
          <div key={rowKey} className="d-flex justify-content-center mb-2 gap-2">
            {seats.map((seat) => {
              const seatId = seat.seat_id;
              const isSelected = selectedSeats.includes(seatId);
              const isAvailable = (seat.status || "").toLowerCase() !== "booked";
              return (
                <button
                  key={seatId}
                  type="button"
                  className={`seat-btn btn ${
                    isSelected ? "btn-danger" : "btn-outline-light"
                  }`}
                  onClick={() => isAvailable && toggleSeat(seatId)}
                  disabled={!isAvailable}
                  title={isAvailable ? "" : "Đã được đặt / không khả dụng"}
                >
                  {seatId}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="text-light">
        Đã chọn: {selectedSeats.length ? selectedSeats.join(", ") : "Chưa có"}
      </div>

      {selectedSeats.length > 0 && (
        <div className="floating-book-btn">
          <MainButton text="Đặt vé" onClick={() => setIsDrawerOpen(true)} />
        </div>
      )}

      <div className={`booking-drawer ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawer-header d-flex justify-content-between align-items-center">
          <span className="fw-bold">Xác nhận đặt vé</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={() => setIsDrawerOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="drawer-body text-light">
          <div className="mb-2">
            <strong>User ID:</strong> {DEMO_USER_ID}
          </div>
          <div className="mb-2">
            <strong>Ghế đặt:</strong>{" "}
            {selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn"}
          </div>
          <div className="mb-2">
            <strong>Xuất chiếu:</strong> {showTimeLabel}
          </div>
          <div className="mb-3">
            <strong>Giá vé:</strong>{" "}
            {selectedSeats.length
              ? (selectedSeats.length * pricePerSeat).toLocaleString("vi-VN") +
                " đ"
              : "0 đ"}
          </div>
        </div>
        <div className="drawer-footer">
          <MainButton text="Thanh toán" onClick={startPayment} />
        </div>
      </div>

      {isLoading && (
        <div className="payment-overlay d-flex flex-column align-items-center justify-content-center">
          <div className="loader mb-3"></div>
          <div className="text-light mb-2">Đang đặt vé...</div>
          {bookingError ? (
            <div className="text-danger mb-2 text-center px-3">{bookingError}</div>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-light"
            onClick={() => {
              setIsLoading(false);
              setBookingError("");
            }}
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
};

export default SeatPage;
