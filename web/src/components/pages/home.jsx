import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FilmItemWidget from "../widgets/FilmItemWidget";
import { API_BASE_URL } from "../../api";

const HomePage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/movies`);
        if (!res.ok) {
          throw new Error("Không thể tải danh sách phim");
        }
        const data = await res.json();
        setMovies(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Đã có lỗi khi tải phim");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  return (
    <main className="d-flex flex-column align-items-center justify-content-center vh-100 w-100">
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <h1 className="fw-bold text-light ">HOROR</h1>
        <h5 className="fw-bold text-light">MOVIVE</h5>
      </div>
      <div className="flex-grow-1" />
      <div className="movie-grid mt-5 ">
        {loading && (
          <div className="text-light text-center w-100">Đang tải phim...</div>
        )}
        {error && !loading && (
          <div className="text-danger text-center w-100">{error}</div>
        )}
        {!loading && !error && movies.length === 0 && (
          <div className="text-light text-center w-100">
            Chưa có phim nào trong hệ thống
          </div>
        )}
        {!loading &&
          !error &&
          movies.map((film) => (
            <FilmItemWidget
              key={film._id || film.id}
              imageUrl={film.imageUrl}
              title={film.title}
              genre={film.genre}
              duration={film.duration}
              onClick={() => navigate(`/about?movieId=${film._id || film.id}`)}
            />
          ))}
      </div>
    </main>
  );
};
export default HomePage;
