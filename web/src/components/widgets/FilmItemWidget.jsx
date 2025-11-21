import React from "react";
import "./FilmItemWidget.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1000&q=80";

const FilmItemWidget = ({ imageUrl, title, genre, duration, onClick }) => {
  return (
    <div
      className="film-item-widget shadow-lg"
      style={{ backgroundImage: `url(${imageUrl || fallbackImage})` }}
      onClick={onClick}
    >
      <div className="film-overlay p-3">
        <div className="d-flex flex-column justify-content-between align-items-center w-100 mb-3">
          <span className="new-added-badge">New Added</span>
        </div>
        <div className="film-meta">
          <h5 className="text-white mb-1">{title || "Đang cập nhật"}</h5>
          <div className="film-meta-details d-flex justify-content-between align-items-center">
          {genre ? <small className="text-white-50 text-uppercase">{genre}</small> : null}
           {duration ? <span className="film-duration">{duration} phút</span> : null}
           </div>
        </div>
      </div>
    </div>
  );
};

export default FilmItemWidget;
