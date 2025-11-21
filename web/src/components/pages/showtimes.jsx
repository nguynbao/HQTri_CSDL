import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ShowTimeItemWidget from "../widgets/ShowtimeItemWidget";
import MainButton from "../widgets/main_button";
import { API_BASE_URL } from "../../api";

const ShowTime = () => {
  const [showTimes, setShowTimes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get("movieId");

  useEffect(() => {
    const fetchShowTimes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/showtime/showall`);
        if (!res.ok) {
          throw new Error("Không thể tải danh sách suất chiếu");
        }
        const data = await res.json();
        setShowTimes(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Đã có lỗi khi tải suất chiếu");
      } finally {
        setLoading(false);
      }
    };

    fetchShowTimes();
  }, []);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Giờ chiếu";
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const handleBooking = () => {
    if (!selectedId) {
      alert("Vui lòng chọn một suất chiếu trước khi đặt vé");
      return;
    }
    navigate(`/seats?showtimeId=${selectedId}`);
  };

  const visibleShowTimes = movieId
    ? showTimes.filter((st) => st.movie_id?._id === movieId)
    : showTimes;

  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 gap-4">
      <div className="d-flex gap-4 flex-wrap justify-content-center">
        {loading && (
          <div className="text-light text-center w-100">Đang tải suất chiếu...</div>
        )}
        {error && !loading && (
          <div className="text-danger text-center w-100">{error}</div>
        )}
        {!loading && !error && visibleShowTimes.length === 0 && (
          <div className="text-light text-center w-100">
            {movieId ? "Chưa có suất chiếu cho phim này" : "Chưa có suất chiếu nào"}
          </div>
        )}
        {!loading &&
          !error &&
          visibleShowTimes.map((show) => (
            <ShowTimeItemWidget
              key={show._id}
              imageUrl={show.imageUrl}
              label={show.movie_id?.title || "Xuất chiếu"}
              time={formatTime(show.start_time)}
              selected={selectedId === show._id}
              onClick={() => setSelectedId(show._id)}
            />
          ))}
      </div>
      <MainButton text="Đặt vé ngay" onClick={handleBooking} />
    </div>
  );
};
export default ShowTime;
