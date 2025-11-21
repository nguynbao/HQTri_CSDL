import './main_button.css';
const MainButton = ({ text, onClick }) => {
  return (
    <button className="main-button" onClick={onClick}>
      {text}
    </button>
  );
};

export default MainButton;