
import "./ShowtimeItemWidget.css";

const ShowTimeItemWidget = ({
  imageUrl,
  time,
  label = "Xuất chiếu",
  onClick,
  selected = false,
}) => {
  const background = imageUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80";
  return (
    <div
      className={`showtime-item-widget ${selected ? "selected" : ""}`}
      style={{
        backgroundImage: `url(${background})`,
      }}
      onClick={onClick}
    >
      <div className="showtime-overlay">
        {/* Box đỏ trên cùng */}
        <span className="showtime-new-badge">{label}</span>

        {/* Thời gian ở chính giữa */}
        <div className="showtime-time">{time}</div>
      </div>
    </div>
  );
};

export default ShowTimeItemWidget;
