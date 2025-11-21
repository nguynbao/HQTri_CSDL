import "bootstrap/dist/css/bootstrap.min.css";
import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainButton from "../widgets/main_button";

const ResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const payload = useMemo(
    () => ({
      status: searchParams.get("status") || "unknown",
      movieId: searchParams.get("movieId") || "N/A",
      showtimeId: searchParams.get("showtimeId") || "N/A",
      ticketIds: (searchParams.get("ticketIds") || "")
        .split(",")
        .filter(Boolean),
      seats: (searchParams.get("seats") || "")
        .split(",")
        .filter(Boolean),
    }),
    [searchParams]
  );

  const isSuccess = payload.status === "success";

  return (
    <main className="d-flex flex-column align-items-center justify-content-center vh-100 w-100 text-light">
      <div
        className="position-relative d-flex flex-column justify-content-center align-items-center"
        style={{
          maxWidth: "640px",
          width: "100%",
          border: "2px solid #fff",
          borderRadius: "16px",
          padding: "24px",
          background: "rgba(0,0,0,0.6)",
        }}
      >
        <h1 className={`fw-bold ${isSuccess ? "text-success" : "text-danger"}`}>
          {isSuccess ? "ĐẶT VÉ THÀNH CÔNG" : "ĐẶT VÉ THẤT BẠI"}
        </h1>
        <div className="w-100 mt-3">
          <div className="mb-2">
            <strong>Movie ID:</strong> {payload.movieId}
          </div>
          <div className="mb-2">
            <strong>Showtime ID:</strong> {payload.showtimeId}
          </div>
          <div className="mb-2">
            <strong>Ticket IDs:</strong>{" "}
            {payload.ticketIds.length ? payload.ticketIds.join(", ") : "Không có"}
          </div>
          <div className="mb-2">
            <strong>Ghế:</strong>{" "}
            {payload.seats.length ? payload.seats.join(", ") : "Chưa chọn"}
          </div>
        </div>
        <div className="mt-4 d-flex gap-3">
          <MainButton text="Về trang chủ" onClick={() => navigate("/")} />
          <MainButton text="Chọn suất khác" onClick={() => navigate("/about")} />
        </div>
      </div>
    </main>
  );
};
export default ResultPage;
