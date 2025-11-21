import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
// import Deadlock from "../../routes/deadlock";

const Header = () => {
  return (
    <header className="header-container d-flex align-items-center justify-content-between p-3">
      <a
        href="/"
        className="logo fs-5 fw-bold text-danger text-decoration-none"
      >
        Conflict
      </a>
      <nav className="nav-links d-flex align-items-center me-3">
        <a href="/" className="nav-link fw-bold text-light me-3">
          Xung đột 1
        </a>
        <a href="/about" className="nav-link fw-bold text-light me-3">
          Xung đột 2
        </a>
        <a href="/contact" className="nav-link fw-bold text-light me-3">
          xung đột 3
        </a>
        <a href="/contact" className="nav-link fw-bold text-light me-3">
          xung đột 4
        </a>
         <a href="/deadlock" className="nav-link fw-bold text-light me-3">
          DeadLock
        </a>
      
      </nav>

      <form className="d-flex">
        <input
          className="form-control me-2"
          placeholder="Search"
          aria-label="Search"
        />
        <button className="btn btn-outline-success" type="submit">
          Search
        </button>
      </form>
    </header>
  );
};

export default Header;
