import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>&copy; {currentYear} IslaList - Connecting communities across the Philippine Islands</p>
    </footer>
  );
};

export default Footer;
